import { useEffect, useMemo, useRef, useState } from 'react'
import { PLAYBACK_INSTRUMENT_COPY, type PlaybackInstrument } from '../lib/audio/playback'
import { createChordDescriptor } from '../lib/music/chords'
import { DEFAULT_ADVANCED_FACES } from '../lib/music/constants'
import { createAdvancedRoll, createGuidedRoll } from '../lib/music/generator'
import { applyRhythmFeel, rerollChordFromKey, type RhythmFeel } from '../lib/music/ideas'
import { parseProgressionInput } from '../lib/music/parser'
import { transposeProgression, transposeToKey } from '../lib/music/transpose'
import { PLAYGROUND_PRESETS, type InstrumentFocus, type PlaygroundPreset } from '../lib/music/playground'
import type {
  AdvancedParameter,
  BuilderState,
  ChordComplexity,
  ChordDescriptor,
  ProgressionResult,
  RootNote,
} from '../lib/music/types'
import {
  COMPLEXITY_COPY,
  DEFAULT_STATUS,
  FOCUS_OPTIONS,
  INSTRUMENT_OPTIONS,
  COMPLEXITY_OPTIONS,
  MAX_GUIDED_DICE,
  SURPRISE_TEMPOS,
} from './constants'
import { createInitialState, loadSession, saveSession } from './session'
import { decodeShare } from './share'
import type { Mode, SectionId, WorkState } from './types'

const SAVE_DELAY_MS = 400

type PresetOverrides = Partial<Pick<WorkState, 'complexity' | 'tempo' | 'instrumentFocus' | 'playbackInstrument'>> & { status?: string }

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T
}

function chordList(chords: ChordDescriptor[]): string {
  return chords.map((chord) => chord.label).join(', ')
}

function summarize(chords: ChordDescriptor[], prefix: string): string[] {
  return chords.map((chord, index) => `${prefix} ${index + 1}: ${chord.label}`)
}

export function useWorkstation() {
  const [state, setState] = useState<WorkState>(createInitialState)
  const [status, setStatus] = useState(DEFAULT_STATUS)
  const [manualIssues, setManualIssues] = useState<string[]>([])
  const [rollId, setRollId] = useState(0)
  const [restored, setRestored] = useState(false)

  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const openSharedLink = () => {
      const shared = decodeShare(window.location.hash)

      if (!shared) {
        return
      }

      const chords = shared.chords

      setState((current) => ({
        ...current,
        mode: 'manual',
        progression: {
          chords,
          explanation: ['Opened from a shared link.'],
          rollSummary: chords.map((chord, index) => `Chord ${index + 1}: ${chord.label}`),
          source: 'manual-text',
          keyCenter: chords[0]?.root ?? 'C',
        },
        keptChordSlots: [],
        tempo: shared.tempo ?? current.tempo,
        playbackInstrument: shared.instrument ?? current.playbackInstrument,
        rhythmFeel: shared.feel ?? current.rhythmFeel,
      }))
      setRollId((id) => id + 1)
      setStatus('Opened a shared progression.')
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }

    const saved = loadSession()

    if (saved) {
      setState(saved)
      setStatus('Restored your last idea.')
    }

    openSharedLink()
    setRestored(true)

    window.addEventListener('hashchange', openSharedLink)
    return () => window.removeEventListener('hashchange', openSharedLink)
  }, [])

  useEffect(() => {
    if (!restored) {
      return
    }

    const timer = window.setTimeout(() => saveSession(state), SAVE_DELAY_MS)
    const flush = () => {
      window.clearTimeout(timer)
      saveSession(state)
    }

    window.addEventListener('pagehide', flush)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pagehide', flush)
    }
  }, [state, restored])

  const actions = useMemo(() => {
    const patch = (changes: Partial<WorkState>) => setState((current) => ({ ...current, ...changes }))

    const commit = (progression: ProgressionResult, mode: Mode, message: string, extra: Partial<WorkState> = {}) => {
      const { keyLock } = stateRef.current
      const placed = keyLock && mode !== 'manual' ? transposeToKey(progression, keyLock) : progression

      setState((current) => ({ ...current, ...extra, progression: placed, mode, keptChordSlots: [] }))
      setManualIssues([])
      setRollId((id) => id + 1)
      setStatus(message)
    }

    const editChords = (chords: ChordDescriptor[], message: string, explanation?: string[]) => {
      setState((current) => ({
        ...current,
        progression: {
          ...current.progression,
          chords,
          explanation: explanation ?? current.progression.explanation,
          rollSummary: summarize(chords, 'Chord'),
        },
      }))
      setRollId((id) => id + 1)
      setStatus(message)
    }

    const rollGuided = (complexity: ChordComplexity, message?: string) => {
      const next = createGuidedRoll({ faceCounts: stateRef.current.guidedFaces }, complexity)
      commit(next.progression, 'guided', message ?? `Rolled ${chordList(next.progression.chords)}.`)
    }

    const rollAdvanced = (complexity: ChordComplexity, message?: string) => {
      const next = createAdvancedRoll(stateRef.current.advancedConfig, complexity)
      commit(next.progression, 'advanced', message ?? `Rolled ${chordList(next.progression.chords)}.`, { advancedRoll: next })
    }

    const loadPreset = (preset: PlaygroundPreset, overrides: PresetOverrides = {}) => {
      const complexity = overrides.complexity ?? preset.complexity
      const message = overrides.status ?? preset.status
      const extra: Partial<WorkState> = {
        activePresetId: preset.id,
        complexity,
        tempo: overrides.tempo ?? preset.tempo,
        instrumentFocus: overrides.instrumentFocus ?? preset.instrumentFocus,
        ...(overrides.playbackInstrument ? { playbackInstrument: overrides.playbackInstrument } : {}),
      }

      if (preset.mode === 'guided' && preset.guidedFaces) {
        const guidedFaces = [...preset.guidedFaces]
        const next = createGuidedRoll({ faceCounts: guidedFaces }, complexity)
        commit(next.progression, 'guided', message, { ...extra, guidedFaces })
        return
      }

      if (preset.mode === 'advanced' && preset.advancedConfig) {
        const advancedConfig = { chordCount: preset.advancedConfig.chordCount, faceCounts: { ...preset.advancedConfig.faceCounts } }
        const next = createAdvancedRoll(advancedConfig, complexity)
        commit(next.progression, 'advanced', message, { ...extra, advancedConfig, advancedRoll: next })
      }
    }

    const rerollSlots = (shouldReroll: (index: number) => boolean, message: string) => {
      const { progression, complexity } = stateRef.current
      const chords = progression.chords.map((chord, index) =>
        shouldReroll(index) ? rerollChordFromKey({ chord, keyCenter: progression.keyCenter, complexity, index }) : chord,
      )
      editChords(chords, message, [`New pass around ${progression.keyCenter} with ${COMPLEXITY_COPY[complexity].label.toLowerCase()} harmony.`])
    }

    return {
      setMode: (mode: Mode) => patch({ mode }),
      setTempo: (tempo: number) => patch({ tempo }),
      setInstrument: (playbackInstrument: PlaybackInstrument) => patch({ playbackInstrument }),
      setFocus: (instrumentFocus: InstrumentFocus) => patch({ instrumentFocus }),
      setFeel: (rhythmFeel: RhythmFeel) => patch({ rhythmFeel }),
      setLoop: (loopEnabled: boolean) => patch({ loopEnabled }),
      setShowTheory: (showTheory: boolean) => patch({ showTheory }),
      setKeyLock: (keyLock: RootNote | null) => {
        const { progression, mode } = stateRef.current

        if (!keyLock || mode === 'manual' || progression.chords.length === 0) {
          patch({ keyLock })
          setStatus(keyLock ? `Rolls will land in ${keyLock}.` : 'Rolls can land in any key.')
          return
        }

        patch({ keyLock, progression: transposeToKey(progression, keyLock) })
        setRollId((id) => id + 1)
        setStatus(`Moved to ${keyLock}.`)
      },
      transpose: (semitones: number) => {
        const { progression } = stateRef.current

        if (progression.chords.length === 0) {
          return
        }

        const next = transposeProgression(progression, semitones)
        patch({ progression: next, keyLock: stateRef.current.keyLock ? next.keyCenter : null })
        setStatus(`Moved to ${next.keyCenter}.`)
      },
      setManualInput: (manualInput: string) => patch({ manualInput }),

      roll: () => {
        const { mode, complexity } = stateRef.current
        if (mode === 'advanced') {
          rollAdvanced(complexity)
        } else {
          rollGuided(complexity)
        }
      },

      setComplexity: (complexity: ChordComplexity) => {
        const { mode } = stateRef.current
        const label = COMPLEXITY_COPY[complexity].label

        patch({ complexity })

        if (mode === 'manual') {
          setStatus(`${label} applies the next time you roll or reroll.`)
          return
        }

        const message = `${label} chords. Here is a new roll.`
        if (mode === 'advanced') {
          rollAdvanced(complexity, message)
        } else {
          rollGuided(complexity, message)
        }
      },

      loadPreset,

      surprise: () => {
        const preset = pickRandom(PLAYGROUND_PRESETS)
        const playbackInstrument = pickRandom(INSTRUMENT_OPTIONS)
        const instrumentFocus = pickRandom(FOCUS_OPTIONS)
        const complexity = pickRandom(COMPLEXITY_OPTIONS)
        const tempo = pickRandom(SURPRISE_TEMPOS)

        loadPreset(preset, {
          complexity,
          tempo,
          instrumentFocus,
          playbackInstrument,
          status: `${preset.label} at ${tempo} BPM on ${PLAYBACK_INSTRUMENT_COPY[playbackInstrument].label}.`,
        })
      },

      setGuidedFace: (index: number, faces: number) =>
        setState((current) => ({ ...current, guidedFaces: current.guidedFaces.map((value, i) => (i === index ? faces : value)) })),
      addGuidedDie: () =>
        setState((current) => (current.guidedFaces.length >= MAX_GUIDED_DICE ? current : { ...current, guidedFaces: [...current.guidedFaces, 8] })),
      removeGuidedDie: () =>
        setState((current) => (current.guidedFaces.length <= 1 ? current : { ...current, guidedFaces: current.guidedFaces.slice(0, -1) })),

      setChordCount: (chordCount: number) =>
        setState((current) => ({ ...current, advancedConfig: { ...current.advancedConfig, chordCount } })),
      setAdvancedFace: (parameter: AdvancedParameter, faces: number) =>
        setState((current) => ({
          ...current,
          advancedConfig: {
            ...current.advancedConfig,
            faceCounts: { ...DEFAULT_ADVANCED_FACES, ...current.advancedConfig.faceCounts, [parameter]: faces },
          },
        })),

      updateBuilder: <Key extends keyof BuilderState>(key: Key, value: BuilderState[Key]) =>
        setState((current) => ({ ...current, builder: { ...current.builder, [key]: value } })),

      addBuilderChord: (replace: boolean) => {
        const { builder, progression } = stateRef.current
        const extensions = [builder.extensionPrimary, ...builder.colorTones].filter(Boolean) as ChordDescriptor['extensions']
        const chord = createChordDescriptor({
          id: `builder-${Date.now()}`,
          root: builder.root,
          quality: builder.quality,
          extensions,
          bass: builder.bass || undefined,
          inversion: builder.inversion,
          rhythmBeats: builder.rhythmBeats,
          source: 'manual-builder',
          explanation: ['Built from the manual chord controls'],
        })
        const chords = replace ? [chord] : [...progression.chords, chord]

        commit(
          {
            chords,
            explanation: ['Built by hand from the manual controls.'],
            rollSummary: summarize(chords, 'Manual chord'),
            source: 'manual-builder',
            keyCenter: chords[0]?.root ?? builder.root,
          },
          'manual',
          replace ? `Replaced the progression with ${chord.label}.` : `Added ${chord.label}.`,
        )
      },

      applyManualInput: (replace: boolean) => {
        const { manualInput, progression } = stateRef.current
        const parsed = parseProgressionInput(manualInput)

        if (parsed.chords.length === 0) {
          setManualIssues(parsed.issues.length > 0 ? parsed.issues : ['No chord names found. Try something like Cmaj7, Am7, D7.'])
          setStatus('No playable chords found.')
          return
        }

        const chords = replace ? parsed.chords : [...progression.chords, ...parsed.chords]

        commit(
          {
            chords,
            explanation: ['Typed chords, parsed into the same tray as rolled ones.'],
            rollSummary: summarize(chords, 'Parsed chord'),
            source: 'manual-text',
            keyCenter: chords[0]?.root ?? 'C',
          },
          'manual',
          parsed.issues.length > 0 ? 'Loaded your chords. Some symbols were skipped.' : 'Loaded your chords.',
        )
        setManualIssues(parsed.issues)
      },

      toggleKeep: (index: number) =>
        setState((current) => ({
          ...current,
          keptChordSlots: current.keptChordSlots.includes(index)
            ? current.keptChordSlots.filter((slot) => slot !== index)
            : [...current.keptChordSlots, index].sort((left, right) => left - right),
        })),

      rerollChord: (index: number) => rerollSlots((slot) => slot === index, `Rerolled chord ${index + 1}.`),

      rerollUnlocked: () => {
        const { progression, keptChordSlots } = stateRef.current

        if (progression.chords.length === 0) {
          return
        }

        rerollSlots(
          (slot) => !keptChordSlots.includes(slot),
          keptChordSlots.length > 0 ? 'Rerolled everything except the kept chords.' : 'Rerolled every chord.',
        )
      },

      removeChord: (index: number) => {
        setState((current) => {
          const chords = current.progression.chords.filter((_, chordIndex) => chordIndex !== index)

          return {
            ...current,
            progression: {
              ...current.progression,
              chords,
              keyCenter: chords[0]?.root ?? current.progression.keyCenter,
              rollSummary: summarize(chords, 'Chord'),
            },
            keptChordSlots: current.keptChordSlots.filter((slot) => slot !== index).map((slot) => (slot > index ? slot - 1 : slot)),
          }
        })
        setStatus('Removed the chord.')
      },

      clear: () => {
        setState((current) => ({ ...current, progression: { ...current.progression, chords: [], rollSummary: [] }, keptChordSlots: [] }))
        setStatus('Cleared. Roll again when you want a new idea.')
      },

      saveSection: () => {
        const current = stateRef.current
        const { activeSection } = current

        setState((latest) => ({
          ...latest,
          sections: {
            ...latest.sections,
            [activeSection]: {
              activePresetId: latest.activePresetId,
              advancedConfig: { chordCount: latest.advancedConfig.chordCount, faceCounts: { ...latest.advancedConfig.faceCounts } },
              advancedRoll: latest.advancedRoll,
              complexity: latest.complexity,
              guidedFaces: [...latest.guidedFaces],
              instrumentFocus: latest.instrumentFocus,
              mode: latest.mode,
              playbackInstrument: latest.playbackInstrument,
              progression: latest.progression,
              rhythmFeel: latest.rhythmFeel,
              tempo: latest.tempo,
            },
          },
        }))
        setStatus(`Saved to ${activeSection}.`)
      },

      loadSection: (sectionId: SectionId) => {
        const snapshot = stateRef.current.sections[sectionId]

        if (!snapshot) {
          patch({ activeSection: sectionId })
          setStatus(`${sectionId} is empty. Save the current idea to it.`)
          return
        }

        setState((current) => ({
          ...current,
          ...snapshot,
          advancedConfig: { chordCount: snapshot.advancedConfig.chordCount, faceCounts: { ...snapshot.advancedConfig.faceCounts } },
          guidedFaces: [...snapshot.guidedFaces],
          activeSection: sectionId,
          keptChordSlots: [],
        }))
        setRollId((id) => id + 1)
        setStatus(`Loaded ${sectionId}.`)
      },

      notify: setStatus,
    }
  }, [])

  const display = useMemo(() => applyRhythmFeel(state.progression, state.rhythmFeel), [state.progression, state.rhythmFeel])

  return { state, display, status, manualIssues, rollId, actions }
}

export type WorkstationActions = ReturnType<typeof useWorkstation>['actions']

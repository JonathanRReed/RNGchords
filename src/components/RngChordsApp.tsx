import { motion, useReducedMotion } from 'motion/react'
import { startTransition, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { createMidiBlob, downloadMidiBlob } from '../lib/audio/midi'
import { PLAYBACK_INSTRUMENT_COPY, playProgression, preloadPlayback, previewChord, stopPlayback } from '../lib/audio/playback'
import { getDiceMotionPlan } from '../lib/dice/motion'
import {
  DEFAULT_DICE_STYLE_SETTINGS,
  DICE_CONTENT_DENSITY_OPTIONS,
  DICE_MOTION_OPTIONS,
  DICE_STYLE_STORAGE_KEY,
  DICE_THEME_OPTIONS,
  coerceDiceStyleSettings,
  getDiceAccentStyle,
  getDiceTrayStyle,
  getThemeDefaultPalette,
  resolvePaletteOptions,
  type DiceAccent,
  type DiceContentDensity,
  type DiceMotionProfile,
  type DiceStyleSettings,
  type DiceTheme,
} from '../lib/dice/style'
import {
  ADVANCED_PARAMETER_LABELS,
  ADVANCED_PARAMETERS,
  COLOR_TONE_OPTIONS,
  DEFAULT_ADVANCED_FACES,
  DEFAULT_GUIDED_FACES,
  FACE_OPTIONS,
  PRIMARY_EXTENSION_OPTIONS,
  QUALITY_OPTIONS,
  RHYTHM_LABELS,
  ROOT_OPTIONS,
} from '../lib/music/constants'
import { createChordDescriptor, describeChord, extensionSummary } from '../lib/music/chords'
import { createAdvancedRoll, createAdvancedRollFromValues, createGuidedRoll, createGuidedRollFromValues, formatKeyBadge } from '../lib/music/generator'
import { RHYTHM_FEEL_COPY, applyRhythmFeel, getTheoryTags, rerollChordFromKey, type RhythmFeel } from '../lib/music/ideas'
import { parseProgressionInput } from '../lib/music/parser'
import {
  INSTRUMENT_FOCUS_COPY,
  PLAYGROUND_PRESETS,
  createChordCoach,
  createPlayerTips,
  createPracticePrompt,
} from '../lib/music/playground'
import type {
  AdvancedDiceConfig,
  AdvancedRollResult,
  BuilderState,
  ChordComplexity,
  ChordDescriptor,
  GuidedRollResult,
  ProgressionResult,
} from '../lib/music/types'
import type { PlaybackInstrument } from '../lib/audio/playback'
import type { InstrumentFocus, PlaygroundPreset } from '../lib/music/playground'

type Mode = 'guided' | 'advanced' | 'manual'

const MODE_COPY: Record<Mode, { title: string; detail: string }> = {
  guided: {
    title: 'Quick ideas',
    detail: 'Roll a few chords and see where they want to go.',
  },
  advanced: {
    title: 'Wild ideas',
    detail: 'More dice, more curveballs, still easy to mess with.',
  },
  manual: {
    title: 'Build it yourself',
    detail: 'Type chords or stack them by hand when you already hear something.',
  },
}

const CHORD_COMPLEXITY_COPY: Record<ChordComplexity, { label: string; detail: string }> = {
  basic: {
    label: 'Easy',
    detail: 'Mostly simple chords you can grab fast.',
  },
  balanced: {
    label: 'Color',
    detail: 'Familiar shapes with a little extra flavor.',
  },
  wild: {
    label: 'Spicy',
    detail: 'More color, more tension, more surprises.',
  },
}

const PLAYBACK_INSTRUMENT_OPTIONS = Object.keys(PLAYBACK_INSTRUMENT_COPY) as PlaybackInstrument[]
const INSTRUMENT_FOCUS_OPTIONS = Object.keys(INSTRUMENT_FOCUS_COPY) as InstrumentFocus[]
const CHORD_COMPLEXITY_OPTIONS = Object.keys(CHORD_COMPLEXITY_COPY) as ChordComplexity[]
const SURPRISE_TEMPO_OPTIONS = [68, 74, 82, 88, 96, 104, 112, 120, 128, 136] as const
const SECTION_IDS = ['A', 'B', 'C'] as const

const INITIAL_PRESET = PLAYGROUND_PRESETS[0]
const INITIAL_COMPLEXITY = INITIAL_PRESET?.complexity ?? 'balanced'
const INITIAL_GUIDED_FACES = INITIAL_PRESET?.mode === 'guided' && INITIAL_PRESET.guidedFaces
  ? [...INITIAL_PRESET.guidedFaces]
  : [...DEFAULT_GUIDED_FACES]
const INITIAL_GUIDED: GuidedRollResult = createGuidedRollFromValues({ faceCounts: INITIAL_GUIDED_FACES }, [3, 5, 4, 6], INITIAL_COMPLEXITY)
const INITIAL_ADVANCED_VALUES: AdvancedRollResult['values'] = {
  roots: 4,
  qualities: 3,
  extensions: 6,
  inversions: 2,
  rhythm: 5,
}
const INITIAL_ADVANCED_ROLL: AdvancedRollResult = createAdvancedRollFromValues({
  chordCount: 4,
  faceCounts: DEFAULT_ADVANCED_FACES,
}, INITIAL_ADVANCED_VALUES, 'balanced')
const INITIAL_BUILDER: BuilderState = {
  root: 'C',
  quality: 'maj',
  extensionPrimary: 'maj7',
  colorTones: ['add9'],
  bass: '',
  inversion: 0,
  rhythmBeats: 1,
}

function totalBeats(chords: ChordDescriptor[]): number {
  return chords.reduce((sum, chord) => sum + chord.rhythmBeats, 0)
}

function formatTime(totalProgressionBeats: number, tempo: number): string {
  const totalSeconds = totalProgressionBeats * (60 / tempo)
  return `${totalSeconds.toFixed(1)} sec`
}

function formatDieChordValue(chord: ChordDescriptor): string {
  if (chord.label.length <= 8) {
    return chord.label
  }

  const qualityMap: Record<ChordDescriptor['quality'], string> = {
    maj: '',
    min: 'm',
    dom: '7',
    dim: 'dim',
    aug: 'aug',
    sus2: 'sus2',
    sus4: 'sus4',
  }
  const leadExtension = chord.extensions[0]

  if (!leadExtension) {
    return `${chord.root}${qualityMap[chord.quality]}`
  }

  const compactExtension = leadExtension.startsWith('add') ? leadExtension.replace('add', '+') : leadExtension
  const suffix = chord.extensions.length > 1 ? '…' : ''
  return `${chord.root}${qualityMap[chord.quality]}${compactExtension}${suffix}`
}

function getGuidedDieDetail(chord: ChordDescriptor, density: DiceContentDensity): string | undefined {
  if (density === 'chord-only') {
    return undefined
  }

  return chord.notes.slice(0, density === 'detailed' ? 4 : 3).join(' · ')
}

function getAdvancedDieDetail(value: number, density: DiceContentDensity): string | undefined {
  if (density !== 'detailed') {
    return undefined
  }

  return `rolled ${value}`
}

function formatProgressionSource(source: string): string {
  const labels: Record<string, string> = {
    guided: 'Quick roll',
    advanced: 'Wild roll',
    'manual-builder': 'Built by hand',
    'manual-text': 'Typed in',
  }

  return labels[source] ?? source.replace(/-/g, ' ')
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T
}

type SectionId = (typeof SECTION_IDS)[number]

type SectionSnapshot = {
  activePresetId: string
  advancedConfig: AdvancedDiceConfig
  advancedRoll: AdvancedRollResult
  complexity: ChordComplexity
  guidedFaces: number[]
  instrumentFocus: InstrumentFocus
  mode: Mode
  playbackInstrument: PlaybackInstrument
  progression: ProgressionResult
  rhythmFeel: RhythmFeel
  tempo: number
}

function createDelightMessage(progression: ProgressionResult): string | null {
  if (progression.chords.length < 3 || Math.random() > 0.18) {
    return null
  }

  const colorfulCount = progression.chords.filter((chord) => chord.extensions.length > 0).length
  const uniqueRoots = new Set(progression.chords.map((chord) => chord.root)).size

  if (colorfulCount >= Math.max(2, Math.ceil(progression.chords.length / 2)) && uniqueRoots >= 3) {
    return 'Nice accident'
  }

  if (progression.chords.some((chord) => chord.extensions.some((token) => ['b9', '#11', '13', 'b13'].includes(token)))) {
    return 'Spicy keeper'
  }

  return 'That one has something'
}

type StageDie = {
  label: string
  value: number | string
  footer: string
  accent: DiceAccent
  detail?: string
}

function DieCard({
  impulse,
  label,
  value,
  footer,
  accent,
  sequence,
  settings,
  reducedMotion,
  detail,
}: {
  impulse: number
  label: string
  value: number | string
  footer: string
  accent: DiceAccent
  sequence: number
  settings: DiceStyleSettings
  reducedMotion: boolean
  detail?: string
}) {
  const numericValue = typeof value === 'number' ? value : value.length
  const motionPlan = getDiceMotionPlan({
    value: numericValue,
    faces: footer.length + 4,
    impulse,
    sequence,
    profile: settings.motionProfile,
    reducedMotion,
  })
  const accentStyle = getDiceAccentStyle(settings, accent) as CSSProperties

  return (
    <div className="die-shell" style={{ perspective: 900 }}>
      <motion.div
        className="die-shell__shadow"
        initial={false}
        animate={motionPlan.shadowAnimate}
        transition={motionPlan.shadowTransition}
      />
      <motion.div className="die-shell__body" initial={false} animate={motionPlan.bodyAnimate} transition={motionPlan.bodyTransition}>
        <div className={`die-card die-card--${accent}`} style={accentStyle}>
          <div className="die-card__shine" />
          <div className="die-card__bevel" />
          <div className="die-card__face">
            <motion.div className="die-card__meta die-card__meta--top" initial={false} animate={motionPlan.metaAnimate} transition={motionPlan.metaTransition}>
              <span className="die-card__label">{label}</span>
            </motion.div>
            <strong className={typeof value === 'string' ? 'die-card__value die-card__value--text' : 'die-card__value'}>{value}</strong>
            <motion.div className="die-card__meta die-card__meta--bottom" initial={false} animate={motionPlan.metaAnimate} transition={motionPlan.metaTransition}>
              {detail ? <span className="die-card__detail">{detail}</span> : null}
              <span className="die-card__faces">{footer}</span>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function PanelTitle({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return (
    <div className="panel-title">
      <span className="panel-title__eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{detail}</p>
    </div>
  )
}

export default function RngChordsApp() {
  const shouldReduceMotion = useReducedMotion()
  const reduceMotionEnabled = shouldReduceMotion ?? false
  const [mode, setMode] = useState<Mode>('guided')
  const [guidedFaces, setGuidedFaces] = useState<number[]>(() => [...INITIAL_GUIDED_FACES])
  const [advancedConfig, setAdvancedConfig] = useState<AdvancedDiceConfig>(() => ({
    chordCount: 4,
    faceCounts: { ...DEFAULT_ADVANCED_FACES },
  }))
  const [advancedRoll, setAdvancedRoll] = useState<AdvancedRollResult>(() => INITIAL_ADVANCED_ROLL)
  const [progression, setProgression] = useState<ProgressionResult>(() => INITIAL_GUIDED.progression)
  const [builder, setBuilder] = useState<BuilderState>(() => INITIAL_BUILDER)
  const [manualInput, setManualInput] = useState('Cmaj9, Am11, D7b9, G13')
  const [manualIssues, setManualIssues] = useState<string[]>([])
  const [complexity, setComplexity] = useState<ChordComplexity>(INITIAL_COMPLEXITY)
  const [tempo, setTempo] = useState(INITIAL_PRESET?.tempo ?? 92)
  const [instrumentFocus, setInstrumentFocus] = useState<InstrumentFocus>(INITIAL_PRESET?.instrumentFocus ?? 'both')
  const [playbackInstrument, setPlaybackInstrument] = useState<PlaybackInstrument>('warm-piano')
  const [rhythmFeel, setRhythmFeel] = useState<RhythmFeel>('straight')
  const [activePresetId, setActivePresetId] = useState<string>(INITIAL_PRESET?.id ?? 'campfire-glow')
  const [loopEnabled, setLoopEnabled] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [activeChordIndex, setActiveChordIndex] = useState<number | null>(null)
  const [jamChordIndex, setJamChordIndex] = useState<number | null>(null)
  const [showTheory, setShowTheory] = useState(false)
  const [keptChordSlots, setKeptChordSlots] = useState<number[]>([])
  const [activeSection, setActiveSection] = useState<SectionId>('A')
  const [sections, setSections] = useState<Record<SectionId, SectionSnapshot | null>>({ A: null, B: null, C: null })
  const [delightMessage, setDelightMessage] = useState<string | null>(null)
  const [diceImpulse, setDiceImpulse] = useState(1)
  const [diceStyleSettings, setDiceStyleSettings] = useState<DiceStyleSettings>(DEFAULT_DICE_STYLE_SETTINGS)
  const [status, setStatus] = useState('Roll some chords, hear them back, and keep the bits you like.')
  const [midiBusy, setMidiBusy] = useState(false)

  const displayProgression = useMemo(() => applyRhythmFeel(progression, rhythmFeel), [progression, rhythmFeel])
  const highlightedChordIndex = activeChordIndex ?? jamChordIndex
  const progressionBeats = useMemo(() => totalBeats(displayProgression.chords), [displayProgression.chords])
  const progressionDuration = useMemo(() => formatTime(progressionBeats, tempo), [progressionBeats, tempo])
  const activePreset = useMemo(
    () => PLAYGROUND_PRESETS.find((preset) => preset.id === activePresetId) ?? PLAYGROUND_PRESETS[0],
    [activePresetId],
  )
  const paletteOptions = useMemo(() => resolvePaletteOptions(diceStyleSettings.theme), [diceStyleSettings.theme])
  const diceTrayStyle = useMemo(() => getDiceTrayStyle(diceStyleSettings) as CSSProperties, [diceStyleSettings])
  const playerTips = useMemo(() => createPlayerTips(displayProgression, instrumentFocus), [displayProgression, instrumentFocus])
  const visiblePlayerTips = useMemo(() => playerTips.slice(0, 1), [playerTips])
  const practicePrompt = useMemo(() => createPracticePrompt(displayProgression, instrumentFocus), [displayProgression, instrumentFocus])
  const visibleExplanation = useMemo(() => displayProgression.explanation.slice(0, 1), [displayProgression.explanation])
  const stageDice: StageDie[] = mode === 'advanced'
    ? ADVANCED_PARAMETERS.map((parameter, index) => ({
        label: ADVANCED_PARAMETER_LABELS[parameter],
        value: advancedRoll.values[parameter],
        footer: `d${advancedConfig.faceCounts[parameter]}`,
        detail: getAdvancedDieDetail(advancedRoll.values[parameter], diceStyleSettings.contentDensity),
        accent: (['ruby', 'brass', 'emerald', 'sapphire', 'ruby'][index] ?? 'ruby') as
          | DiceAccent,
      }))
    : displayProgression.chords.map((chord, index) => ({
        label: `Chord ${index + 1}`,
        value: formatDieChordValue(chord),
        footer: mode === 'guided' ? `d${guidedFaces[index] ?? 6}` : RHYTHM_LABELS[chord.rhythmBeats] ?? `${chord.rhythmBeats} beats`,
        detail: getGuidedDieDetail(chord, diceStyleSettings.contentDensity),
        accent: (['ruby', 'brass', 'emerald', 'sapphire'][index % 4] ?? 'ruby') as
          | DiceAccent,
      }))

  const resetPlaybackUi = useCallback(() => {
    stopPlayback()
    setPlaying(false)
    setActiveChordIndex(null)
    setJamChordIndex(null)
  }, [])

  const commitProgression = useCallback((next: ProgressionResult, nextMode: Mode, message: string) => {
    resetPlaybackUi()
    setMode(nextMode)
    setManualIssues([])
    setKeptChordSlots([])
    setDelightMessage(createDelightMessage(next))
    setStatus(message)
    setDiceImpulse((current) => current + 1)
    startTransition(() => {
      setProgression(next)
    })
  }, [resetPlaybackUi])

  const updateGuidedFace = useCallback((index: number, faceCount: number) => {
    setGuidedFaces((current) => current.map((value, valueIndex) => (valueIndex === index ? faceCount : value)))
  }, [])

  const addGuidedDie = useCallback(() => {
    setGuidedFaces((current) => (current.length >= 8 ? current : [...current, 8]))
  }, [])

  const removeGuidedDie = useCallback(() => {
    setGuidedFaces((current) => (current.length <= 1 ? current : current.slice(0, -1)))
  }, [])

  const loadPreset = useCallback((preset: PlaygroundPreset, overrides?: {
    complexity?: ChordComplexity
    tempo?: number
    instrumentFocus?: InstrumentFocus
    playbackInstrument?: PlaybackInstrument
    status?: string
  }) => {
    const nextComplexity = overrides?.complexity ?? preset.complexity
    const nextTempo = overrides?.tempo ?? preset.tempo
    const nextInstrumentFocus = overrides?.instrumentFocus ?? preset.instrumentFocus
    const nextStatus = overrides?.status ?? preset.status

    setActivePresetId(preset.id)
    setComplexity(nextComplexity)
    setTempo(nextTempo)
    setInstrumentFocus(nextInstrumentFocus)

    if (overrides?.playbackInstrument) {
      setPlaybackInstrument(overrides.playbackInstrument)
    }

    if (preset.mode === 'guided' && preset.guidedFaces) {
      const faces = [...preset.guidedFaces]
      const next = createGuidedRoll({ faceCounts: faces }, nextComplexity)

      setGuidedFaces(faces)
      commitProgression(next.progression, 'guided', nextStatus)
      return
    }

    if (preset.mode === 'advanced' && preset.advancedConfig) {
      const nextConfig: AdvancedDiceConfig = {
        chordCount: preset.advancedConfig.chordCount,
        faceCounts: { ...preset.advancedConfig.faceCounts },
      }
      const next = createAdvancedRoll(nextConfig, nextComplexity)

      setAdvancedConfig(nextConfig)
      setAdvancedRoll(next)
      commitProgression(next.progression, 'advanced', nextStatus)
    }
  }, [commitProgression])

  const rollGuided = useCallback(() => {
    const next = createGuidedRoll({ faceCounts: guidedFaces }, complexity)
    commitProgression(next.progression, 'guided', 'New idea ready. Try it out or hit play.')
  }, [commitProgression, complexity, guidedFaces])

  const rollAdvanced = useCallback(() => {
    const next = createAdvancedRoll(advancedConfig, complexity)
    setAdvancedRoll(next)
    commitProgression(next.progression, 'advanced', 'Fresh curveball ready. Keep the parts you like.')
  }, [advancedConfig, commitProgression, complexity])

  const applyComplexity = useCallback((nextComplexity: ChordComplexity) => {
    setComplexity(nextComplexity)

    if (mode === 'guided') {
      const next = createGuidedRoll({ faceCounts: guidedFaces }, nextComplexity)
      commitProgression(next.progression, 'guided', `${CHORD_COMPLEXITY_COPY[nextComplexity].label} mode is on. Here is a new roll.`)
      return
    }

    if (mode === 'advanced') {
      const next = createAdvancedRoll(advancedConfig, nextComplexity)
      setAdvancedRoll(next)
      commitProgression(next.progression, 'advanced', `${CHORD_COMPLEXITY_COPY[nextComplexity].label} mode is on. Here is a wilder roll.`)
      return
    }

    setStatus(`${CHORD_COMPLEXITY_COPY[nextComplexity].label} mode will kick in next time you roll.`)
  }, [advancedConfig, commitProgression, guidedFaces, mode])

  const generateRandomChords = useCallback(() => {
    if (mode === 'advanced') {
      rollAdvanced()
      return
    }

    if (mode === 'manual') {
      const fallbackPreset = PLAYGROUND_PRESETS.find((preset) => preset.mode === 'guided') ?? PLAYGROUND_PRESETS[0]

      if (fallbackPreset) {
        loadPreset(fallbackPreset)
      }

      return
    }

    rollGuided()
  }, [loadPreset, mode, rollAdvanced, rollGuided])

  const surpriseMe = useCallback(() => {
    const randomPreset = pickRandom(PLAYGROUND_PRESETS)
    const randomInstrument = pickRandom(PLAYBACK_INSTRUMENT_OPTIONS)
    const randomFocus = pickRandom(INSTRUMENT_FOCUS_OPTIONS)
    const randomComplexity = pickRandom(CHORD_COMPLEXITY_OPTIONS)
    const randomTempo = pickRandom(SURPRISE_TEMPO_OPTIONS)

    if (randomPreset) {
      loadPreset(randomPreset, {
        complexity: randomComplexity,
        tempo: randomTempo,
        instrumentFocus: randomFocus,
        playbackInstrument: randomInstrument,
        status: `Surprise: ${randomPreset.label} at ${randomTempo} BPM with ${PLAYBACK_INSTRUMENT_COPY[randomInstrument].label} and ${INSTRUMENT_FOCUS_COPY[randomFocus].label.toLowerCase()}.`,
      })
    }
  }, [loadPreset])

  const previewIdeaChord = useCallback(async (index: number) => {
    const chord = displayProgression.chords[index]

    if (!chord || playing) {
      return
    }

    setJamChordIndex(index)
    preloadPlayback()

    try {
      await previewChord(chord, playbackInstrument)
    } catch (error) {
      console.error('Chord preview failed', error)
    }
  }, [displayProgression.chords, playbackInstrument, playing])

  const toggleKeepChord = useCallback((index: number) => {
    setKeptChordSlots((current) => (current.includes(index) ? current.filter((slot) => slot !== index) : [...current, index].toSorted((left, right) => left - right)))
  }, [])

  const updateProgressionChords = useCallback((nextChords: ChordDescriptor[], message: string, nextExplanation?: string[]) => {
    resetPlaybackUi()
    setDiceImpulse((current) => current + 1)
    setProgression((current) => ({
      ...current,
      chords: nextChords,
      explanation: nextExplanation ?? current.explanation,
      rollSummary: nextChords.map((item, itemIndex) => `Chord ${itemIndex + 1}: ${item.label}`),
    }))
    setDelightMessage(createDelightMessage({ ...progression, chords: nextChords }))
    setStatus(message)
  }, [progression, resetPlaybackUi])

  const rerollChord = useCallback((index: number) => {
    const chord = progression.chords[index]

    if (!chord) {
      return
    }

    const nextChord = rerollChordFromKey({
      chord,
      keyCenter: progression.keyCenter,
      complexity,
      index,
    })

    const nextChords = progression.chords.map((entry, entryIndex) => (entryIndex === index ? nextChord : entry))
    updateProgressionChords(nextChords, `Rerolled slot ${index + 1}.`, [`Slot ${index + 1} got a fresh spin inside ${progression.keyCenter}.`])
  }, [complexity, progression, updateProgressionChords])

  const rerollUnlockedChords = useCallback(() => {
    if (progression.chords.length === 0) {
      return
    }

    const nextChords = progression.chords.map((chord, index) => {
      if (keptChordSlots.includes(index)) {
        return chord
      }

      return rerollChordFromKey({
        chord,
        keyCenter: progression.keyCenter,
        complexity,
        index,
      })
    })

    updateProgressionChords(nextChords, keptChordSlots.length > 0 ? 'Rerolled the open slots and kept the pinned ones.' : 'Rerolled the whole idea.', [`Fresh pass around ${progression.keyCenter} with ${CHORD_COMPLEXITY_COPY[complexity].label.toLowerCase()} flavor.`])
  }, [complexity, keptChordSlots, progression, updateProgressionChords])

  const saveSection = useCallback(() => {
    setSections((current) => ({
      ...current,
      [activeSection]: {
        activePresetId,
        advancedConfig: {
          chordCount: advancedConfig.chordCount,
          faceCounts: { ...advancedConfig.faceCounts },
        },
        advancedRoll,
        complexity,
        guidedFaces: [...guidedFaces],
        instrumentFocus,
        mode,
        playbackInstrument,
        progression,
        rhythmFeel,
        tempo,
      },
    }))
    setStatus(`Saved this idea to section ${activeSection}.`)
  }, [activePresetId, activeSection, advancedConfig, advancedRoll, complexity, guidedFaces, instrumentFocus, mode, playbackInstrument, progression, rhythmFeel, tempo])

  const loadSection = useCallback((sectionId: SectionId) => {
    setActiveSection(sectionId)

    const snapshot = sections[sectionId]

    if (!snapshot) {
      setStatus(`Section ${sectionId} is empty.`)
      return
    }

    resetPlaybackUi()
    setActivePresetId(snapshot.activePresetId)
    setAdvancedConfig({ chordCount: snapshot.advancedConfig.chordCount, faceCounts: { ...snapshot.advancedConfig.faceCounts } })
    setAdvancedRoll(snapshot.advancedRoll)
    setComplexity(snapshot.complexity)
    setGuidedFaces([...snapshot.guidedFaces])
    setInstrumentFocus(snapshot.instrumentFocus)
    setMode(snapshot.mode)
    setPlaybackInstrument(snapshot.playbackInstrument)
    setProgression(snapshot.progression)
    setRhythmFeel(snapshot.rhythmFeel)
    setKeptChordSlots([])
    setDelightMessage(createDelightMessage(snapshot.progression))
    setTempo(snapshot.tempo)
    setStatus(`Loaded section ${sectionId}.`)
  }, [resetPlaybackUi, sections])

  const updateBuilder = useCallback(<Key extends keyof BuilderState>(key: Key, value: BuilderState[Key]) => {
    setBuilder((current) => ({ ...current, [key]: value }))
  }, [])

  const updateDiceTheme = useCallback((theme: DiceTheme) => {
    setDiceStyleSettings((current) => ({
      ...current,
      theme,
      palette: resolvePaletteOptions(theme).some((option) => option.value === current.palette)
        ? current.palette
        : getThemeDefaultPalette(theme),
    }))
  }, [])

  const updateDiceMotionProfile = useCallback((motionProfile: DiceMotionProfile) => {
    setDiceStyleSettings((current) => ({ ...current, motionProfile }))
  }, [])

  const updateDiceContentDensity = useCallback((contentDensity: DiceContentDensity) => {
    setDiceStyleSettings((current) => ({ ...current, contentDensity }))
  }, [])

  const updateDicePalette = useCallback((palette: DiceStyleSettings['palette']) => {
    setDiceStyleSettings((current) => ({ ...current, palette }))
  }, [])

  const resetDiceStyleSettings = useCallback(() => {
    setDiceStyleSettings(DEFAULT_DICE_STYLE_SETTINGS)
  }, [])

  const appendBuilderChord = useCallback((replace = false) => {
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
      explanation: ['Built from the guided manual chord controls'],
    })

    const chords = replace ? [chord] : [...progression.chords, chord]
    commitProgression(
      {
        chords,
        explanation: ['Built by hand from the controls on the left.'],
        rollSummary: chords.map((item, index) => `Manual chord ${index + 1}: ${item.label}`),
        source: 'manual-builder',
        keyCenter: chords[0]?.root ?? builder.root,
      },
      'manual',
      replace ? 'Swapped in the chord you built.' : 'Added your chord to the idea.',
    )
  }, [builder, commitProgression, progression.chords])

  const applyManualInput = useCallback((replace = true) => {
    const parsed = parseProgressionInput(manualInput)

    if (parsed.chords.length === 0) {
      setManualIssues(parsed.issues.length > 0 ? parsed.issues : ['I could not find any chord names there.'])
      setStatus('No playable chords yet. Try typing a few chord names.')
      return
    }

    setManualIssues(parsed.issues)
    const chords = replace ? parsed.chords : [...progression.chords, ...parsed.chords]
    commitProgression(
      {
        chords,
        explanation: ['Typed chords cleaned up and dropped into the same idea stack.'],
        rollSummary: chords.map((item, index) => `Parsed chord ${index + 1}: ${item.label}`),
        source: 'manual-text',
        keyCenter: chords[0]?.root ?? 'C',
      },
      'manual',
      parsed.issues.length > 0
        ? 'Loaded your typed chords, with a few symbols skipped.'
        : 'Loaded your typed chords.',
    )
  }, [commitProgression, manualInput, progression.chords])

  const removeChord = useCallback((index: number) => {
    const chords = progression.chords.filter((_, chordIndex) => chordIndex !== index)
    setProgression((current) => ({
      ...current,
      chords,
      keyCenter: chords[0]?.root ?? current.keyCenter,
      rollSummary: chords.map((item, itemIndex) => `Chord ${itemIndex + 1}: ${item.label}`),
    }))
    setKeptChordSlots((current) => current.filter((slot) => slot !== index).map((slot) => (slot > index ? slot - 1 : slot)))
    setStatus('Removed that chord.')
  }, [progression.chords])

  const clearProgression = useCallback(() => {
    resetPlaybackUi()
    setProgression((current) => ({ ...current, chords: [], rollSummary: [] }))
    setKeptChordSlots([])
    setDelightMessage(null)
    setStatus('Cleared. Roll something new when you want another idea.')
  }, [resetPlaybackUi])

  const startPlayback = useCallback(async () => {
    if (displayProgression.chords.length === 0) {
      setStatus('Nothing to play yet. Roll something first.')
      return
    }

    setPlaying(true)
    setStatus(
      loopEnabled
        ? 'Looping this idea.'
        : 'Playing it back.',
    )

    try {
      await playProgression(displayProgression, tempo, {
        instrument: playbackInstrument,
        loop: loopEnabled,
        onChordStart: (index) => setActiveChordIndex(index),
        onFinish: () => {
          if (!loopEnabled) {
            setPlaying(false)
            setActiveChordIndex(null)
            setStatus('Playback finished.')
          }
        },
      })
    } catch (error) {
      console.error('Playback failed', error)
      resetPlaybackUi()
      setStatus('Playback did not start. Try again or reload.')
    }
  }, [displayProgression, loopEnabled, playbackInstrument, resetPlaybackUi, tempo])

  const haltPlayback = useCallback(() => {
    resetPlaybackUi()
    setStatus('Stopped.')
  }, [resetPlaybackUi])

  const exportMidi = useCallback(async () => {
    if (displayProgression.chords.length === 0) {
      setStatus('Roll something before exporting.')
      return
    }

    setMidiBusy(true)

    try {
      const blob = await createMidiBlob(displayProgression, tempo)
      const safeRoot = displayProgression.keyCenter.toLowerCase().replace('#', 'sharp')
      downloadMidiBlob(blob, `rng-chords-${safeRoot}-${tempo}bpm.mid`)
      setStatus('MIDI exported.')
    } catch (error) {
      console.error('MIDI export failed', error)
      setStatus('MIDI export failed. Reload and try again.')
    } finally {
      setMidiBusy(false)
    }
  }, [displayProgression, tempo])

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null

      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()

        if (playing) {
          haltPlayback()
        } else {
          void startPlayback()
        }

        return
      }

      if (displayProgression.chords.length === 0) {
        return
      }

      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault()
        const direction = event.key === 'ArrowRight' ? 1 : -1
        const nextIndex = jamChordIndex === null
          ? (direction > 0 ? 0 : displayProgression.chords.length - 1)
          : (jamChordIndex + direction + displayProgression.chords.length) % displayProgression.chords.length
        void previewIdeaChord(nextIndex)
      }

      if (event.key === 'Enter' && jamChordIndex !== null) {
        event.preventDefault()
        void previewIdeaChord(jamChordIndex)
      }
    }

    window.addEventListener('keydown', handleKeydown)

    return () => {
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [displayProgression.chords.length, haltPlayback, jamChordIndex, playing, previewIdeaChord, startPlayback])

  useEffect(() => {
    preloadPlayback()

    return () => {
      stopPlayback()
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const saved = window.localStorage.getItem(DICE_STYLE_STORAGE_KEY)

      if (saved) {
        setDiceStyleSettings(coerceDiceStyleSettings(JSON.parse(saved)))
      }
    } catch (error) {
      console.error('Dice style restore failed', error)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(DICE_STYLE_STORAGE_KEY, JSON.stringify(diceStyleSettings))
    } catch (error) {
      console.error('Dice style save failed', error)
    }
  }, [diceStyleSettings])

  return (
    <div className="rng-app-shell">
      <div className="rng-app-shell__glow" />
      <section className="workstation-top panel-surface panel-surface--wide">
        <div className="workstation-topbar">
          <div className="workstation-brand">
            <span className="hero-strip__kicker">RNG Chords</span>
            <h1>Chord idea sketchpad</h1>
            <p>Roll a few chords, hear them back, and keep whatever feels fun.</p>
          </div>

          <div className="mode-rail workstation-modes" role="tablist" aria-label="RNG Chords modes">
            {(Object.keys(MODE_COPY) as Mode[]).map((entry) => (
              <button
                key={entry}
                type="button"
                className={entry === mode ? 'mode-pill mode-pill--active' : 'mode-pill'}
                onClick={() => setMode(entry)}
              >
                <span>{MODE_COPY[entry].title}</span>
                <small>{MODE_COPY[entry].detail}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="workstation-toolbar">
          <div className="hero-stats workstation-stats">
            <div>
              <span>From</span>
              <strong>{formatProgressionSource(progression.source)}</strong>
            </div>
            <div>
              <span>Key</span>
              <strong>{formatKeyBadge(progression.keyCenter)}</strong>
            </div>
            <div>
              <span>Size</span>
              <strong>{progression.chords.length} chords</strong>
            </div>
            <div>
              <span>Time</span>
              <strong>{progressionDuration}</strong>
            </div>
          </div>
        </div>
      </section>

      <main className="tabletop-grid tabletop-grid--workstation">
        <section className="control-bank control-bank--compact panel-surface">
          <div className="stack-block stack-block--dense">
            <div className="compact-panel-head">
              <span className="panel-title__eyebrow">Idea sets</span>
              <h2>{activePreset?.label ?? 'Free play'}</h2>
              <p>{activePreset?.strapline ?? 'Roll something new and see what sticks.'}</p>
            </div>

            <div className="preset-bank preset-bank--compact">
              {PLAYGROUND_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={preset.id === activePreset?.id ? 'preset-card preset-card--active' : 'preset-card'}
                  onClick={() => loadPreset(preset)}
                >
                  <span>{preset.label}</span>
                  <strong>{preset.strapline}</strong>
                </button>
              ))}
            </div>

            <label className="control-field">
              <span>Play on</span>
              <select name="instrument-focus" value={instrumentFocus} onChange={(event) => setInstrumentFocus(event.target.value as InstrumentFocus)}>
                {(Object.keys(INSTRUMENT_FOCUS_COPY) as InstrumentFocus[]).map((focus) => (
                  <option key={focus} value={focus}>
                    {INSTRUMENT_FOCUS_COPY[focus].label}
                  </option>
                ))}
              </select>
              <strong>{INSTRUMENT_FOCUS_COPY[instrumentFocus].detail}</strong>
            </label>

            <label className="control-field">
              <span>Spice</span>
              <select name="chord-complexity" value={complexity} onChange={(event) => applyComplexity(event.target.value as ChordComplexity)}>
                {(Object.keys(CHORD_COMPLEXITY_COPY) as ChordComplexity[]).map((entry) => (
                  <option key={entry} value={entry}>
                    {CHORD_COMPLEXITY_COPY[entry].label}
                  </option>
                ))}
              </select>
              <strong>{CHORD_COMPLEXITY_COPY[complexity].detail}</strong>
            </label>

            <div className="playground-callout compact-callout">
              <span>Try this</span>
              <p>{practicePrompt}</p>
            </div>

            <PanelTitle eyebrow="Mode" title={MODE_COPY[mode].title} detail={MODE_COPY[mode].detail} />

            {mode === 'guided' ? (
              <div className="stack-block">
                <div className="row-split row-split--tight">
                  <button type="button" className="pill-button" onClick={addGuidedDie}>
                    Add die
                  </button>
                  <button type="button" className="pill-button pill-button--muted" onClick={removeGuidedDie}>
                    Remove die
                  </button>
                </div>

                <div className="setting-grid">
                  {guidedFaces.map((faceCount, index) => (
                    <label key={`guided-face-${index}`} className="control-field">
                      <span>Die {index + 1} faces</span>
                      <select name={`guided-face-${index + 1}`} value={faceCount} onChange={(event) => updateGuidedFace(index, Number(event.target.value))}>
                        {FACE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            d{option}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>

                <button type="button" className="action-button" onClick={rollGuided}>
                  Roll ideas
                </button>
              </div>
            ) : null}

            {mode === 'advanced' ? (
              <div className="stack-block">
                <div className="setting-grid">
                  <label className="control-field control-field--wide">
                    <span>Chord count</span>
                    <input
                      name="advanced-chord-count"
                      type="range"
                      min={2}
                      max={8}
                      value={advancedConfig.chordCount}
                      onChange={(event) =>
                        setAdvancedConfig((current) => ({ ...current, chordCount: Number(event.target.value) }))
                      }
                    />
                    <strong>{advancedConfig.chordCount} chords</strong>
                  </label>
                  {ADVANCED_PARAMETERS.map((parameter) => (
                    <label key={parameter} className="control-field">
                      <span>{ADVANCED_PARAMETER_LABELS[parameter]}</span>
                      <select
                        name={`advanced-${parameter}`}
                        value={advancedConfig.faceCounts[parameter]}
                        onChange={(event) =>
                          setAdvancedConfig((current) => ({
                            ...current,
                            faceCounts: {
                              ...current.faceCounts,
                              [parameter]: Number(event.target.value),
                            },
                          }))
                        }
                      >
                        {FACE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            d{option}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <button type="button" className="action-button" onClick={rollAdvanced}>
                  Roll wilder ideas
                </button>
              </div>
            ) : null}

            {mode === 'manual' ? (
              <div className="stack-block stack-block--manual">
                <div className="setting-grid setting-grid--builder">
                  <label className="control-field">
                    <span>Root</span>
                    <select name="builder-root" value={builder.root} onChange={(event) => updateBuilder('root', event.target.value as BuilderState['root'])}>
                      {ROOT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="control-field">
                    <span>Quality</span>
                    <select
                      name="builder-quality"
                      value={builder.quality}
                      onChange={(event) => updateBuilder('quality', event.target.value as BuilderState['quality'])}
                    >
                      {QUALITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="control-field">
                    <span>Primary extension</span>
                    <select
                      name="builder-primary-extension"
                      value={builder.extensionPrimary}
                      onChange={(event) =>
                        updateBuilder('extensionPrimary', event.target.value as BuilderState['extensionPrimary'])
                      }
                    >
                      {PRIMARY_EXTENSION_OPTIONS.map((option) => (
                        <option key={option.label} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="control-field">
                    <span>Slash bass</span>
                    <select name="builder-bass" value={builder.bass} onChange={(event) => updateBuilder('bass', event.target.value as BuilderState['bass'])}>
                      <option value="">No slash bass</option>
                      {ROOT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="control-field">
                    <span>Inversion</span>
                    <input
                      name="builder-inversion"
                      type="range"
                      min={0}
                      max={3}
                      value={builder.inversion}
                      onChange={(event) => updateBuilder('inversion', Number(event.target.value))}
                    />
                    <strong>{builder.inversion}</strong>
                  </label>
                  <label className="control-field">
                    <span>Rhythm</span>
                    <input
                      name="builder-rhythm"
                      type="range"
                      min={1}
                      max={4}
                      step={0.5}
                      value={builder.rhythmBeats}
                      onChange={(event) => updateBuilder('rhythmBeats', Number(event.target.value))}
                    />
                    <strong>{RHYTHM_LABELS[builder.rhythmBeats] ?? `${builder.rhythmBeats} beats`}</strong>
                  </label>
                </div>

                <div className="chip-row">
                  {COLOR_TONE_OPTIONS.map((option) => {
                    const active = builder.colorTones.includes(option.value)
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={active ? 'chip-button chip-button--active' : 'chip-button'}
                        onClick={() =>
                          updateBuilder(
                            'colorTones',
                            active
                              ? builder.colorTones.filter((item) => item !== option.value)
                              : [...builder.colorTones, option.value],
                          )
                        }
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>

                <div className="row-split">
                  <button type="button" className="action-button action-button--secondary" onClick={() => appendBuilderChord(false)}>
                    Add this chord
                  </button>
                  <button type="button" className="action-button" onClick={() => appendBuilderChord(true)}>
                    Use this chord
                  </button>
                </div>

                <label className="control-field control-field--wide">
                  <span>Type chord names</span>
                  <textarea
                    name="manual-chord-input"
                    value={manualInput}
                    onChange={(event) => setManualInput(event.target.value)}
                    rows={3}
                    placeholder="Try: Cmaj7, Am7, D7, Gmaj7"
                  />
                </label>

                <div className="row-split">
                  <button type="button" className="pill-button" onClick={() => applyManualInput(false)}>
                    Add typed chords
                  </button>
                  <button type="button" className="pill-button pill-button--bright" onClick={() => applyManualInput(true)}>
                    Use typed chords
                  </button>
                </div>

                {manualIssues.length > 0 ? (
                  <div className="issue-panel" role="status">
                    {manualIssues.map((issue) => (
                      <p key={issue}>{issue}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className="stage-bank panel-surface panel-surface--tray">
          <div className="compact-panel-head compact-panel-head--tray">
            <span className="panel-title__eyebrow">Dice</span>
            <h2>Idea tray</h2>
            <p>Roll here, keep what sounds good, and hit play if you want to hear it.</p>
          </div>
          <div className="dice-lab">
            <div className="dice-lab__head">
              <div>
                <span className="panel-title__eyebrow">Dice style</span>
                <strong>Quick dice tweaks</strong>
              </div>
              <button type="button" className="pill-button pill-button--muted" onClick={resetDiceStyleSettings}>
                Reset style
              </button>
            </div>
            <div className="dice-lab__grid">
              <label className="control-field">
                <span>Theme</span>
                <select name="dice-theme" value={diceStyleSettings.theme} onChange={(event) => updateDiceTheme(event.target.value as DiceTheme)}>
                  {DICE_THEME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="control-field">
                <span>Motion</span>
                <select name="dice-motion" value={diceStyleSettings.motionProfile} onChange={(event) => updateDiceMotionProfile(event.target.value as DiceMotionProfile)}>
                  {DICE_MOTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="control-field">
                <span>On each die</span>
                <select name="dice-density" value={diceStyleSettings.contentDensity} onChange={(event) => updateDiceContentDensity(event.target.value as DiceContentDensity)}>
                  {DICE_CONTENT_DENSITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="dice-lab__palette">
              <span>Color set</span>
              <div className="dice-lab__swatches" role="list">
                {paletteOptions.map((option) => {
                  const swatchStyle = {
                    background: `linear-gradient(90deg, ${getDiceAccentStyle({ ...diceStyleSettings, palette: option.value }, 'ruby')['--die-surface-top']}, ${getDiceAccentStyle({ ...diceStyleSettings, palette: option.value }, 'brass')['--die-surface-top']}, ${getDiceAccentStyle({ ...diceStyleSettings, palette: option.value }, 'emerald')['--die-surface-top']}, ${getDiceAccentStyle({ ...diceStyleSettings, palette: option.value }, 'sapphire')['--die-surface-top']})`,
                  } as CSSProperties

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={option.value === diceStyleSettings.palette ? 'chip-button chip-button--active dice-swatch' : 'chip-button dice-swatch'}
                      onClick={() => updateDicePalette(option.value)}
                    >
                      <span className="dice-swatch__preview" style={swatchStyle} aria-hidden="true" />
                      <span>{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="tray-toolbar">
            <button type="button" className="action-button" onClick={generateRandomChords}>
              Roll ideas
            </button>
            <button type="button" className="pill-button pill-button--bright" onClick={surpriseMe}>
              Surprise me
            </button>
          </div>
          <div className="dice-tray" style={diceTrayStyle}>
            {stageDice.map((die, index) => (
              <DieCard
                key={`${die.label}-${die.footer}-${die.value}`}
                impulse={diceImpulse}
                label={die.label}
                value={die.value}
                footer={die.footer}
                detail={die.detail}
                accent={die.accent}
                sequence={index}
                settings={diceStyleSettings}
                reducedMotion={reduceMotionEnabled}
              />
            ))}
          </div>
          <div className="roll-notes">
            {progression.rollSummary.map((summary) => (
              <p key={summary}>{summary}</p>
            ))}
          </div>
        </section>

        <section className="results-bank panel-surface">
          <div className="compact-panel-head compact-panel-head--results">
            <span className="panel-title__eyebrow">Sound</span>
            <h2>Current idea</h2>
            <p>Pick a sound, set the tempo, and listen back.</p>
          </div>

          <div className="idea-utility-bar">
            <div className="idea-memory">
              <div className="idea-memory__copy">
                <span>Idea slots</span>
                <strong>Save a version in A, B, or C, then click a filled slot to load it back.</strong>
              </div>
              <div className="section-strip" role="tablist" aria-label="Idea slots">
                {SECTION_IDS.map((sectionId) => {
                  const filled = Boolean(sections[sectionId])
                  return (
                    <button
                      key={sectionId}
                      type="button"
                      className={sectionId === activeSection ? 'chip-button chip-button--active section-chip' : 'chip-button section-chip'}
                      onClick={() => loadSection(sectionId)}
                      aria-label={filled ? `Load saved idea slot ${sectionId}` : `Idea slot ${sectionId} is empty`}
                      title={filled ? `Load saved idea slot ${sectionId}` : `Idea slot ${sectionId} is empty`}
                    >
                      {sectionId}
                      {filled ? ' •' : ''}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="idea-utility-bar__actions">
              <button type="button" className="pill-button pill-button--muted" onClick={saveSection}>
                Save to {activeSection}
              </button>
              <button type="button" className="pill-button" onClick={rerollUnlockedChords} disabled={progression.chords.length === 0}>
                Reroll unlocked
              </button>
              <button
                type="button"
                className={showTheory ? 'chip-button chip-button--active' : 'chip-button'}
                onClick={() => setShowTheory((current) => !current)}
              >
                Theory {showTheory ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          {delightMessage ? (
            <div className="delight-banner" role="status">
              <span>Little spark</span>
              <strong>{delightMessage}</strong>
            </div>
          ) : null}

          <div className="transport-strip">
            <label className="transport-field">
              <span>Instrument</span>
              <select
                name="playback-instrument"
                value={playbackInstrument}
                onChange={(event) => setPlaybackInstrument(event.target.value as PlaybackInstrument)}
              >
                {(Object.keys(PLAYBACK_INSTRUMENT_COPY) as PlaybackInstrument[]).map((entry) => (
                  <option key={entry} value={entry}>
                    {PLAYBACK_INSTRUMENT_COPY[entry].label}
                  </option>
                ))}
              </select>
              <strong>{PLAYBACK_INSTRUMENT_COPY[playbackInstrument].detail}</strong>
            </label>
            <label className="transport-field">
              <span>Feel</span>
              <select name="rhythm-feel" value={rhythmFeel} onChange={(event) => setRhythmFeel(event.target.value as RhythmFeel)}>
                {(Object.keys(RHYTHM_FEEL_COPY) as RhythmFeel[]).map((entry) => (
                  <option key={entry} value={entry}>
                    {RHYTHM_FEEL_COPY[entry].label}
                  </option>
                ))}
              </select>
              <strong>{RHYTHM_FEEL_COPY[rhythmFeel].detail}</strong>
            </label>
            <label className="transport-field">
              <span>Tempo</span>
              <input name="transport-tempo" type="range" min={58} max={164} value={tempo} onChange={(event) => setTempo(Number(event.target.value))} />
              <strong>{tempo} BPM</strong>
            </label>
            <button
              type="button"
              className={loopEnabled ? 'chip-button chip-button--active' : 'chip-button'}
              onClick={() => setLoopEnabled((current) => !current)}
            >
              Loop {loopEnabled ? 'On' : 'Off'}
            </button>
            <button type="button" className="pill-button pill-button--bright" onPointerEnter={preloadPlayback} onFocus={preloadPlayback} onClick={startPlayback}>
              {playing ? 'Replay' : 'Play'}
            </button>
            <button type="button" className="pill-button" onClick={haltPlayback}>
              Stop
            </button>
            <button type="button" className="pill-button" onClick={exportMidi} disabled={midiBusy}>
              {midiBusy ? 'Exporting…' : 'Export MIDI'}
            </button>
            <button type="button" className="pill-button pill-button--muted" onClick={clearProgression}>
              Clear idea
            </button>
          </div>

          <p className="jam-hint">Keys: ← → preview chords · Enter replay selected chord · Space play or stop</p>

          <div className="rack-grid">
            {displayProgression.chords.length > 0 ? (
              displayProgression.chords.map((chord, index) => (
                <article
                  key={chord.id}
                  className={index === highlightedChordIndex ? 'chord-card chord-card--active' : 'chord-card'}
                >
                  <div className="chord-card__head">
                    <div>
                      <span>Slot {index + 1}</span>
                      <h3>{chord.label}</h3>
                    </div>
                    <button type="button" className="card-x" onClick={() => removeChord(index)} aria-label={`Remove ${chord.label}`}>
                      ×
                    </button>
                  </div>
                  <p>{describeChord(chord)}</p>
                  <div className="note-row">
                    {chord.notes.map((note, noteIndex) => (
                      <span key={`${chord.id}-${note}-${noteIndex}`} className="note-pill">
                        {note}
                      </span>
                    ))}
                  </div>
                  {showTheory ? (
                    <div className="theory-row">
                      {getTheoryTags(chord, progression.keyCenter).map((tag) => (
                        <span key={`${chord.id}-${tag}`} className="theory-pill">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="chord-card__actions">
                    <button
                      type="button"
                      className={keptChordSlots.includes(index) ? 'chip-button chip-button--active' : 'chip-button'}
                      onClick={() => toggleKeepChord(index)}
                    >
                      {keptChordSlots.includes(index) ? 'Kept' : 'Keep'}
                    </button>
                    <button type="button" className="chip-button" onClick={() => void previewIdeaChord(index)}>
                      Preview
                    </button>
                    <button type="button" className="chip-button" onClick={() => rerollChord(index)}>
                      Reroll
                    </button>
                  </div>
                  <div className="chord-card__coach">{createChordCoach(chord, instrumentFocus)}</div>
                  <footer>
                    <span>{extensionSummary(chord.extensions)}</span>
                    <span>{RHYTHM_LABELS[chord.rhythmBeats] ?? `${chord.rhythmBeats} beats`}</span>
                  </footer>
                </article>
              ))
            ) : (
              <div className="empty-rack">
                <h3>Nothing here yet.</h3>
                <p>Roll some chords or type your own to get started.</p>
              </div>
            )}
          </div>

          <div className="results-bank__meta">
            <div className="player-guide player-guide--compact">
              <div className="player-guide__head">
                <div className="player-guide__title">
                  <span>{INSTRUMENT_FOCUS_COPY[instrumentFocus].label}</span>
                  <strong>{activePreset?.label ?? 'Free play'} feel</strong>
                </div>
                <div className="player-guide__meta">
                  <span>{CHORD_COMPLEXITY_COPY[complexity].label}</span>
                  <span>{formatProgressionSource(progression.source)}</span>
                </div>
              </div>
              <div className="player-guide__tips">
                {visiblePlayerTips.map((tip) => (
                  <p key={tip}>{tip}</p>
                ))}
              </div>
            </div>

            <div className="explanation-strip explanation-strip--compact">
              {visibleExplanation.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="status-bar">
        <span>{status}</span>
        <strong>
          {progression.chords.length} chords · {progressionBeats.toFixed(1)} beats · {progressionDuration}
        </strong>
      </footer>
    </div>
  )
}

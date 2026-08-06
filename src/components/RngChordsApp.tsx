import { motion, useReducedMotion } from 'motion/react'
import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createMidiBlob, downloadMidiBlob } from '../lib/audio/midi'
import { PLAYBACK_INSTRUMENT_COPY, playProgression, preloadPlayback, previewChord, stopPlayback } from '../lib/audio/playback'
import { playClick } from '../lib/audio/sfx'
import { getDiceMotionPlan } from '../lib/dice/motion'
import { getDiceAccentStyle, type DiceAccent } from '../lib/dice/style'
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

type TableTheme = 'emerald' | 'crimson' | 'sapphire' | 'amethyst'

const TABLE_THEMES: { id: TableTheme; label: string; detail: string; swatch: string }[] = [
  { id: 'emerald', label: 'Emerald Felt', detail: 'Classic craps-table green', swatch: 'linear-gradient(135deg, #2a8466, #0e3a2e)' },
  { id: 'crimson', label: 'Crimson Royale', detail: 'High-roller garnet red', swatch: 'linear-gradient(135deg, #a82e36, #3a0e12)' },
  { id: 'sapphire', label: 'Midnight Sapphire', detail: 'Cool indigo high-limit room', swatch: 'linear-gradient(135deg, #4062b4, #0c1830)' },
  { id: 'amethyst', label: 'Amethyst Velvet', detail: 'Plush violet velvet', swatch: 'linear-gradient(135deg, #8c50b4, #1a0a2e)' },
]
const TABLE_THEME_IDS = TABLE_THEMES.map((theme) => theme.id) as TableTheme[]

const MODE_COPY: Record<Mode, { title: string; detail: string }> = {
  guided: {
    title: 'Easy rolls',
    detail: 'Generate a playable progression fast and hear it back right away.',
  },
  advanced: {
    title: 'Advanced rolls',
    detail: 'Use more parameters for denser harmony, rhythm, and motion.',
  },
  manual: {
    title: 'Manual builder',
    detail: 'Type chord names or stack chords by hand when you already hear something.',
  },
}

const CHORD_COMPLEXITY_COPY: Record<ChordComplexity, { label: string; detail: string }> = {
  basic: {
    label: 'Easy',
    detail: 'Mostly simple chords you can grab fast.',
  },
  balanced: {
    label: 'Color',
    detail: 'Familiar shapes with added chord color.',
  },
  wild: {
    label: 'Tension',
    detail: 'More color, more tension, and more harmonic motion.',
  },
}

const PLAYBACK_INSTRUMENT_OPTIONS = Object.keys(PLAYBACK_INSTRUMENT_COPY) as PlaybackInstrument[]
const INSTRUMENT_FOCUS_OPTIONS = Object.keys(INSTRUMENT_FOCUS_COPY) as InstrumentFocus[]
const CHORD_COMPLEXITY_OPTIONS = Object.keys(CHORD_COMPLEXITY_COPY) as ChordComplexity[]
const MODE_OPTIONS = Object.keys(MODE_COPY) as Mode[]
const SURPRISE_TEMPO_OPTIONS = [68, 74, 82, 88, 96, 104, 112, 120, 128, 136] as const
const SECTION_IDS = ['A', 'B', 'C'] as const
const DEFAULT_MANUAL_INPUT = 'Cmaj9, Am11, D7b9, G13'
const DEFAULT_STATUS = 'Roll chords, hear them back, and keep the strongest results.'
const CREATIVE_SESSION_STORAGE_KEY = 'rng-chords-creative-session'

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

function getGuidedDieDetail(chord: ChordDescriptor): string | undefined {
  return chord.notes.slice(0, 3).join(' · ')
}

function formatProgressionSource(source: string): string {
  const labels: Record<string, string> = {
    guided: 'Quick roll',
    advanced: 'Advanced roll',
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

type CreativeSessionState = {
  activePresetId: string
  activeSection: SectionId
  advancedConfig: AdvancedDiceConfig
  advancedRoll: AdvancedRollResult
  builder: BuilderState
  complexity: ChordComplexity
  guidedFaces: number[]
  instrumentFocus: InstrumentFocus
  keptChordSlots: number[]
  loopEnabled: boolean
  manualInput: string
  mode: Mode
  playbackInstrument: PlaybackInstrument
  progression: ProgressionResult
  rhythmFeel: RhythmFeel
  sections: Record<SectionId, SectionSnapshot | null>
  showTheory: boolean
  tableTheme: TableTheme
  tempo: number
}

function createEmptySections(): Record<SectionId, SectionSnapshot | null> {
  return { A: null, B: null, C: null }
}

function createModeTabId(mode: Mode): string {
  return `mode-tab-${mode}`
}

function createModePanelId(mode: Mode): string {
  return `mode-panel-${mode}`
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
    return 'High-tension keeper'
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
  reducedMotion,
  detail,
}: {
  impulse: number
  label: string
  value: number | string
  footer: string
  accent: DiceAccent
  sequence: number
  reducedMotion: boolean
  detail?: string
}) {
  const numericValue = typeof value === 'number' ? value : value.length
  const motionPlan = getDiceMotionPlan({
    value: numericValue,
    faces: footer.length + 4,
    impulse,
    sequence,
    reducedMotion,
  })
  const accentStyle = getDiceAccentStyle(accent) as CSSProperties

  return (
    <div className="die-shell" style={{ perspective: 900 }}>
      <motion.div
        className="die-shell__shadow"
        initial={{ scaleX: 1, scaleY: 1, opacity: 0.26 }}
        animate={motionPlan.shadowAnimate}
        transition={motionPlan.shadowTransition}
      />
      <motion.div
        className="die-shell__impact"
        initial={{ opacity: 0, scaleX: 0.55, scaleY: 0.55 }}
        animate={motionPlan.impactAnimate}
        transition={motionPlan.impactTransition}
        aria-hidden="true"
      />
      <motion.div className="die-shell__body" initial={{ y: 0, x: 0, rotateX: 0, rotateY: 0, rotateZ: 0, rotate: 0, scaleX: 1, scaleY: 1 }} animate={motionPlan.bodyAnimate} transition={motionPlan.bodyTransition}>
        <div className={`die-card die-card--${accent}`} style={accentStyle}>
          <div className="die-card__shine" />
          <div className="die-card__bevel" />
          <div className="die-card__face">
            <motion.div className="die-card__meta die-card__meta--top" initial={{ opacity: 1, filter: 'blur(0px)', y: 0, scale: 1 }} animate={motionPlan.metaAnimate} transition={motionPlan.metaTransition}>
              <span className="die-card__label">{label}</span>
            </motion.div>
            <strong className={typeof value === 'string' ? 'die-card__value die-card__value--text' : 'die-card__value'}>{value}</strong>
            <motion.div className="die-card__meta die-card__meta--bottom" initial={{ opacity: 1, filter: 'blur(0px)', y: 0, scale: 1 }} animate={motionPlan.metaAnimate} transition={motionPlan.metaTransition}>
              {detail ? <span className="die-card__detail">{detail}</span> : null}
              <span className="die-card__faces">{footer}</span>
            </motion.div>
          </div>
          <motion.div
            className="die-card__glint"
            initial={{ x: '-130%', opacity: 0 }}
            animate={motionPlan.glintAnimate}
            transition={motionPlan.glintTransition}
            aria-hidden="true"
          />
        </div>
        <div className={`die-card die-card--${accent} die-card__back`} style={accentStyle} aria-hidden="true">
          <span className="die-card__back-pip" />
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
  const [manualInput, setManualInput] = useState(DEFAULT_MANUAL_INPUT)
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
  const [sections, setSections] = useState<Record<SectionId, SectionSnapshot | null>>(() => createEmptySections())
  const [delightMessage, setDelightMessage] = useState<string | null>(null)
  const [diceImpulse, setDiceImpulse] = useState(1)
  const [status, setStatus] = useState(DEFAULT_STATUS)
  const [midiBusy, setMidiBusy] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showMoreTransport, setShowMoreTransport] = useState(false)
  const [tableTheme, setTableTheme] = useState<TableTheme>('emerald')
  const settingsDrawerRef = useRef<HTMLElement>(null)

  const displayProgression = useMemo(() => applyRhythmFeel(progression, rhythmFeel), [progression, rhythmFeel])
  const progressionAnnouncement = useMemo(
    () =>
      displayProgression.chords.length > 0
        ? `Progression in ${formatKeyBadge(progression.keyCenter)}: ${displayProgression.chords.map((chord) => chord.label).join(', ')}.`
        : 'No chords in the tray yet.',
    [displayProgression.chords, progression.keyCenter],
  )
  const highlightedChordIndex = activeChordIndex ?? jamChordIndex
  const progressionBeats = useMemo(() => totalBeats(displayProgression.chords), [displayProgression.chords])
  const progressionDuration = useMemo(() => formatTime(progressionBeats, tempo), [progressionBeats, tempo])
  const activePreset = useMemo(
    () => PLAYGROUND_PRESETS.find((preset) => preset.id === activePresetId) ?? PLAYGROUND_PRESETS[0],
    [activePresetId],
  )
  const diceCount = mode === 'advanced' ? ADVANCED_PARAMETERS.length : displayProgression.chords.length
  const diceColumns = diceCount <= 1 ? 1 : diceCount <= 4 ? diceCount : Math.ceil(diceCount / 2)
  const diceTrayStyle = useMemo(
    () => ({ '--dice-cols': String(diceColumns) }) as CSSProperties,
    [diceColumns],
  )
  const playerTips = useMemo(() => createPlayerTips(displayProgression, instrumentFocus), [displayProgression, instrumentFocus])
  const visiblePlayerTips = useMemo(() => playerTips.slice(0, 1), [playerTips])
  const practicePrompt = useMemo(() => createPracticePrompt(displayProgression, instrumentFocus), [displayProgression, instrumentFocus])
  const visibleExplanation = useMemo(() => displayProgression.explanation.slice(0, 1), [displayProgression.explanation])
  const stageDice: StageDie[] = mode === 'advanced'
    ? ADVANCED_PARAMETERS.map((parameter, index) => ({
        label: ADVANCED_PARAMETER_LABELS[parameter],
        value: advancedRoll.values[parameter],
        footer: `d${advancedConfig.faceCounts[parameter]}`,
        detail: undefined,
        accent: (['ruby', 'sapphire', 'brass', 'emerald', 'ruby'][index] ?? 'ruby') as
          | DiceAccent,
      }))
    : displayProgression.chords.map((chord, index) => ({
        label: `Chord ${index + 1}`,
        value: formatDieChordValue(chord),
        footer: mode === 'guided' ? `d${guidedFaces[index] ?? 6}` : RHYTHM_LABELS[chord.rhythmBeats] ?? `${chord.rhythmBeats} beats`,
        detail: getGuidedDieDetail(chord),
        accent: (['ruby', 'sapphire', 'brass', 'emerald'][index % 4] ?? 'ruby') as
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

  const handleModeTabKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>, currentMode: Mode) => {
    const currentIndex = MODE_OPTIONS.indexOf(currentMode)
    let nextMode: Mode | null = null

    if (event.key === 'Home') {
      nextMode = MODE_OPTIONS[0] ?? 'guided'
    } else if (event.key === 'End') {
      nextMode = MODE_OPTIONS.at(-1) ?? 'manual'
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const direction = event.key === 'ArrowRight' ? 1 : -1
      nextMode = MODE_OPTIONS[(currentIndex + direction + MODE_OPTIONS.length) % MODE_OPTIONS.length] ?? currentMode
    }

    if (!nextMode) {
      return
    }

    event.preventDefault()
    setMode(nextMode)

    // Move DOM focus to the newly selected tab so the roving tabIndex stays in
    // sync and the screen reader follows the selection (APG tabs pattern). The
    // tab nodes are always mounted, so focusing synchronously is safe — the
    // re-render only flips tabIndex/aria-selected on the same element.
    document.getElementById(createModeTabId(nextMode))?.focus()
  }, [])

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
      commitProgression(next.progression, 'advanced', `${CHORD_COMPLEXITY_COPY[nextComplexity].label} mode is on. Here is a denser roll.`)
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

    updateProgressionChords(nextChords, keptChordSlots.length > 0 ? 'Rerolled the open slots and kept the pinned ones.' : 'Rerolled the whole idea.', [`New pass around ${progression.keyCenter} with ${CHORD_COMPLEXITY_COPY[complexity].label.toLowerCase()} harmony.`])
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
    const handleKeydown = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null

      if (target && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)) {
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

  // Re-skin the whole table by flipping data-theme on <html>; the [data-theme]
  // blocks in global.css remap the felt/leather/rim/pill tokens. Also sync the
  // mobile browser chrome colour to the table.
  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    document.documentElement.setAttribute('data-theme', tableTheme)

    const themeColor = ({
      emerald: '#0b0706',
      crimson: '#0b0506',
      sapphire: '#05070d',
      amethyst: '#09060e',
    } satisfies Record<TableTheme, string>)[tableTheme]
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor)
  }, [tableTheme])

  // Make the settings drawer a real modal dialog: lock body scroll, move focus
  // in, trap Tab within it, close on Escape, and restore focus to the trigger
  // on close. (The markup already declares role="dialog" aria-modal.)
  useEffect(() => {
    if (!isSettingsOpen) {
      return
    }

    const drawer = settingsDrawerRef.current

    if (!drawer || typeof document === 'undefined') {
      return
    }

    const previouslyFocused = document.activeElement as HTMLElement | null
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    document.body.style.overflow = 'hidden'

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    const getFocusable = () =>
      Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), select:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null)

    getFocusable()[0]?.focus()

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsSettingsOpen(false)
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusable = getFocusable()

      if (focusable.length === 0) {
        return
      }

      const first = focusable[0] as HTMLElement
      const last = focusable[focusable.length - 1] as HTMLElement

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    drawer.addEventListener('keydown', handleKeyDown)

    return () => {
      drawer.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
      previouslyFocused?.focus?.()
    }
  }, [isSettingsOpen])

  // Tactile click SFX on any button press. Single delegated listener so
  // we do not need to touch every button call site.
  useEffect(() => {
    if (typeof window === 'undefined' || reduceMotionEnabled) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) {
        return
      }
      const interactive = target.closest('button, [role="tab"], .preset-card, .chip-button, .note-pill') as HTMLElement | null
      if (!interactive) {
        return
      }
      playClick(0.7)
    }

    window.addEventListener('pointerdown', handlePointerDown, { passive: true })
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [reduceMotionEnabled])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const saved = window.localStorage.getItem(CREATIVE_SESSION_STORAGE_KEY)

      if (!saved) {
        return
      }

      const session = JSON.parse(saved) as Partial<CreativeSessionState>

      if (!session.progression || !Array.isArray(session.progression.chords)) {
        return
      }

      const nextSections = createEmptySections()

      SECTION_IDS.forEach((sectionId) => {
        nextSections[sectionId] = session.sections?.[sectionId] ?? null
      })

      setActivePresetId(typeof session.activePresetId === 'string' ? session.activePresetId : INITIAL_PRESET?.id ?? 'campfire-glow')
      setActiveSection(SECTION_IDS.includes(session.activeSection as SectionId) ? session.activeSection as SectionId : 'A')
      setAdvancedConfig(session.advancedConfig ?? {
        chordCount: 4,
        faceCounts: { ...DEFAULT_ADVANCED_FACES },
      })
      setAdvancedRoll(session.advancedRoll ?? INITIAL_ADVANCED_ROLL)
      setBuilder(session.builder ?? INITIAL_BUILDER)
      setComplexity(session.complexity ?? INITIAL_COMPLEXITY)
      setGuidedFaces(Array.isArray(session.guidedFaces) && session.guidedFaces.length > 0 ? session.guidedFaces : [...INITIAL_GUIDED_FACES])
      setInstrumentFocus(session.instrumentFocus ?? INITIAL_PRESET?.instrumentFocus ?? 'both')
      setKeptChordSlots(Array.isArray(session.keptChordSlots) ? session.keptChordSlots : [])
      setLoopEnabled(Boolean(session.loopEnabled))
      setManualInput(typeof session.manualInput === 'string' ? session.manualInput : DEFAULT_MANUAL_INPUT)
      setMode(session.mode ?? 'guided')
      setPlaybackInstrument(session.playbackInstrument ?? 'warm-piano')
      setProgression(session.progression)
      setRhythmFeel(session.rhythmFeel ?? 'straight')
      setSections(nextSections)
      setShowTheory(Boolean(session.showTheory))
      setTableTheme(TABLE_THEME_IDS.includes(session.tableTheme as TableTheme) ? (session.tableTheme as TableTheme) : 'emerald')
      setTempo(typeof session.tempo === 'number' ? session.tempo : INITIAL_PRESET?.tempo ?? 92)
      setDelightMessage(createDelightMessage(session.progression))
      setStatus('Restored your last idea.')
    } catch (error) {
      console.error('Creative session restore failed', error)
    } finally {
      setSessionReady(true)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !sessionReady) {
      return
    }

    try {
      const session: CreativeSessionState = {
        activePresetId,
        activeSection,
        advancedConfig,
        advancedRoll,
        builder,
        complexity,
        guidedFaces,
        instrumentFocus,
        keptChordSlots,
        loopEnabled,
        manualInput,
        mode,
        playbackInstrument,
        progression,
        rhythmFeel,
        sections,
        showTheory,
        tableTheme,
        tempo,
      }

      window.localStorage.setItem(CREATIVE_SESSION_STORAGE_KEY, JSON.stringify(session))
    } catch (error) {
      console.error('Creative session save failed', error)
    }
  }, [
    activePresetId,
    activeSection,
    advancedConfig,
    advancedRoll,
    builder,
    complexity,
    guidedFaces,
    instrumentFocus,
    keptChordSlots,
    loopEnabled,
    manualInput,
    mode,
    playbackInstrument,
    progression,
    rhythmFeel,
    sections,
    sessionReady,
    showTheory,
    tableTheme,
    tempo,
  ])

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to the chord generator</a>
      <div className="rng-app-shell">
        <div className="rng-app-shell__glow" />
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{progressionAnnouncement}</p>
        <section className="workstation-top panel-surface panel-surface--wide reveal" style={{ animationDelay: '60ms' }}>
        <div className="workstation-topbar">
          <div className="workstation-brand">
            <span className="hero-strip__kicker">RNG Chords</span>
            <h1>Random chord ideas for guitar, piano, and songwriting.</h1>
            <p>RNG Chords is a chord progression generator that rolls dice for the key, the chord qualities, and the rhythm, then plays the result back in the browser.</p>
            <ul className="brand-facts">
              <li>Nine key centers: C, G, D, A, E, F, B&#9837;, E&#9837;, A&#9837;.</li>
              <li>Six dice sizes, d4 through d20. Advanced rolls use five separate dice.</li>
              <li>Three complexity settings: Easy, Color, Tension.</li>
              <li>Six playback sounds and a tempo range of 58 to 164 BPM.</li>
              <li>MIDI export with the tempo written into the file. Free, no account, and every roll happens in the page.</li>
            </ul>
          </div>

          <div className="workstation-topbar__actions">
            <button
              type="button"
              className="pill-button pill-button--muted settings-trigger"
              onClick={() => setIsSettingsOpen(true)}
              aria-expanded={isSettingsOpen}
              aria-haspopup="dialog"
              aria-controls={isSettingsOpen ? 'settings-drawer' : undefined}
            >
              <span aria-hidden="true">⚙</span>
              <span>Customize</span>
            </button>
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

        {isSettingsOpen ? (
          <div
            className="settings-drawer__backdrop"
            onClick={() => setIsSettingsOpen(false)}
            aria-hidden="true"
          />
        ) : null}
        {isSettingsOpen ? (
        <aside
          id="settings-drawer"
          ref={settingsDrawerRef}
          className="settings-drawer settings-drawer--open"
          role="dialog"
          aria-modal="true"
          aria-label="Customize RNG Chords"
        >
          <div className="settings-drawer__head">
            <div>
              <span className="panel-title__eyebrow">Customize</span>
              <h2>Settings</h2>
            </div>
            <button
              type="button"
              className="pill-button pill-button--muted"
              onClick={() => setIsSettingsOpen(false)}
              aria-label="Close settings"
            >
              Close
            </button>
          </div>

          <div className="theme-picker">
            <span className="panel-title__eyebrow">Table theme</span>
            <div className="theme-swatches" role="group" aria-label="Table theme">
              {TABLE_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={theme.id === tableTheme ? 'theme-swatch theme-swatch--active' : 'theme-swatch'}
                  onClick={() => setTableTheme(theme.id)}
                  aria-pressed={theme.id === tableTheme}
                  title={theme.detail}
                >
                  <span className="theme-swatch__chip" style={{ background: theme.swatch }} aria-hidden="true" />
                  <span className="theme-swatch__label">{theme.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div
            className="mode-rail settings-drawer__modes"
            role="tablist"
            aria-label="Idea generation modes"
            aria-orientation="horizontal"
          >
            {MODE_OPTIONS.map((entry) => (
              <button
                key={entry}
                type="button"
                className={entry === mode ? 'mode-pill mode-pill--active' : 'mode-pill'}
                onClick={() => setMode(entry)}
                onKeyDown={(event) => handleModeTabKeyDown(event, entry)}
                id={createModeTabId(entry)}
                role="tab"
                aria-selected={entry === mode}
                tabIndex={entry === mode ? 0 : -1}
              >
                <span>{MODE_COPY[entry].title}</span>
                <small>{MODE_COPY[entry].detail}</small>
              </button>
            ))}
          </div>

          <section className="control-bank control-bank--compact">
          <div className="stack-block stack-block--dense">
            <div className="compact-panel-head">
              <span className="panel-title__eyebrow">Idea sets</span>
              <h2>{activePreset?.label ?? 'Free play'}</h2>
              <p>{activePreset?.strapline ?? 'Roll a new progression and review the result.'}</p>
            </div>

            <div className="preset-bank preset-bank--compact">
              {PLAYGROUND_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={preset.id === activePreset?.id ? 'preset-card preset-card--active' : 'preset-card'}
                  onClick={() => loadPreset(preset)}
                  aria-pressed={preset.id === activePreset?.id}
                >
                  <span>{preset.label}</span>
                  <strong>{preset.strapline}</strong>
                </button>
              ))}
            </div>

            <label className="control-field">
              <span>Instrument Focus</span>
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
              <span>Chord Complexity</span>
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
              <span>Try This First</span>
              <p>{practicePrompt}</p>
            </div>

            <PanelTitle eyebrow="Mode" title={MODE_COPY[mode].title} detail={MODE_COPY[mode].detail} />

            {mode === 'guided' ? (
              <div className="stack-block" id={createModePanelId('guided')} role="tabpanel" aria-labelledby={createModeTabId('guided')}>
                <div className="row-split row-split--tight">
                  <button type="button" className="pill-button" onClick={addGuidedDie}>
                    Add Die
                  </button>
                  <button type="button" className="pill-button pill-button--muted" onClick={removeGuidedDie}>
                    Remove Die
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
                  Roll This Setup
                </button>
              </div>
            ) : null}

            {mode === 'advanced' ? (
              <div className="stack-block" id={createModePanelId('advanced')} role="tabpanel" aria-labelledby={createModeTabId('advanced')}>
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
                  Roll This Setup
                </button>
              </div>
            ) : null}

            {mode === 'manual' ? (
              <div className="stack-block stack-block--manual" id={createModePanelId('manual')} role="tabpanel" aria-labelledby={createModeTabId('manual')}>
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
                    Add This Chord
                  </button>
                  <button type="button" className="action-button" onClick={() => appendBuilderChord(true)}>
                    Replace with This Chord
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
                    Add Typed Chords
                  </button>
                  <button type="button" className="pill-button pill-button--bright" onClick={() => applyManualInput(true)}>
                    Replace with Typed Chords
                  </button>
                </div>

                {manualIssues.length > 0 ? (
                  <div className="issue-panel" role="status" aria-live="polite">
                    {manualIssues.map((issue) => (
                      <p key={issue}>{issue}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        </aside>
        ) : null}

        <main id="main-content" className="tabletop-grid tabletop-grid--stage" tabIndex={-1}>
        <section className="stage-bank panel-surface panel-surface--tray reveal" style={{ animationDelay: '140ms' }}>
          <div className="compact-panel-head compact-panel-head--tray">
            <span className="panel-title__eyebrow">Dice</span>
            <h2>Idea tray</h2>
            <p>Roll here, keep what sounds good, and hit play if you want to hear it.</p>
          </div>
          <div className="tray-toolbar">
            <button type="button" className="action-button" onClick={generateRandomChords}>
              Roll New Idea
            </button>
            <button type="button" className="pill-button pill-button--bright" onClick={surpriseMe}>
              Surprise Me
            </button>
          </div>
          <div className="dice-tray" style={diceTrayStyle} aria-hidden="true">
            {stageDice.map((die, index) => (
              <DieCard
                key={`${die.label}-${die.footer}-${die.value}-${diceImpulse}`}
                impulse={diceImpulse}
                label={die.label}
                value={die.value}
                footer={die.footer}
                detail={die.detail}
                accent={die.accent}
                sequence={index}
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

        <section className="results-bank panel-surface reveal" style={{ animationDelay: '220ms' }}>
          <div className="compact-panel-head compact-panel-head--results">
            <span className="panel-title__eyebrow">Sound</span>
            <h2>Playback &amp; edit</h2>
            <p>Hear the idea, keep the chords that work, and export it when it's worth saving.</p>
          </div>

          <div className="idea-utility-bar">
            <div className="idea-memory">
              <div className="idea-memory__copy">
                <span>Idea slots</span>
                <strong>Save versions in A, B, or C so you can compare takes without losing the one you liked.</strong>
              </div>
              <div className="section-strip" role="group" aria-label="Idea slots">
                {SECTION_IDS.map((sectionId) => {
                  const filled = Boolean(sections[sectionId])
                  return (
                    <button
                      key={sectionId}
                      type="button"
                      className={sectionId === activeSection ? 'chip-button chip-button--active section-chip' : 'chip-button section-chip'}
                      onClick={() => loadSection(sectionId)}
                      aria-label={filled ? `Load saved idea slot ${sectionId}` : `Idea slot ${sectionId} is empty`}
                      aria-pressed={sectionId === activeSection}
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
                Reroll Unlocked
              </button>
              <button
                type="button"
                className={showTheory ? 'chip-button chip-button--active' : 'chip-button'}
                onClick={() => setShowTheory((current) => !current)}
                aria-pressed={showTheory}
              >
                Theory {showTheory ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          {delightMessage ? (
            <div className="delight-banner" role="status">
              <span>Status</span>
              <strong>{delightMessage}</strong>
            </div>
          ) : null}

          <div className="transport-strip transport-strip--primary">
            <button
              type="button"
              className="pill-button pill-button--bright transport-primary"
              onPointerEnter={preloadPlayback}
              onFocus={preloadPlayback}
              onClick={startPlayback}
              aria-keyshortcuts="Space"
              aria-describedby="jam-shortcuts"
            >
              {playing ? 'Replay' : 'Play'}
            </button>
            <button type="button" className="pill-button" onClick={haltPlayback}>
              Stop
            </button>
            <button
              type="button"
              className={loopEnabled ? 'chip-button chip-button--active' : 'chip-button'}
              onClick={() => setLoopEnabled((current) => !current)}
              aria-pressed={loopEnabled}
            >
              Loop {loopEnabled ? 'On' : 'Off'}
            </button>
            <label className="transport-field transport-field--tempo">
              <span>Tempo</span>
              <input name="transport-tempo" type="range" min={58} max={164} value={tempo} onChange={(event) => setTempo(Number(event.target.value))} />
              <strong>{tempo} BPM</strong>
            </label>
            <button
              type="button"
              className="pill-button pill-button--muted transport-more"
              onClick={() => setShowMoreTransport((current) => !current)}
              aria-expanded={showMoreTransport}
              aria-controls={showMoreTransport ? 'transport-more' : undefined}
            >
              {showMoreTransport ? 'Fewer options' : 'More options'}
            </button>
          </div>

          {showMoreTransport ? (
            <div id="transport-more" className="transport-strip transport-strip--secondary">
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
              <button type="button" className="pill-button" onClick={exportMidi} disabled={midiBusy}>
                {midiBusy ? 'Exporting…' : 'Export MIDI'}
              </button>
              <button type="button" className="pill-button pill-button--muted" onClick={clearProgression}>
                Clear Idea
              </button>
            </div>
          ) : null}

          <p id="jam-shortcuts" className="jam-hint">Keyboard shortcuts: ← → preview chords · Enter replay selected chord · Space play or stop</p>

          <div className="rack-grid">
            {displayProgression.chords.length > 0 ? (
              displayProgression.chords.map((chord, index) => (
                <article
                  key={chord.id}
                  className={`chord-card${index === highlightedChordIndex ? ' chord-card--active' : ''}${playing && index === activeChordIndex ? ' chord-card--playing' : ''}`}
                  style={{ '--beat-ms': `${Math.round(60000 / tempo)}ms` } as CSSProperties}
                >
                  <div className="chord-card__head">
                    <div>
                      <span>Slot {index + 1}</span>
                      <h3>{chord.label}</h3>
                    </div>
                    <button type="button" className="card-x" onClick={() => removeChord(index)} aria-label={`Remove ${chord.label}`}>
                      <span aria-hidden="true">×</span>
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
                      aria-pressed={keptChordSlots.includes(index)}
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
                <p className="empty-rack__hint">Try Campfire Glow for a direct sound, Velvet Keys for softer color, or Surprise Me for a new preset.</p>
              </div>
            )}
          </div>

          <div className="results-bank__meta">
            <div className="player-guide player-guide--compact">
              <div className="player-guide__head">
                <div className="player-guide__title">
                  <span>{INSTRUMENT_FOCUS_COPY[instrumentFocus].label}</span>
                  <strong>{activePreset?.label ?? 'Free play'} direction</strong>
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

        <footer className="status-bar reveal" role="status" aria-live="polite" style={{ animationDelay: '300ms' }}>
          <span>{status}</span>
          <strong>
            {progression.chords.length} chords · {progressionBeats.toFixed(1)} beats · {progressionDuration}
          </strong>
        </footer>
      </div>
    </>
  )
}

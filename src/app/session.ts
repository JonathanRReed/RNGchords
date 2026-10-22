import { DEFAULT_ADVANCED_FACES, DEFAULT_GUIDED_FACES } from '../lib/music/constants'
import { createAdvancedRollFromValues, createGuidedRollFromValues } from '../lib/music/generator'
import { RHYTHM_FEEL_COPY, type RhythmFeel } from '../lib/music/ideas'
import { PLAYGROUND_PRESETS } from '../lib/music/playground'
import type { AdvancedRollResult, BuilderState, GuidedRollResult } from '../lib/music/types'
import { COMPLEXITY_OPTIONS, DEFAULT_MANUAL_INPUT, FOCUS_OPTIONS, INSTRUMENT_OPTIONS, MODE_OPTIONS, SECTION_IDS, SESSION_KEY } from './constants'
import type { SectionId, SectionSnapshot, WorkState } from './types'

const RHYTHM_FEELS = Object.keys(RHYTHM_FEEL_COPY) as RhythmFeel[]
const FIRST_PRESET = PLAYGROUND_PRESETS[0]

const INITIAL_FACES = FIRST_PRESET?.guidedFaces ? [...FIRST_PRESET.guidedFaces] : [...DEFAULT_GUIDED_FACES]
const INITIAL_COMPLEXITY = FIRST_PRESET?.complexity ?? 'balanced'

const INITIAL_GUIDED: GuidedRollResult = createGuidedRollFromValues({ faceCounts: INITIAL_FACES }, [3, 5, 4, 6], INITIAL_COMPLEXITY)

const INITIAL_ADVANCED: AdvancedRollResult = createAdvancedRollFromValues(
  { chordCount: 4, faceCounts: DEFAULT_ADVANCED_FACES },
  { roots: 4, qualities: 3, extensions: 6, inversions: 2, rhythm: 5 },
  'balanced',
)

const INITIAL_BUILDER: BuilderState = {
  root: 'C',
  quality: 'maj',
  extensionPrimary: 'maj7',
  colorTones: ['add9'],
  bass: '',
  inversion: 0,
  rhythmBeats: 1,
}

export function createInitialState(): WorkState {
  return {
    activePresetId: FIRST_PRESET?.id ?? 'campfire-glow',
    activeSection: 'A',
    advancedConfig: { chordCount: 4, faceCounts: { ...DEFAULT_ADVANCED_FACES } },
    advancedRoll: INITIAL_ADVANCED,
    builder: INITIAL_BUILDER,
    complexity: INITIAL_COMPLEXITY,
    guidedFaces: INITIAL_FACES,
    instrumentFocus: FIRST_PRESET?.instrumentFocus ?? 'both',
    keptChordSlots: [],
    loopEnabled: false,
    manualInput: DEFAULT_MANUAL_INPUT,
    mode: 'guided',
    playbackInstrument: 'warm-piano',
    progression: INITIAL_GUIDED.progression,
    rhythmFeel: 'straight',
    sections: { A: null, B: null, C: null },
    showTheory: false,
    tempo: FIRST_PRESET?.tempo ?? 92,
  }
}

function pick<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback
}

function isSnapshot(value: unknown): value is SectionSnapshot {
  const candidate = value as Partial<SectionSnapshot> | null
  return Boolean(candidate && Array.isArray(candidate.progression?.chords) && candidate.advancedConfig && candidate.advancedRoll && Array.isArray(candidate.guidedFaces))
}

/** Rebuilds a work state from whatever was saved, filling gaps from defaults. */
export function readSession(raw: string | null): WorkState | null {
  if (!raw) {
    return null
  }

  const saved = JSON.parse(raw) as Partial<WorkState>

  if (!Array.isArray(saved.progression?.chords)) {
    return null
  }

  const base = createInitialState()
  const sections = { ...base.sections }

  for (const id of SECTION_IDS) {
    const snapshot = saved.sections?.[id]
    sections[id] = isSnapshot(snapshot) ? snapshot : null
  }

  return {
    ...base,
    activePresetId: typeof saved.activePresetId === 'string' ? saved.activePresetId : base.activePresetId,
    activeSection: pick<SectionId>(saved.activeSection, SECTION_IDS, 'A'),
    advancedConfig: saved.advancedConfig ?? base.advancedConfig,
    advancedRoll: saved.advancedRoll ?? base.advancedRoll,
    builder: saved.builder ?? base.builder,
    complexity: pick(saved.complexity, COMPLEXITY_OPTIONS, base.complexity),
    guidedFaces: Array.isArray(saved.guidedFaces) && saved.guidedFaces.length > 0 ? saved.guidedFaces : base.guidedFaces,
    instrumentFocus: pick(saved.instrumentFocus, FOCUS_OPTIONS, base.instrumentFocus),
    keptChordSlots: Array.isArray(saved.keptChordSlots) ? saved.keptChordSlots : [],
    loopEnabled: Boolean(saved.loopEnabled),
    manualInput: typeof saved.manualInput === 'string' ? saved.manualInput : base.manualInput,
    mode: pick(saved.mode, MODE_OPTIONS, 'guided'),
    playbackInstrument: pick(saved.playbackInstrument, INSTRUMENT_OPTIONS, base.playbackInstrument),
    progression: saved.progression as WorkState['progression'],
    rhythmFeel: pick(saved.rhythmFeel, RHYTHM_FEELS, base.rhythmFeel),
    sections,
    showTheory: Boolean(saved.showTheory),
    tempo: typeof saved.tempo === 'number' ? saved.tempo : base.tempo,
  }
}

export function loadSession(): WorkState | null {
  try {
    return readSession(window.localStorage.getItem(SESSION_KEY))
  } catch (error) {
    console.error('Could not restore the last session', error)
    return null
  }
}

export function saveSession(state: WorkState): void {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Could not save the session', error)
  }
}

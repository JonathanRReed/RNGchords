import type {
  AdvancedParameter,
  BuilderState,
  ChordQuality,
  ExtensionToken,
  RootNote,
} from './types'

export const ROOT_OPTIONS: RootNote[] = [
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B',
]

export const SHARP_NOTES: RootNote[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const FLAT_NOTES: RootNote[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

export const QUALITY_OPTIONS: Array<{ value: ChordQuality; label: string }> = [
  { value: 'maj', label: 'Major' },
  { value: 'min', label: 'Minor' },
  { value: 'dom', label: 'Dominant' },
  { value: 'dim', label: 'Diminished' },
  { value: 'aug', label: 'Augmented' },
  { value: 'sus2', label: 'Sus 2' },
  { value: 'sus4', label: 'Sus 4' },
]

export const PRIMARY_EXTENSION_OPTIONS: Array<{ value: BuilderState['extensionPrimary']; label: string }> = [
  { value: '', label: 'Triad' },
  { value: '6', label: '6' },
  { value: '7', label: '7' },
  { value: 'maj7', label: 'maj7' },
  { value: '9', label: '9' },
  { value: '11', label: '11' },
  { value: '13', label: '13' },
]

export const COLOR_TONE_OPTIONS: Array<{
  value: Extract<BuilderState['colorTones'][number], ExtensionToken>
  label: string
}> = [
  { value: 'b9', label: 'b9' },
  { value: '#9', label: '#9' },
  { value: '#11', label: '#11' },
  { value: 'b13', label: 'b13' },
  { value: 'add9', label: 'add9' },
  { value: 'add11', label: 'add11' },
  { value: 'add13', label: 'add13' },
]

export const FACE_OPTIONS = [4, 6, 8, 10, 12, 20]

export const RHYTHM_OPTIONS = [0.5, 1, 1.5, 2, 3, 4]

export const RHYTHM_LABELS: Record<number, string> = {
  0.5: 'Eighth',
  1: 'Quarter',
  1.5: 'Dotted quarter',
  2: 'Half',
  3: 'Dotted half',
  4: 'Whole',
}

export const ADVANCED_PARAMETERS: AdvancedParameter[] = [
  'roots',
  'qualities',
  'extensions',
  'inversions',
  'rhythm',
]

export const ADVANCED_PARAMETER_LABELS: Record<AdvancedParameter, string> = {
  roots: 'Root path',
  qualities: 'Quality flavor',
  extensions: 'Extension color',
  inversions: 'Inversion stack',
  rhythm: 'Rhythm pulse',
}

export const DEFAULT_GUIDED_FACES = [6, 8, 10, 12]

export const DEFAULT_ADVANCED_FACES: Record<AdvancedParameter, number> = {
  roots: 8,
  qualities: 6,
  extensions: 12,
  inversions: 4,
  rhythm: 8,
}

export const KEY_CENTERS: RootNote[] = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab']

export const DEGREE_STEPS = [0, 2, 4, 5, 7, 9, 11]

export type RootNote =
  | 'C'
  | 'C#'
  | 'Db'
  | 'D'
  | 'D#'
  | 'Eb'
  | 'E'
  | 'F'
  | 'F#'
  | 'Gb'
  | 'G'
  | 'G#'
  | 'Ab'
  | 'A'
  | 'A#'
  | 'Bb'
  | 'B'

export type ChordQuality = 'maj' | 'min' | 'dom' | 'dim' | 'aug' | 'sus2' | 'sus4'

export type ChordComplexity = 'basic' | 'balanced' | 'wild'

export type ExtensionToken =
  | '6'
  | '7'
  | 'maj7'
  | '9'
  | '11'
  | '13'
  | 'b9'
  | '#9'
  | '#11'
  | 'b13'
  | 'add9'
  | 'add11'
  | 'add13'

export type ProgressionSource = 'guided' | 'advanced' | 'manual-builder' | 'manual-text'

export type AdvancedParameter =
  | 'roots'
  | 'qualities'
  | 'extensions'
  | 'inversions'
  | 'rhythm'

export interface ChordSeed {
  id: string
  root: RootNote
  quality: ChordQuality
  extensions: ExtensionToken[]
  bass?: RootNote
  inversion?: number
  rhythmBeats?: number
  source: ProgressionSource
  explanation?: string[]
}

export interface ChordDescriptor extends ChordSeed {
  inversion: number
  rhythmBeats: number
  label: string
  notes: RootNote[]
  midi: number[]
}

export interface ProgressionResult {
  chords: ChordDescriptor[]
  explanation: string[]
  rollSummary: string[]
  source: ProgressionSource
  keyCenter: RootNote
}

export interface GuidedDiceConfig {
  faceCounts: number[]
}

export interface GuidedRollResult {
  config: GuidedDiceConfig
  values: number[]
  progression: ProgressionResult
}

export interface AdvancedDiceConfig {
  chordCount: number
  faceCounts: Record<AdvancedParameter, number>
}

export interface AdvancedRollResult {
  config: AdvancedDiceConfig
  values: Record<AdvancedParameter, number>
  progression: ProgressionResult
}

export interface ParsedProgression {
  chords: ChordDescriptor[]
  issues: string[]
}

export interface BuilderState {
  root: RootNote
  quality: ChordQuality
  extensionPrimary: '' | '6' | '7' | 'maj7' | '9' | '11' | '13'
  colorTones: Array<'b9' | '#9' | '#11' | 'b13' | 'add9' | 'add11' | 'add13'>
  bass: '' | RootNote
  inversion: number
  rhythmBeats: number
}

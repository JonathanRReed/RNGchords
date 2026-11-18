import type { PlaybackInstrument } from '../lib/audio/playback'
import type { FaceLabel } from '../lib/dice3d/labels'
import type { RhythmFeel } from '../lib/music/ideas'
import type {
  AdvancedDiceConfig,
  AdvancedRollResult,
  BuilderState,
  ChordComplexity,
  ProgressionResult,
  RootNote,
} from '../lib/music/types'

export type Mode = 'guided' | 'advanced' | 'manual'

export type SectionId = 'A' | 'B' | 'C'

export interface SectionSnapshot {
  activePresetId: string
  advancedConfig: AdvancedDiceConfig
  advancedRoll: AdvancedRollResult
  complexity: ChordComplexity
  guidedFaces: number[]
  mode: Mode
  playbackInstrument: PlaybackInstrument
  progression: ProgressionResult
  rhythmFeel: RhythmFeel
  tempo: number
}

export interface WorkState extends SectionSnapshot {
  activeSection: SectionId
  builder: BuilderState
  keptChordSlots: number[]
  keyLock: RootNote | null
  loopEnabled: boolean
  manualInput: string
  sections: Record<SectionId, SectionSnapshot | null>
}

export interface StageDie {
  /** Stays the same for as long as this is the same die on the table. */
  id: string
  label: string
  /** What the die shows: the chord, or the piece of it this die decided. */
  face: FaceLabel
  /** What its other faces say. */
  others: FaceLabel[]
  footer: string
  detail?: string
  faces: number
  /** Printed on the table where the die lands. */
  mark: string
  /** Index of the chord this die stands for, when it stands for one. */
  chordIndex?: number
}

/** Which dice a roll throws. Null means all of them. */
export interface RollEvent {
  id: number
  slots: number[] | null
  /** The dice are set down without being thrown, as when a roll is undone. */
  quiet?: boolean
}

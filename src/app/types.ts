import type { PlaybackInstrument } from '../lib/audio/playback'
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
  id: string
  label: string
  value: string
  footer: string
  detail?: string
  faces: number
  /** Index of the chord this die stands for, when it stands for one. */
  chordIndex?: number
}

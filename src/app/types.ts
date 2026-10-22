import type { PlaybackInstrument } from '../lib/audio/playback'
import type { RhythmFeel } from '../lib/music/ideas'
import type { InstrumentFocus } from '../lib/music/playground'
import type {
  AdvancedDiceConfig,
  AdvancedRollResult,
  BuilderState,
  ChordComplexity,
  ProgressionResult,
} from '../lib/music/types'

export type Mode = 'guided' | 'advanced' | 'manual'

export type SectionId = 'A' | 'B' | 'C'

export interface SectionSnapshot {
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

export interface WorkState extends SectionSnapshot {
  activeSection: SectionId
  builder: BuilderState
  keptChordSlots: number[]
  loopEnabled: boolean
  manualInput: string
  sections: Record<SectionId, SectionSnapshot | null>
  showTheory: boolean
}

export interface StageDie {
  id: string
  label: string
  value: string | number
  footer: string
  detail?: string
}

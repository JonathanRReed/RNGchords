import { PLAYBACK_INSTRUMENT_COPY, type PlaybackInstrument } from '../lib/audio/playback'
import type { ChordComplexity } from '../lib/music/types'
import type { Mode, SectionId } from './types'

export const MODE_COPY: Record<Mode, { title: string }> = {
  guided: { title: 'Easy' },
  advanced: { title: 'Advanced' },
  manual: { title: 'Manual' },
}

export const COMPLEXITY_COPY: Record<ChordComplexity, { label: string; detail: string }> = {
  basic: {
    label: 'Simple',
    detail: 'Major, minor, and dominant chords with plain endings.',
  },
  balanced: {
    label: 'Color',
    detail: 'Adds sus, diminished, augmented, and 9th, 11th, and 13th chords.',
  },
  wild: {
    label: 'Tension',
    detail: 'Every chord gets an extension. Expect altered notes and short chords.',
  },
}

export const MODE_OPTIONS = Object.keys(MODE_COPY) as Mode[]
export const COMPLEXITY_OPTIONS = Object.keys(COMPLEXITY_COPY) as ChordComplexity[]
export const INSTRUMENT_OPTIONS = Object.keys(PLAYBACK_INSTRUMENT_COPY) as PlaybackInstrument[]
export const SECTION_IDS: readonly SectionId[] = ['A', 'B', 'C']

export const SURPRISE_TEMPOS = [68, 74, 82, 88, 96, 104, 112, 120, 128, 136] as const
export const MIN_TEMPO = 58
export const MAX_TEMPO = 164
export const MAX_GUIDED_DICE = 8
export const DEFAULT_MANUAL_INPUT = 'Cmaj9, Am11, D7b9, G13'
export const DEFAULT_STATUS = ''
export const SESSION_KEY = 'rng-chords-creative-session'

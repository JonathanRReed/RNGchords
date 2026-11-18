import type { AdvancedDiceConfig, ChordComplexity } from './types'

export interface PlaygroundPreset {
  id: string
  label: string
  strapline: string
  mode: 'guided' | 'advanced'
  guidedFaces?: number[]
  advancedConfig?: AdvancedDiceConfig
  complexity: ChordComplexity
  tempo: number
}

export const PLAYGROUND_PRESETS: PlaygroundPreset[] = [
  {
    id: 'campfire-glow',
    label: 'Four plain chords',
    strapline: 'Triads at a walking pace. Easy to loop.',
    mode: 'guided',
    guidedFaces: [6, 6, 8, 8],
    complexity: 'basic',
    tempo: 86,
  },
  {
    id: 'velvet-keys',
    label: 'Slow, with 7ths',
    strapline: 'Four chords, most with a 7th or 9th on top.',
    mode: 'guided',
    guidedFaces: [8, 10, 12, 12],
    complexity: 'balanced',
    tempo: 74,
  },
  {
    id: 'happy-accident',
    label: 'Five tense chords',
    strapline: 'Every chord gets an extension. Keep what lands.',
    mode: 'advanced',
    advancedConfig: {
      chordCount: 5,
      faceCounts: {
        roots: 10,
        qualities: 8,
        extensions: 12,
        inversions: 6,
        rhythm: 8,
      },
    },
    complexity: 'wild',
    tempo: 104,
  },
  {
    id: 'curious-ears',
    label: 'Three chords',
    strapline: 'Small dice, plain chords. Quick to reroll.',
    mode: 'guided',
    guidedFaces: [4, 6, 6],
    complexity: 'basic',
    tempo: 96,
  },
]

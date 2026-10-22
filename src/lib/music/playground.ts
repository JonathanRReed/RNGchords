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
  status: string
}

export const PLAYGROUND_PRESETS: PlaygroundPreset[] = [
  {
    id: 'campfire-glow',
    label: 'Campfire glow',
    strapline: 'Plain chords at a walking pace. Easy to loop.',
    mode: 'guided',
    guidedFaces: [6, 6, 8, 8],
    complexity: 'basic',
    tempo: 86,
    status: 'Campfire glow: four plain chords at 86 bpm.',
  },
  {
    id: 'velvet-keys',
    label: 'Velvet hour',
    strapline: 'Slower, with 7ths and 9ths on most chords.',
    mode: 'guided',
    guidedFaces: [8, 10, 12, 12],
    complexity: 'balanced',
    tempo: 74,
    status: 'Velvet hour: four richer chords at 74 bpm.',
  },
  {
    id: 'happy-accident',
    label: 'Happy accident',
    strapline: 'Five chords, every one with some tension. Keep what lands.',
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
    status: 'Happy accident: five tense chords at 104 bpm.',
  },
  {
    id: 'curious-ears',
    label: 'Short and sweet',
    strapline: 'Three chords. Quick to learn, quick to reroll.',
    mode: 'guided',
    guidedFaces: [4, 6, 6],
    complexity: 'basic',
    tempo: 96,
    status: 'Short and sweet: three plain chords at 96 bpm.',
  },
]

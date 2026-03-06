import { extensionSummary } from './chords'
import type { AdvancedDiceConfig, ChordComplexity, ChordDescriptor, ProgressionResult } from './types'

export type InstrumentFocus = 'guitar' | 'piano' | 'both'

export interface PlaygroundPreset {
  id: string
  label: string
  strapline: string
  mode: 'guided' | 'advanced'
  guidedFaces?: number[]
  advancedConfig?: AdvancedDiceConfig
  complexity: ChordComplexity
  tempo: number
  instrumentFocus: InstrumentFocus
  status: string
}

export const INSTRUMENT_FOCUS_COPY: Record<InstrumentFocus, { label: string; detail: string }> = {
  guitar: {
    label: 'Guitar focus',
    detail: 'Lean toward shapes that feel good on guitar right away.',
  },
  piano: {
    label: 'Piano focus',
    detail: 'Lean toward voicings that move smoothly under your hands.',
  },
  both: {
    label: 'Anything goes',
    detail: 'Just chase a good idea and play it however you want.',
  },
}

export const PLAYGROUND_PRESETS: PlaygroundPreset[] = [
  {
    id: 'campfire-glow',
    label: 'Campfire Glow',
    strapline: 'Friendly chords that are easy to grab and fun to loop.',
    mode: 'guided',
    guidedFaces: [6, 6, 8, 8],
    complexity: 'basic',
    tempo: 86,
    instrumentFocus: 'guitar',
    status: 'Campfire Glow is ready. Expect simple, easygoing chords.',
  },
  {
    id: 'velvet-keys',
    label: 'Velvet Keys',
    strapline: 'Softer, richer chords for slower moods and extra color.',
    mode: 'guided',
    guidedFaces: [8, 10, 12, 12],
    complexity: 'balanced',
    tempo: 74,
    instrumentFocus: 'piano',
    status: 'Velvet Keys is ready. Expect softer motion and richer harmony.',
  },
  {
    id: 'happy-accident',
    label: 'Happy Accident',
    strapline: 'Let things wander and keep the weird bits that work.',
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
    instrumentFocus: 'both',
    status: 'Happy Accident is ready. This one likes surprises.',
  },
  {
    id: 'curious-ears',
    label: 'Curious Ears',
    strapline: 'Shorter, cleaner ideas for messing around without pressure.',
    mode: 'guided',
    guidedFaces: [4, 6, 6],
    complexity: 'basic',
    tempo: 96,
    instrumentFocus: 'both',
    status: 'Curious Ears is ready. Small rolls, quick ideas, no pressure.',
  },
]

function voiceTail(chord: ChordDescriptor, count: number): string {
  return chord.notes.slice(-count).join(' · ')
}

function bassName(chord: ChordDescriptor): string {
  return chord.bass ?? chord.root
}

export function createChordCoach(chord: ChordDescriptor, focus: InstrumentFocus): string {
  if (focus === 'guitar') {
    return `Try it on guitar from ${bassName(chord)} first, then keep ${voiceTail(chord, 3)} on top if the full shape feels busy.`
  }

  if (focus === 'piano') {
    return `Try ${bassName(chord)} in the left hand and ${voiceTail(chord, 4)} in the right for an easy spread.`
  }

  return `Try it on your instrument, then compare it to the playback. The color notes here are ${voiceTail(chord, 3)}.`
}

export function createPlayerTips(progression: ProgressionResult, focus: InstrumentFocus): string[] {
  const firstChord = progression.chords[0]
  const lastChord = progression.chords.at(-1)

  if (!firstChord || !lastChord) {
    return ['Roll or type a progression to get a quick idea to play with.']
  }

  if (focus === 'guitar') {
    return [
      `Start with ${bassName(firstChord)} on the low strings, then keep the shape small if that feels better.`,
      `Listen for ${voiceTail(firstChord, 2)} moving into ${voiceTail(lastChord, 2)} as the line on top.`,
      `If it feels crowded, drop a note before you drop the color from ${extensionSummary(firstChord.extensions)}.`,
    ]
  }

  if (focus === 'piano') {
    return [
      `Start with the root in the left hand, then grab nearby notes in the right instead of jumping around.`,
      `See if you can move from ${firstChord.label} to ${lastChord.label} with as little hand motion as possible.`,
      `When it gets richer, let ${voiceTail(firstChord, 3)} sing on top.`,
    ]
  }

  return [
    'Hear the idea once, then try to play it back by ear on your own instrument.',
    `Use the note pills as a cheat sheet: the first chord starts with ${voiceTail(firstChord, Math.min(3, firstChord.notes.length))}.`,
    `Let ${lastChord.label} ring out at the end and see how it feels.`,
  ]
}

export function createPracticePrompt(progression: ProgressionResult, focus: InstrumentFocus): string {
  const firstChord = progression.chords[0]
  const secondChord = progression.chords[1]

  if (!firstChord) {
    return 'Roll first and see what kind of idea shows up.'
  }

  if (focus === 'guitar') {
    return secondChord
      ? `Try ${firstChord.label}, then slide into ${secondChord.label} while keeping one top note ringing.`
      : `Try ${firstChord.label} two different ways on the neck and keep the one you like more.`
  }

  if (focus === 'piano') {
    return secondChord
      ? `Try ${firstChord.label} in the middle register, then move to ${secondChord.label} with as little hand motion as you can.`
      : `Try ${firstChord.label} in root position, then change the inversion until it feels better.`
  }

  return secondChord
    ? `Try ${firstChord.label}, sing the top note, then answer it with ${secondChord.label}.`
    : `Try ${firstChord.label}, listen back, and decide if it feels bright, moody, tense, or calm.`
}

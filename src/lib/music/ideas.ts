import { createChordDescriptor, fromPitchClass, toPitchClass } from './chords'
import type { ChordComplexity, ChordDescriptor, ChordQuality, ExtensionToken, ProgressionResult, RootNote } from './types'

export type RhythmFeel = 'straight' | 'lazy' | 'pushing' | 'floaty' | 'stabs'

export const RHYTHM_FEEL_COPY: Record<RhythmFeel, { label: string; detail: string }> = {
  straight: {
    label: 'Straight',
    detail: 'Keep the timing even and direct.',
  },
  lazy: {
    label: 'Lazy',
    detail: 'Let the chords lean back a little.',
  },
  pushing: {
    label: 'Pushing',
    detail: 'Nudge the phrase forward with quicker hits.',
  },
  floaty: {
    label: 'Floaty',
    detail: 'Longer holds and more air between changes.',
  },
  stabs: {
    label: 'Stabs',
    detail: 'Shorter jabs that make the harmony feel punchier.',
  },
}

const DIATONIC_STEPS = [0, 2, 4, 5, 7, 9, 11] as const
const CHROMATIC_COLOR_STEPS = [1, 3, 6, 8, 10] as const
const DIATONIC_STEP_VALUES = [...DIATONIC_STEPS] as number[]
const CHROMATIC_COLOR_STEP_VALUES = [...CHROMATIC_COLOR_STEPS] as number[]
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const

const QUALITY_POOLS: Record<ChordComplexity, ChordQuality[]> = {
  basic: ['maj', 'min', 'dom', 'sus2', 'sus4'],
  balanced: ['maj', 'min', 'dom', 'sus2', 'sus4', 'dim'],
  wild: ['maj', 'min', 'dom', 'dim', 'aug', 'sus2', 'sus4'],
}

const EXTENSION_POOLS: Record<ChordComplexity, ExtensionToken[][]> = {
  basic: [[], ['6'], ['7'], ['maj7']],
  balanced: [[], ['6'], ['7'], ['maj7'], ['9'], ['add9'], ['11']],
  wild: [
    [],
    ['7'],
    ['maj7'],
    ['9'],
    ['11'],
    ['13'],
    ['b9'],
    ['#11'],
    ['b13'],
    ['9', '#11'],
    ['13', 'b9'],
  ],
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T
}

function clampBeatValue(value: number): number {
  return Math.max(0.5, Math.min(4, Math.round(value * 2) / 2))
}

function applyFeelToBeat(beat: number, index: number, feel: Exclude<RhythmFeel, 'straight'>): number {
  if (feel === 'lazy') {
    return clampBeatValue(index % 2 === 0 ? beat + 0.5 : beat)
  }

  if (feel === 'pushing') {
    return clampBeatValue(index % 2 === 0 ? beat : beat - 0.5)
  }

  if (feel === 'floaty') {
    return clampBeatValue(beat + (index % 3 === 0 ? 1 : 0.5))
  }

  return clampBeatValue(index % 3 === 2 ? Math.min(beat, 1) : 0.5)
}

function qualityTag(quality: ChordQuality): string {
  if (quality === 'maj') return 'Major'
  if (quality === 'min') return 'Minor'
  if (quality === 'dom') return 'Dominant'
  if (quality === 'dim') return 'Diminished'
  if (quality === 'aug') return 'Augmented'
  if (quality === 'sus2') return 'Sus2'
  return 'Sus4'
}

function numeralTag(root: RootNote, keyCenter: RootNote, quality: ChordQuality): string {
  const interval = (toPitchClass(root) - toPitchClass(keyCenter) + 12) % 12
  const diatonicIndex = DIATONIC_STEPS.indexOf(interval as (typeof DIATONIC_STEPS)[number])

  if (diatonicIndex === -1) {
    return 'Borrowed'
  }

  let numeral = ROMAN_NUMERALS[diatonicIndex] ?? 'I'

  if (quality === 'min' || quality === 'dim') {
    numeral = numeral.toLowerCase() as typeof numeral
  }

  if (quality === 'dim') {
    return `${numeral}°`
  }

  if (quality === 'aug') {
    return `${numeral}+`
  }

  return numeral
}

function colorTag(extensions: ExtensionToken[]): string {
  if (extensions.length === 0) {
    return 'Triad'
  }

  if (extensions.some((token) => token === 'b9' || token === '#9' || token === '#11' || token === 'b13')) {
    return 'Tense'
  }

  return 'Color'
}

export function getTheoryTags(chord: ChordDescriptor, keyCenter: RootNote): string[] {
  const tags = [numeralTag(chord.root, keyCenter, chord.quality), colorTag(chord.extensions), qualityTag(chord.quality)]

  if (chord.inversion > 0) {
    tags.push(`Inv ${chord.inversion}`)
  }

  return tags
}

export function applyRhythmFeel(progression: ProgressionResult, feel: RhythmFeel): ProgressionResult {
  if (feel === 'straight') {
    return progression
  }

  const chords = progression.chords.map((chord, index) =>
    createChordDescriptor({
      id: `${chord.id}-${feel}-${index}`,
      root: chord.root,
      quality: chord.quality,
      extensions: [...chord.extensions],
      bass: chord.bass,
      inversion: chord.inversion,
      rhythmBeats: applyFeelToBeat(chord.rhythmBeats, index, feel),
      source: chord.source,
      explanation: chord.explanation,
    }),
  )

  return {
    ...progression,
    chords,
    explanation: [...progression.explanation],
    rollSummary: [...progression.rollSummary],
  }
}

export function rerollChordFromKey({
  chord,
  keyCenter,
  complexity,
  index,
}: {
  chord: ChordDescriptor
  keyCenter: RootNote
  complexity: ChordComplexity
  index: number
}): ChordDescriptor {
  const keyPitch = toPitchClass(keyCenter)
  const preferFlat = keyCenter.includes('b')
  const currentInterval = (toPitchClass(chord.root) - keyPitch + 12) % 12
  const stepPool = complexity === 'wild' && Math.random() > 0.5
    ? [...DIATONIC_STEP_VALUES, ...CHROMATIC_COLOR_STEP_VALUES]
    : [...DIATONIC_STEP_VALUES]
  const currentIndex = stepPool.indexOf(currentInterval)
  const nextStep = currentIndex >= 0 && Math.random() > 0.35
    ? stepPool[(currentIndex + pickRandom([-1, 1]) + stepPool.length) % stepPool.length] ?? pickRandom(stepPool)
    : pickRandom(stepPool)
  const root = fromPitchClass(keyPitch + nextStep, preferFlat)
  const quality = Math.random() > 0.45 ? chord.quality : pickRandom(QUALITY_POOLS[complexity])
  const extensions = Math.random() > 0.55 ? [...chord.extensions] : [...pickRandom(EXTENSION_POOLS[complexity])]
  const inversionLimit = complexity === 'basic' ? 1 : complexity === 'wild' ? 4 : 3
  const inversion = inversionLimit <= 1 ? 0 : Math.floor(Math.random() * inversionLimit)

  return createChordDescriptor({
    id: `reroll-${index}-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    root,
    quality,
    extensions,
    bass: Math.random() > 0.8 ? chord.bass : undefined,
    inversion,
    rhythmBeats: chord.rhythmBeats,
    source: chord.source,
    explanation: [`Rerolled from ${keyCenter} with ${qualityTag(quality).toLowerCase()} flavor.`],
  })
}

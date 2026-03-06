import {
  ADVANCED_PARAMETERS,
  DEFAULT_ADVANCED_FACES,
  DEGREE_STEPS,
  KEY_CENTERS,
  RHYTHM_OPTIONS,
  SHARP_NOTES,
} from './constants'
import { createChordDescriptor, fromPitchClass, toPitchClass } from './chords'
import type {
  AdvancedDiceConfig,
  AdvancedParameter,
  AdvancedRollResult,
  ChordComplexity,
  ChordQuality,
  ExtensionToken,
  GuidedDiceConfig,
  GuidedRollResult,
  ProgressionResult,
  RootNote,
} from './types'

const COMPLEXITY_QUALITY_POOLS: Record<ChordComplexity, ChordQuality[]> = {
  basic: ['maj', 'min', 'dom', 'maj', 'min'],
  balanced: ['maj', 'min', 'dom', 'min', 'maj', 'dim', 'sus4', 'aug'],
  wild: ['maj', 'min', 'dom', 'dim', 'aug', 'sus4', 'dom', 'min'],
}
const COMPLEXITY_EXTENSION_POOLS: Record<ChordComplexity, ExtensionToken[][]> = {
  basic: [
    [],
    [],
    [],
    ['6'],
    ['7'],
    ['maj7'],
  ],
  balanced: [
    [],
    ['6'],
    ['7'],
    ['maj7'],
    ['9'],
    ['11'],
    ['13'],
    ['9', 'add13'],
    ['7', 'b9'],
    ['7', '#9'],
    ['11', '#11'],
    ['13', 'b13'],
  ],
  wild: [
    ['7'],
    ['9'],
    ['11'],
    ['13'],
    ['9', 'add13'],
    ['7', 'b9'],
    ['7', '#9'],
    ['11', '#11'],
    ['13', 'b13'],
    ['9', '#11'],
    ['13', 'add9'],
    ['7', 'b9', 'b13'],
  ],
}
const COMPLEXITY_RHYTHM_POOLS: Record<ChordComplexity, number[]> = {
  basic: [1, 2, 4],
  balanced: [1, 1.5, 2, 3, 4],
  wild: RHYTHM_OPTIONS,
}
const ROOT_PATTERNS = [
  [0, 5, 7, 9, 2, 7],
  [0, 9, 5, 7, 2, 4],
  [0, 7, 2, 9, 5, 11],
  [0, 4, 9, 5, 7, 2],
  [0, 2, 5, 7, 9, 4],
  [0, 7, 11, 4, 9, 2],
]

function randomDie(faceCount: number): number {
  return Math.floor(Math.random() * faceCount) + 1
}

function normalizeDieValue(value: number, faceCount: number): number {
  return Math.max(1, Math.min(faceCount, Math.round(value)))
}

function chooseKeyCenter(seed: number): RootNote {
  return KEY_CENTERS[seed % KEY_CENTERS.length]
}

function pickRhythm(value: number, offset = 0, complexity: ChordComplexity = 'balanced'): number {
  const pool = COMPLEXITY_RHYTHM_POOLS[complexity]
  return pool[(value + offset) % pool.length] ?? 1
}

function pickRoot(keyCenter: RootNote, degreeOffset: number, preferFlat = false): RootNote {
  const basePitch = toPitchClass(keyCenter)
  const pitch = basePitch + degreeOffset
  return fromPitchClass(pitch, preferFlat)
}

function guidedProgression(values: number[], config: GuidedDiceConfig, complexity: ChordComplexity): ProgressionResult {
  const sum = values.reduce((total, value) => total + value, 0)
  const keyCenter = chooseKeyCenter(sum)
  const preferFlat = keyCenter.includes('b')
  const qualityPool = COMPLEXITY_QUALITY_POOLS[complexity]
  const extensionPool = COMPLEXITY_EXTENSION_POOLS[complexity]
  const chords = values.map((value, index) => {
    const faces = config.faceCounts[index] ?? 6
    const degreeIndex = (value + index + sum) % DEGREE_STEPS.length
    const degree = DEGREE_STEPS[degreeIndex] ?? 0
    const root = pickRoot(keyCenter, degree, preferFlat)
    const quality = qualityPool[(value + faces + index) % qualityPool.length] ?? 'maj'
    const extensionFlavor = extensionPool[(value + index) % extensionPool.length] ?? []
    const inversion = complexity === 'wild' ? value % 4 : complexity === 'basic' ? 0 : value % 3
    const rhythmBeats = pickRhythm(value, index, complexity)
    const explanation = [
      `d${faces} rolled ${value}`,
      `degree ${degreeIndex + 1} against ${keyCenter}`,
      `${quality} color with ${extensionFlavor.length > 0 ? extensionFlavor.join(' + ') : 'triad focus'}`,
    ]

    return createChordDescriptor({
      id: `guided-${index}-${value}-${faces}`,
      root,
      quality,
      extensions: extensionFlavor,
      inversion,
      rhythmBeats,
      source: 'guided',
      explanation,
    })
  })

  return {
    chords,
    explanation: [
      `This roll centers around ${keyCenter} and turns each die into one chord.`,
      complexity === 'basic'
        ? 'Easy mode keeps the shapes simpler and easier to grab.'
        : complexity === 'wild'
          ? 'Spicy mode pushes toward brighter colors, denser tension, and more movement.'
          : 'Higher rolls add a little more color and motion.',
    ],
    rollSummary: values.map((value, index) => `Die ${index + 1} rolled ${value} on d${config.faceCounts[index] ?? 6}`),
    source: 'guided',
    keyCenter,
  }
}

function advancedProgression(
  values: Record<AdvancedParameter, number>,
  config: AdvancedDiceConfig,
  complexity: ChordComplexity,
): ProgressionResult {
  const keyCenter = chooseKeyCenter(values.roots + values.extensions + (complexity === 'wild' ? values.qualities : 0))
  const preferFlat = keyCenter.includes('b')
  const pattern = ROOT_PATTERNS[(values.roots - 1) % ROOT_PATTERNS.length] ?? ROOT_PATTERNS[0]
  const qualityOffset = values.qualities - 1
  const extensionOffset = values.extensions - 1
  const inversionOffset = values.inversions - 1
  const rhythmOffset = values.rhythm - 1
  const qualityPool = COMPLEXITY_QUALITY_POOLS[complexity]
  const extensionPool = COMPLEXITY_EXTENSION_POOLS[complexity]
  const inversionCycle = complexity === 'wild' ? 4 : complexity === 'basic' ? 1 : 3

  const chords = Array.from({ length: config.chordCount }, (_, index) => {
    const rootStep = pattern[index % pattern.length] ?? 0
    const root = pickRoot(keyCenter, rootStep, preferFlat)
    const quality = qualityPool[(qualityOffset + index) % qualityPool.length] ?? 'maj'
    const extensions = extensionPool[(extensionOffset + index) % extensionPool.length] ?? []
    const inversion = Math.max(0, (inversionOffset + index) % inversionCycle)
    const rhythmBeats = pickRhythm(rhythmOffset, index, complexity)

    return createChordDescriptor({
      id: `advanced-${index}-${values.roots}-${values.qualities}`,
      root,
      quality,
      extensions,
      inversion,
      rhythmBeats,
      source: 'advanced',
      explanation: [
        `Root die chose pattern ${ROOT_PATTERNS.indexOf(pattern) + 1}`,
        `Quality die pushed toward ${quality}`,
        `Extension die colored this chord with ${extensions.length > 0 ? extensions.join(' + ') : 'pure triad weight'}`,
      ],
    })
  })

  return {
    chords,
    explanation: [
      'Each die pushed a different part of this idea.',
      complexity === 'basic'
        ? 'Easy mode keeps the harmony more direct and less crowded.'
        : complexity === 'wild'
          ? 'Spicy mode leans into stranger colors, denser tension, and twistier motion.'
          : 'One die steered the path while the others added color, inversion, and pulse.',
    ],
    rollSummary: ADVANCED_PARAMETERS.map(
      (parameter) => `${parameter}: ${values[parameter]} on d${config.faceCounts[parameter]}`,
    ),
    source: 'advanced',
    keyCenter,
  }
}

export function createGuidedRoll(config: GuidedDiceConfig, complexity: ChordComplexity = 'balanced'): GuidedRollResult {
  const values = config.faceCounts.map((faceCount) => randomDie(faceCount))
  return createGuidedRollFromValues(config, values, complexity)
}

export function createGuidedRollFromValues(
  config: GuidedDiceConfig,
  values: number[],
  complexity: ChordComplexity = 'balanced',
): GuidedRollResult {
  const normalizedValues = config.faceCounts.map((faceCount, index) => normalizeDieValue(values[index] ?? 1, faceCount))

  return {
    config,
    values: normalizedValues,
    progression: guidedProgression(normalizedValues, config, complexity),
  }
}

export function createAdvancedRoll(config: AdvancedDiceConfig, complexity: ChordComplexity = 'balanced'): AdvancedRollResult {
  const faces = { ...DEFAULT_ADVANCED_FACES, ...config.faceCounts }
  const values = ADVANCED_PARAMETERS.reduce<Record<AdvancedParameter, number>>((carry, parameter) => {
    carry[parameter] = randomDie(faces[parameter])
    return carry
  }, {
    roots: 1,
    qualities: 1,
    extensions: 1,
    inversions: 1,
    rhythm: 1,
  })

  return createAdvancedRollFromValues(config, values, complexity)
}

export function createAdvancedRollFromValues(
  config: AdvancedDiceConfig,
  values: Record<AdvancedParameter, number>,
  complexity: ChordComplexity = 'balanced',
): AdvancedRollResult {
  const faces = { ...DEFAULT_ADVANCED_FACES, ...config.faceCounts }
  const normalizedValues = ADVANCED_PARAMETERS.reduce<Record<AdvancedParameter, number>>((carry, parameter) => {
    carry[parameter] = normalizeDieValue(values[parameter] ?? 1, faces[parameter])
    return carry
  }, {
    roots: 1,
    qualities: 1,
    extensions: 1,
    inversions: 1,
    rhythm: 1,
  })

  return {
    config: {
      chordCount: config.chordCount,
      faceCounts: faces,
    },
    values: normalizedValues,
    progression: advancedProgression(normalizedValues, {
      chordCount: config.chordCount,
      faceCounts: faces,
    }, complexity),
  }
}

export function createGuidedPreset(faceCounts: number[]): GuidedDiceConfig {
  return { faceCounts }
}

export function createAdvancedPreset(chordCount: number, faceCounts: Partial<Record<AdvancedParameter, number>>): AdvancedDiceConfig {
  return {
    chordCount,
    faceCounts: {
      ...DEFAULT_ADVANCED_FACES,
      ...faceCounts,
    },
  }
}

export function formatKeyBadge(root: RootNote): string {
  const noteIndex = SHARP_NOTES.findIndex((note) => note === root)
  return noteIndex >= 0 ? `${root} center` : `${root} tonal center`
}

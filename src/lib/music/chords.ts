import { FLAT_NOTES, SHARP_NOTES } from './constants'
import type { ChordDescriptor, ChordQuality, ChordSeed, ExtensionToken, RootNote } from './types'

const NOTE_TO_PITCH: Record<RootNote, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
}

const QUALITY_INTERVALS: Record<ChordQuality, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dom: [0, 4, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
}

const EXTENSION_INTERVALS: Record<ExtensionToken, number[]> = {
  '6': [9],
  '7': [10],
  maj7: [11],
  '9': [14],
  '11': [17],
  '13': [21],
  b9: [13],
  '#9': [15],
  '#11': [18],
  b13: [20],
  add9: [14],
  add11: [17],
  add13: [21],
}

const QUALITY_LABEL: Record<ChordQuality, string> = {
  maj: '',
  min: 'm',
  dom: '',
  dim: 'dim',
  aug: 'aug',
  sus2: 'sus2',
  sus4: 'sus4',
}

const TENSION_PRIORITY: Record<ExtensionToken, number> = {
  '6': 1,
  '7': 2,
  maj7: 2,
  '9': 3,
  '11': 4,
  '13': 5,
  b9: 6,
  '#9': 7,
  '#11': 8,
  b13: 9,
  add9: 10,
  add11: 11,
  add13: 12,
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].toSorted((left, right) => left - right)
}

function seventhIntervalForQuality(quality: ChordQuality): number {
  if (quality === 'maj') {
    return 11
  }

  if (quality === 'dim') {
    return 9
  }

  return 10
}

function prefersFlats(note: RootNote): boolean {
  return note.includes('b')
}

const FLAT_KEY_PITCHES = new Set([5, 10, 3, 8, 1, 6])

/** F, Bb, Eb, Ab, Db, and Gb are written with flats. */
export function keyUsesFlats(key: RootNote): boolean {
  return FLAT_KEY_PITCHES.has(NOTE_TO_PITCH[key])
}

export function toPitchClass(note: RootNote): number {
  return NOTE_TO_PITCH[note]
}

export function fromPitchClass(pitchClass: number, preferFlat = false): RootNote {
  const normalized = ((pitchClass % 12) + 12) % 12
  return (preferFlat ? FLAT_NOTES : SHARP_NOTES)[normalized]
}

export function normalizeEnharmonic(note: RootNote, preferFlat = false): RootNote {
  return fromPitchClass(toPitchClass(note), preferFlat)
}

export function buildIntervals(quality: ChordQuality, extensions: ExtensionToken[]): number[] {
  const intervals = [...QUALITY_INTERVALS[quality]]
  const needsContextualSeventh = extensions.some((extension) =>
    extension === '9' || extension === '11' || extension === '13' || extension === 'b9' || extension === '#9' || extension === '#11' || extension === 'b13',
  )

  if (needsContextualSeventh && !extensions.includes('7') && !extensions.includes('maj7')) {
    intervals.push(seventhIntervalForQuality(quality))
  }

  for (const extension of extensions) {
    if (extension === '7' && quality === 'maj') {
      intervals.push(10)
      continue
    }

    if (extension === '7' && quality === 'dim') {
      intervals.push(9)
      continue
    }

    intervals.push(...EXTENSION_INTERVALS[extension])
  }

  return uniqueSorted(intervals)
}

function applyBassVoice(midi: number[], bass: RootNote | undefined, preferFlat: boolean): number[] {
  if (!bass) {
    return midi
  }

  const bassMidi = 36 + toPitchClass(normalizeEnharmonic(bass, preferFlat))
  return uniqueSorted([bassMidi, ...midi])
}

function applyInversion(midi: number[], inversion: number): number[] {
  if (midi.length === 0) {
    return midi
  }

  const voiced = [...midi]
  const turns = Math.max(0, inversion)

  for (let index = 0; index < turns; index += 1) {
    const first = voiced.shift()
    if (typeof first === 'number') {
      voiced.push(first + 12)
    }
  }

  return voiced
}

export function extensionSummary(extensions: ExtensionToken[]): string {
  if (extensions.length === 0) {
    return 'triad'
  }

  return [...extensions]
    .toSorted((left, right) => TENSION_PRIORITY[left] - TENSION_PRIORITY[right])
    .join(', ')
}

export function createChordLabel(root: RootNote, quality: ChordQuality, extensions: ExtensionToken[], bass?: RootNote): string {
  const sortedExtensions = extensions.toSorted((left, right) => TENSION_PRIORITY[left] - TENSION_PRIORITY[right])
  const extensionPart = sortedExtensions
    .map((extension) => (extension === 'maj7' && quality !== 'maj' ? '(maj7)' : extension))
    .join('')
  const impliesMajorStack =
    quality === 'maj' &&
    !extensions.includes('maj7') &&
    (extensions.includes('9') || extensions.includes('11') || extensions.includes('13'))
  const qualityPart =
    (quality === 'dom' && extensionPart.length > 0) || (quality === 'maj' && extensions.includes('maj7'))
      ? ''
      : impliesMajorStack
        ? 'maj'
        : QUALITY_LABEL[quality]
  const label = `${root}${qualityPart}${extensionPart}`

  if (!bass) {
    return label
  }

  return `${label}/${bass}`
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
const LETTER_PITCH = [0, 2, 4, 5, 7, 9, 11]

/** How many letter names above the root an interval sits (a 3rd is 2, a 5th is 4). */
function letterSteps(interval: number, quality: ChordQuality, extensions: ExtensionToken[]): number {
  switch (interval) {
    case 0:
      return 0
    case 2:
    case 13:
    case 14:
    case 15:
      return 1
    case 3:
    case 4:
      return 2
    case 5:
    case 17:
    case 18:
      return 3
    case 6:
    case 7:
    case 8:
      return 4
    case 9:
      return quality === 'dim' && !extensions.includes('6') ? 6 : 5
    case 20:
    case 21:
      return 5
    default:
      return 6
  }
}

/** Spells a chord tone by letter, so Gm gets Bb rather than A#. Returns null when that needs a double accidental. */
function spellInterval(root: RootNote, interval: number, steps: number): RootNote | null {
  const rootLetter = LETTERS.indexOf(root[0] as (typeof LETTERS)[number])
  const letterIndex = (rootLetter + steps) % 7
  const pitch = (toPitchClass(root) + interval) % 12
  const drift = ((pitch - LETTER_PITCH[letterIndex]! + 18) % 12) - 6

  if (drift === 0) {
    return LETTERS[letterIndex]!
  }

  if (drift === 1 || drift === -1) {
    const spelled = `${LETTERS[letterIndex]}${drift === 1 ? '#' : 'b'}` as RootNote
    return spelled in NOTE_TO_PITCH ? spelled : null
  }

  return null
}

export function createChordDescriptor(seed: ChordSeed): ChordDescriptor {
  const preferFlat = seed.flats ?? (prefersFlats(seed.root) || (seed.bass ? prefersFlats(seed.bass) : false))
  const rootPitch = toPitchClass(normalizeEnharmonic(seed.root, preferFlat))
  const intervals = buildIntervals(seed.quality, seed.extensions)
  const baseMidi = intervals.map((interval) => 48 + rootPitch + interval)
  const withBass = applyBassVoice(baseMidi, seed.bass, preferFlat)
  const midi = applyInversion(withBass, seed.inversion ?? 0)
  const spelling = new Map<number, RootNote>()
  const spelledRoot = normalizeEnharmonic(seed.root, preferFlat)

  for (const interval of intervals) {
    const name = spellInterval(spelledRoot, interval, letterSteps(interval, seed.quality, seed.extensions))

    if (name) {
      spelling.set((rootPitch + interval) % 12, name)
    }
  }

  if (seed.bass) {
    spelling.set(toPitchClass(seed.bass), normalizeEnharmonic(seed.bass, preferFlat))
  }

  const notes = midi.map((note) => spelling.get(note % 12) ?? fromPitchClass(note, preferFlat))

  return {
    ...seed,
    inversion: seed.inversion ?? 0,
    rhythmBeats: seed.rhythmBeats ?? 1,
    label: createChordLabel(seed.root, seed.quality, seed.extensions, seed.bass),
    notes,
    midi,
  }
}


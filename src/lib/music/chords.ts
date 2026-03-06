import { FLAT_NOTES, RHYTHM_LABELS, SHARP_NOTES } from './constants'
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
    return 'triad glow'
  }

  return [...extensions]
    .toSorted((left, right) => TENSION_PRIORITY[left] - TENSION_PRIORITY[right])
    .join(' · ')
}

export function createChordLabel(root: RootNote, quality: ChordQuality, extensions: ExtensionToken[], bass?: RootNote): string {
  const extensionPart = extensions
    .toSorted((left, right) => TENSION_PRIORITY[left] - TENSION_PRIORITY[right])
    .join('')
  const impliesMajorStack =
    quality === 'maj' &&
    !extensions.includes('maj7') &&
    (extensions.includes('9') || extensions.includes('11') || extensions.includes('13'))
  const qualityPart =
    quality === 'dom' && extensionPart.length > 0
      ? ''
      : quality === 'maj' && (extensions.includes('maj7') || impliesMajorStack)
        ? 'maj'
        : QUALITY_LABEL[quality]
  const label = `${root}${qualityPart}${extensionPart}`

  if (!bass) {
    return label
  }

  return `${label}/${bass}`
}

export function createChordDescriptor(seed: ChordSeed): ChordDescriptor {
  const preferFlat = prefersFlats(seed.root) || (seed.bass ? prefersFlats(seed.bass) : false)
  const rootPitch = toPitchClass(normalizeEnharmonic(seed.root, preferFlat))
  const intervals = buildIntervals(seed.quality, seed.extensions)
  const baseMidi = intervals.map((interval) => 48 + rootPitch + interval)
  const withBass = applyBassVoice(baseMidi, seed.bass, preferFlat)
  const midi = applyInversion(withBass, seed.inversion ?? 0)
  const notes = midi.map((note) => fromPitchClass(note, preferFlat))

  return {
    ...seed,
    inversion: seed.inversion ?? 0,
    rhythmBeats: seed.rhythmBeats ?? 1,
    label: createChordLabel(seed.root, seed.quality, seed.extensions, seed.bass),
    notes,
    midi,
  }
}

export function describeChord(chord: ChordDescriptor): string {
  const rhythmicText = RHYTHM_LABELS[chord.rhythmBeats] ?? `${chord.rhythmBeats} beats`
  const inversionText = chord.inversion > 0 ? ` · inversion ${chord.inversion}` : ''
  return `${chord.label} · ${extensionSummary(chord.extensions)} · ${rhythmicText}${inversionText}`
}

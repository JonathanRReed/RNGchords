import type { FaceLabel } from '../lib/dice3d/labels'
import { fromPitchClass, keyUsesFlats, toPitchClass } from '../lib/music/chords'
import type { AdvancedParameter, ChordDescriptor, ChordQuality, RootNote } from '../lib/music/types'

export function totalBeats(chords: ChordDescriptor[]): number {
  return chords.reduce((sum, chord) => sum + chord.rhythmBeats, 0)
}

export function formatDuration(beats: number, tempo: number): string {
  return `${((beats * 60) / tempo).toFixed(1)} sec`
}

/**
 * A chord name laid out for a die face. Short names sit on one line. Longer
 * ones split after the root, so `Bbm(maj7)` reads `Bbm` over `(maj7)`.
 */
export function dieFace(chord: ChordDescriptor): FaceLabel {
  if (chord.label.length <= 5) {
    return { main: chord.label }
  }

  const rest = chord.label.slice(chord.root.length)
  const minor = rest.startsWith('m') && !rest.startsWith('maj') ? 'm' : ''
  return { main: `${chord.root}${minor}`, sub: rest.slice(minor.length) }
}

/** The die face as one line of text, for the flat dice and for screen readers. */
export function faceText(face: FaceLabel): string {
  return `${face.main}${face.sub ?? ''}`
}

const SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11]
const SCALE_SUFFIXES = ['', 'm', 'm', '', '7', 'm', 'dim', 'maj7', 'm7', 'm7', '6', '9', 'm9', 'sus4']

/**
 * What the rest of a chord die says: other chords from the same key. Only the
 * face that lands up is the roll; these are there because a die has more than
 * one side.
 */
export function chordDieOthers(keyCenter: RootNote, sides: number, skip: string): FaceLabel[] {
  const flats = keyUsesFlats(keyCenter)
  const start = toPitchClass(keyCenter)
  const faces: FaceLabel[] = []

  for (let index = 0; faces.length < sides - 1 && index < sides * 2; index += 1) {
    const root = fromPitchClass(start + SCALE_STEPS[index % SCALE_STEPS.length]!, flats)
    const main = `${root}${SCALE_SUFFIXES[index % SCALE_SUFFIXES.length]}`

    if (main !== skip) {
      faces.push(main.length <= 5 ? { main } : { main: root, sub: main.slice(root.length) })
    }
  }

  return faces
}

const PARAMETER_FACES: Record<Exclude<AdvancedParameter, 'roots'>, string[]> = {
  qualities: ['maj', 'm', 'dom', 'dim', 'aug', 'sus4', 'sus2'],
  extensions: ['triad', '6', '7', 'maj7', '9', '11', '13', 'b9', '#9', '#11', 'b13', 'add9'],
  inversions: ['root', '1st', '2nd', '3rd'],
  rhythm: ['½', '1', '1½', '2', '3', '4'],
}

/** The other faces of an advanced die: the rest of what that die can decide. */
export function parameterDieOthers(parameter: AdvancedParameter, keyCenter: RootNote, sides: number, skip: string): FaceLabel[] {
  const flats = keyUsesFlats(keyCenter)
  const pool =
    parameter === 'roots' ? SCALE_STEPS.map((step) => fromPitchClass(toPitchClass(keyCenter) + step, flats) as string) : PARAMETER_FACES[parameter]
  const choices = pool.filter((entry) => entry !== skip)
  return Array.from({ length: sides - 1 }, (_, index) => ({ main: choices[index % choices.length] ?? '' }))
}

const QUALITY_FACE: Record<ChordQuality, string> = {
  maj: 'maj',
  min: 'm',
  dom: 'dom',
  dim: 'dim',
  aug: 'aug',
  sus2: 'sus2',
  sus4: 'sus4',
}

const RUN_LENGTH = 4

function faceToken(parameter: AdvancedParameter, chord: ChordDescriptor): string {
  switch (parameter) {
    case 'roots':
      return chord.root
    case 'qualities':
      return QUALITY_FACE[chord.quality]
    case 'extensions':
      return chord.extensions.length > 0 ? chord.extensions.join('') : 'triad'
    case 'inversions':
      return chord.inversion > 0 && chord.notes[0] ? `/${chord.notes[0]}` : 'root'
    case 'rhythm':
      return chord.rhythmBeats === 0.5 ? '½' : String(chord.rhythmBeats)
  }
}

/**
 * What an advanced die has decided, written the way a musician would read it
 * off a chord die: a root letter, a quality, an extension, a bass note, a beat
 * count. The face shows the first chord's piece and `run` lists the next few.
 */
export function formatAdvancedFace(parameter: AdvancedParameter, chords: ChordDescriptor[]): { face: string; run: string } {
  const tokens = chords.slice(0, RUN_LENGTH).map((chord) => faceToken(parameter, chord))
  const run = parameter === 'inversions' ? tokens.map((token) => (token === 'root' ? '–' : token)) : tokens
  return { face: tokens[0] ?? '', run: run.join(' ') }
}

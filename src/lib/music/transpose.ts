import { createChordDescriptor, fromPitchClass, keyUsesFlats, toPitchClass } from './chords'
import type { ChordDescriptor, ProgressionResult, RootNote } from './types'

export const KEY_CHOICES: readonly RootNote[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

function spellKey(pitchClass: number): RootNote {
  const normalized = ((pitchClass % 12) + 12) % 12
  return fromPitchClass(normalized, keyUsesFlats(fromPitchClass(normalized, true)))
}

function shiftNote(note: RootNote, semitones: number, preferFlat: boolean): RootNote {
  return fromPitchClass(toPitchClass(note) + semitones, preferFlat)
}

export function transposeChord(chord: ChordDescriptor, semitones: number, preferFlat: boolean): ChordDescriptor {
  return createChordDescriptor({
    id: chord.id,
    flats: preferFlat,
    root: shiftNote(chord.root, semitones, preferFlat),
    quality: chord.quality,
    extensions: chord.extensions,
    bass: chord.bass ? shiftNote(chord.bass, semitones, preferFlat) : undefined,
    inversion: chord.inversion,
    rhythmBeats: chord.rhythmBeats,
    source: chord.source,
    explanation: chord.explanation,
  })
}

export function transposeProgression(progression: ProgressionResult, semitones: number): ProgressionResult {
  if (semitones === 0) {
    return progression
  }

  const pitchClass = (toPitchClass(progression.keyCenter) + semitones + 12) % 12
  const keyCenter = spellKey(pitchClass)
  const preferFlat = keyUsesFlats(keyCenter)
  const chords = progression.chords.map((chord) => transposeChord(chord, semitones, preferFlat))

  return {
    ...progression,
    chords,
    keyCenter,
    rollSummary: chords.map((chord, index) => `Chord ${index + 1}: ${chord.label}`),
  }
}

/** Takes the shortest move to the target key, so a key change never jumps an octave. */
export function transposeToKey(progression: ProgressionResult, target: RootNote): ProgressionResult {
  const raw = (toPitchClass(target) - toPitchClass(progression.keyCenter) + 12) % 12
  return transposeProgression(progression, raw > 6 ? raw - 12 : raw)
}

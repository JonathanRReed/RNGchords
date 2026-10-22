import { toPitchClass } from './chords'
import type { ChordDescriptor, ProgressionResult } from './types'

function joinNames(names: string[]): string {
  if (names.length <= 1) {
    return names.join('')
  }

  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

function sharedNotes(a: ChordDescriptor, b: ChordDescriptor): string[] {
  const other = new Set(b.notes.map(toPitchClass))
  return [...new Set(a.notes.filter((note) => other.has(toPitchClass(note))))]
}

function commonToneNote(chords: ChordDescriptor[]): string | null {
  let best: { from: ChordDescriptor; to: ChordDescriptor; shared: string[] } | null = null

  for (let index = 0; index < chords.length - 1; index += 1) {
    const from = chords[index]
    const to = chords[index + 1]

    if (!from || !to || from.label === to.label) {
      continue
    }

    const shared = sharedNotes(from, to)

    if (!best || shared.length > best.shared.length) {
      best = { from, to, shared }
    }
  }

  if (!best) {
    return null
  }

  if (best.shared.length === 0) {
    return `${best.from.label} and ${best.to.label} share no notes, so that change will sound like a jump.`
  }

  return `${best.from.label} and ${best.to.label} both contain ${joinNames(best.shared)}. Hold ${best.shared.length === 1 ? 'it' : 'them'} through the change and the move gets smoother.`
}

function bassNote(chords: ChordDescriptor[]): string | null {
  const names = chords.map((chord) => chord.bass ?? chord.root)

  if (names.length < 3) {
    return null
  }

  if (new Set(names.map(toPitchClass)).size === 1) {
    return `The bass never leaves ${names[0]}, so everything above it changes while the floor stays put.`
  }

  return `Play only the bass notes (${names.join(', ')}) to hear the skeleton of the progression.`
}

function endingNote(progression: ProgressionResult): string | null {
  const last = progression.chords.at(-1)

  if (!last || progression.chords.length < 2) {
    return null
  }

  const home = toPitchClass(progression.keyCenter)

  if (toPitchClass(last.bass ?? last.root) === home) {
    return `It ends on ${last.label}, back on the key note of ${progression.keyCenter}. That sounds finished.`
  }

  return `It ends on ${last.label}, away from the key note of ${progression.keyCenter}. That sounds unfinished, which makes it loop well.`
}

function colorNote(chords: ChordDescriptor[]): string | null {
  const richest = chords.reduce<ChordDescriptor | null>(
    (best, chord) => (chord.notes.length > (best?.notes.length ?? 0) ? chord : best),
    null,
  )

  if (!richest || richest.notes.length < 5) {
    return null
  }

  return `${richest.label} has ${richest.notes.length} notes. If it sounds crowded, drop the one in the middle and keep the root and the top note.`
}

export function describeProgression(progression: ProgressionResult): string[] {
  const { chords } = progression

  if (chords.length === 0) {
    return []
  }

  return [commonToneNote(chords), endingNote(progression), bassNote(chords), colorNote(chords)]
    .filter((note): note is string => note !== null)
    .slice(0, 3)
}

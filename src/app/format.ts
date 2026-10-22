import type { ChordDescriptor, ChordQuality, ProgressionResult } from '../lib/music/types'

const DIE_QUALITY_SUFFIX: Record<ChordQuality, string> = {
  maj: '',
  min: 'm',
  dom: '7',
  dim: 'dim',
  aug: 'aug',
  sus2: 'sus2',
  sus4: 'sus4',
}

const SOURCE_LABELS: Record<ProgressionResult['source'], string> = {
  guided: 'Easy roll',
  advanced: 'Advanced roll',
  'manual-builder': 'Built by hand',
  'manual-text': 'Typed in',
}

export function totalBeats(chords: ChordDescriptor[]): number {
  return chords.reduce((sum, chord) => sum + chord.rhythmBeats, 0)
}

export function formatDuration(beats: number, tempo: number): string {
  return `${((beats * 60) / tempo).toFixed(1)} sec`
}

export function formatSource(source: ProgressionResult['source']): string {
  return SOURCE_LABELS[source]
}

/** A short chord name that fits on a die face. */
export function formatDieChord(chord: ChordDescriptor): string {
  if (chord.label.length <= 9) {
    return chord.label
  }

  const base = `${chord.root}${DIE_QUALITY_SUFFIX[chord.quality]}`
  const [lead] = chord.extensions

  if (!lead) {
    return base
  }

  const compact = lead.startsWith('add') ? lead.replace('add', '+') : lead
  return `${base}${compact}${chord.extensions.length > 1 ? '…' : ''}`
}

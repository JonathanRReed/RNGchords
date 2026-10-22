import type { AdvancedParameter, ChordDescriptor, ChordQuality, ProgressionResult } from '../lib/music/types'

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

function spellAccidentals(token: string): string {
  return token.replace(/^b/, '♭').replace(/^#/, '♯')
}

function faceToken(parameter: AdvancedParameter, chord: ChordDescriptor): string {
  switch (parameter) {
    case 'roots':
      return chord.root
    case 'qualities':
      return QUALITY_FACE[chord.quality]
    case 'extensions':
      return chord.extensions.length > 0 ? chord.extensions.map(spellAccidentals).join('') : 'triad'
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
  return { face: tokens[0] ?? '', run: run.join(' · ') }
}

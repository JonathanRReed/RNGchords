import type { PlaybackInstrument } from '../lib/audio/playback'
import { createChordDescriptor } from '../lib/music/chords'
import { RHYTHM_OPTIONS } from '../lib/music/constants'
import { RHYTHM_FEEL_COPY, type RhythmFeel } from '../lib/music/ideas'
import { parseChordSymbol } from '../lib/music/parser'
import type { ChordDescriptor } from '../lib/music/types'
import { INSTRUMENT_OPTIONS, MAX_TEMPO, MIN_TEMPO } from './constants'

const MAX_SHARED_CHORDS = 16

export interface SharedIdea {
  chords: ChordDescriptor[]
  tempo: number | null
  instrument: PlaybackInstrument | null
  feel: RhythmFeel | null
}

/** One chord as text: the symbol, then @beats and ^inversion when they differ from the defaults. */
function encodeChord(chord: ChordDescriptor): string {
  const beats = chord.rhythmBeats === 1 ? '' : `@${chord.rhythmBeats}`
  const inversion = chord.inversion > 0 ? `^${chord.inversion}` : ''
  return `${chord.label}${beats}${inversion}`
}

export function encodeShare(chords: ChordDescriptor[], tempo: number, instrument: PlaybackInstrument, feel: RhythmFeel): string {
  const params = new URLSearchParams()
  params.set('chords', chords.map(encodeChord).join('~'))
  params.set('bpm', String(tempo))
  params.set('sound', instrument)
  params.set('feel', feel)
  return params.toString()
}

function decodeChord(entry: string, index: number): ChordDescriptor | null {
  const match = entry.match(/^([^@^]+)(?:@([\d.]+))?(?:\^(\d))?$/)

  if (!match) {
    return null
  }

  const [, symbol, rawBeats, rawInversion] = match

  try {
    const parsed = parseChordSymbol(symbol, index, 'manual-text')
    const beats = Number(rawBeats)

    return createChordDescriptor({
      ...parsed,
      rhythmBeats: RHYTHM_OPTIONS.includes(beats) ? beats : 1,
      inversion: rawInversion ? Math.min(3, Number(rawInversion)) : 0,
    })
  } catch {
    return null
  }
}

export function decodeShare(hash: string): SharedIdea | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const raw = params.get('chords')

  if (!raw) {
    return null
  }

  const chords = raw
    .split('~')
    .slice(0, MAX_SHARED_CHORDS)
    .map(decodeChord)
    .filter((chord): chord is ChordDescriptor => chord !== null)

  if (chords.length === 0) {
    return null
  }

  const tempo = Number(params.get('bpm'))
  const instrument = params.get('sound')
  const feel = params.get('feel')

  return {
    chords,
    tempo: Number.isFinite(tempo) && tempo >= MIN_TEMPO && tempo <= MAX_TEMPO ? Math.round(tempo) : null,
    instrument: INSTRUMENT_OPTIONS.find((option) => option === instrument) ?? null,
    feel: feel && feel in RHYTHM_FEEL_COPY ? (feel as RhythmFeel) : null,
  }
}

/** Plain-text chart for pasting into notes or a chat: "Dm7  G7  Cmaj7". */
export function formatChart(chords: ChordDescriptor[]): string {
  return chords.map((chord) => chord.label).join('  ')
}

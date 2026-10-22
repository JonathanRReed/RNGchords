import { describe, expect, it } from 'vitest'
import { DEFAULT_APPEARANCE, parseAppearance, readLegacyTheme, resolveFlip } from '../src/app/appearance'
import { createInitialState, readSession } from '../src/app/session'
import { encodeShare, decodeShare } from '../src/app/share'
import { createChordDescriptor, toPitchClass } from '../src/lib/music/chords'
import { createGuidedRollFromValues } from '../src/lib/music/generator'
import { transposeProgression, transposeToKey } from '../src/lib/music/transpose'
import { getDieAnimation } from '../src/lib/dice/flips'
import { parseChordSymbol } from '../src/lib/music/parser'

describe('appearance settings', () => {
  it('falls back to defaults for missing or broken storage', () => {
    expect(parseAppearance(null)).toEqual(DEFAULT_APPEARANCE)
    expect(parseAppearance('{nope')).toEqual(DEFAULT_APPEARANCE)
  })

  it('keeps valid choices and drops unknown ones', () => {
    const parsed = parseAppearance(JSON.stringify({ colorMode: 'dark', theme: 'pads', font: 'dyslexic', flip: 'coin', sound: false }))
    expect(parsed).toEqual({ colorMode: 'dark', theme: 'pads', font: 'dyslexic', flip: 'coin', sound: false })

    const bad = parseAppearance(JSON.stringify({ colorMode: 'neon', theme: 'plaid', font: 'comic', flip: 'spin' }))
    expect(bad).toEqual(DEFAULT_APPEARANCE)
  })

  it('maps the old table colors to the new themes', () => {
    expect(readLegacyTheme(JSON.stringify({ tableTheme: 'crimson' }))).toBe('velvet')
    expect(readLegacyTheme(JSON.stringify({ tableTheme: 'unknown' }))).toBeNull()
    expect(readLegacyTheme('not json')).toBeNull()
  })

  it('turns the flip off under reduced motion unless the player chose one', () => {
    expect(resolveFlip({ ...DEFAULT_APPEARANCE, flip: null }, true)).toBe('none')
    expect(resolveFlip({ ...DEFAULT_APPEARANCE, flip: null }, false)).not.toBe('none')
    expect(resolveFlip({ ...DEFAULT_APPEARANCE, flip: 'drop' }, true)).toBe('drop')
  })
})

describe('roll animations', () => {
  it('has no animation for the instant option', () => {
    expect(getDieAnimation('none', 0)).toBeNull()
  })

  it('only animates transform and opacity', () => {
    const animation = getDieAnimation('tumble', 1)
    expect(animation).not.toBeNull()

    for (const frame of animation?.keyframes ?? []) {
      expect(Object.keys(frame).filter((key) => !['transform', 'opacity', 'offset', 'easing'].includes(key))).toEqual([])
    }
  })
})

describe('saved sessions', () => {
  it('rejects data without a progression', () => {
    expect(readSession(null)).toBeNull()
    expect(readSession(JSON.stringify({ tempo: 120 }))).toBeNull()
  })

  it('fills gaps from defaults', () => {
    const base = createInitialState()
    const restored = readSession(JSON.stringify({ progression: base.progression, tempo: 101, mode: 'bogus' }))

    expect(restored?.tempo).toBe(101)
    expect(restored?.mode).toBe('guided')
    expect(restored?.sections.A).toBeNull()
  })
})

describe('chord symbols', () => {
  it('keeps maj7 as a major seventh', () => {
    const chord = parseChordSymbol('Cmaj7')
    expect(chord.label).toBe('Cmaj7')
    expect(chord.notes).toContain('B')
    expect(chord.notes).not.toContain('Bb')
  })

  it('round-trips minor-major sevenths', () => {
    const chord = parseChordSymbol('Cm(maj7)')
    expect(chord.label).toBe('Cm(maj7)')
    expect(parseChordSymbol(chord.label).midi).toEqual(chord.midi)
  })
})

describe('transposing', () => {
  const base = createGuidedRollFromValues({ faceCounts: [6, 6, 6, 6] }, [3, 5, 4, 6], 'balanced').progression

  it('moves every chord and the key by the same amount', () => {
    const up = transposeProgression(base, 2)

    expect(up.chords).toHaveLength(base.chords.length)
    base.chords.forEach((chord, index) => {
      const moved = up.chords[index]
      expect((toPitchClass(moved.root) - toPitchClass(chord.root) + 12) % 12).toBe(2)
      expect(moved.quality).toBe(chord.quality)
    })
    expect((toPitchClass(up.keyCenter) - toPitchClass(base.keyCenter) + 12) % 12).toBe(2)
  })

  it('returns to the start after a full octave of half steps', () => {
    let current = base
    for (let step = 0; step < 12; step += 1) {
      current = transposeProgression(current, 1)
    }

    expect(current.chords.map((chord) => chord.label)).toEqual(base.chords.map((chord) => chord.label))
  })

  it('lands in the requested key and spells flat keys with flats', () => {
    const inBb = transposeToKey(base, 'Bb')

    expect(inBb.keyCenter).toBe('Bb')
    expect(inBb.chords.flatMap((chord) => chord.notes).some((note) => note.includes('#'))).toBe(false)
  })
})

describe('shared links', () => {
  it('round-trips chords, beats, tempo, sound, and feel', () => {
    const chords = ['Dm7', 'G7', 'Cmaj7', 'Am(maj7)/E'].map((symbol, index) => parseChordSymbol(symbol, index))
    chords[1] = createChordDescriptor({ ...chords[1], rhythmBeats: 2 })

    const decoded = decodeShare(encodeShare(chords, 104, 'soft-organ', 'lazy'))

    expect(decoded?.chords.map((chord) => chord.label)).toEqual(chords.map((chord) => chord.label))
    expect(decoded?.chords[1]?.rhythmBeats).toBe(2)
    expect(decoded?.tempo).toBe(104)
    expect(decoded?.instrument).toBe('soft-organ')
    expect(decoded?.feel).toBe('lazy')
  })

  it('ignores links that carry no usable chords or out-of-range values', () => {
    expect(decodeShare('')).toBeNull()
    expect(decodeShare('#chords=nonsense~alsobad')).toBeNull()
    expect(decodeShare('#chords=C&bpm=900')?.tempo).toBeNull()
  })
})

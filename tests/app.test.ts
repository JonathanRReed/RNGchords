import { describe, expect, it } from 'vitest'
import { DEFAULT_APPEARANCE, parseAppearance, readLegacyTheme, resolveFlip } from '../src/app/appearance'
import { createInitialState, readSession } from '../src/app/session'
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

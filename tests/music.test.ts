import { afterEach, describe, expect, it, vi } from 'vitest'
import { createChordDescriptor } from '../src/lib/music/chords'
import { createAdvancedRoll, createAdvancedRollFromValues, createGuidedRoll } from '../src/lib/music/generator'
import { parseChordSymbol, parseProgressionInput } from '../src/lib/music/parser'

describe('music parsing and normalization', () => {
  it('parses explicit major tensions like Cmaj9', () => {
    const chord = parseChordSymbol('Cmaj9')

    expect(chord.label).toBe('Cmaj9')
    expect(chord.notes).toContain('E')
    expect(chord.notes).toContain('B')
    expect(chord.notes).toContain('D')
  })

  it('parses dominant alterations and slash bass notes', () => {
    const chord = parseChordSymbol('F#7b9/A#')

    expect(chord.label).toBe('F#7b9/A#')
    expect(chord.notes[0]).toBe('A#')
    expect(chord.notes).toContain('G')
  })

  it('collects unsupported symbols as issues', () => {
    const parsed = parseProgressionInput('Cmaj7, H13, Bb13')

    expect(parsed.chords).toHaveLength(2)
    expect(parsed.issues).toHaveLength(1)
    expect(parsed.issues[0]).toMatch('Unsupported chord symbol')
  })

  it('builds chord descriptors from manual builder inputs', () => {
    const chord = createChordDescriptor({
      id: 'builder-1',
      root: 'Bb',
      quality: 'min',
      extensions: ['11', 'add13'],
      inversion: 1,
      rhythmBeats: 2,
      source: 'manual-builder',
    })

    expect(chord.label).toBe('Bbm11add13')
    expect(chord.rhythmBeats).toBe(2)
    expect(chord.notes).toContain('Bb')
  })
})

describe('dice generation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a guided progression with one chord per die', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.75)
      .mockReturnValueOnce(0.25)

    const result = createGuidedRoll({ faceCounts: [6, 8, 10, 12] })

    expect(result.values).toEqual([1, 5, 8, 4])
    expect(result.progression.chords).toHaveLength(4)
    expect(result.progression.source).toBe('guided')
  })

  it('creates advanced parameter rolls and respects chord count', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.4)
      .mockReturnValueOnce(0.6)
      .mockReturnValueOnce(0.8)

    const result = createAdvancedRoll({
      chordCount: 5,
      faceCounts: {
        roots: 8,
        qualities: 6,
        extensions: 12,
        inversions: 4,
        rhythm: 8,
      },
    })

    expect(result.values.roots).toBe(1)
    expect(result.values.qualities).toBe(2)
    expect(result.progression.chords).toHaveLength(5)
    expect(result.progression.source).toBe('advanced')
  })

  it('keeps basic rolls simpler while wild rolls surface richer tensions', () => {
    const baseConfig = {
      chordCount: 4,
      faceCounts: {
        roots: 8,
        qualities: 6,
        extensions: 12,
        inversions: 4,
        rhythm: 8,
      },
    } as const

    const values = {
      roots: 4,
      qualities: 6,
      extensions: 12,
      inversions: 4,
      rhythm: 8,
    }

    const basic = createAdvancedRollFromValues(baseConfig, values, 'basic')
    const wild = createAdvancedRollFromValues(baseConfig, values, 'wild')

    expect(basic.progression.chords.every((chord) => chord.extensions.every((token) => ['6', '7', 'maj7'].includes(token)))).toBe(true)
    expect(wild.progression.chords.some((chord) => chord.extensions.some((token) => ['b9', '#9', '#11', 'b13', '11', '13'].includes(token)))).toBe(true)
  })
})

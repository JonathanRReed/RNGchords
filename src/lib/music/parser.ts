import { ROOT_OPTIONS } from './constants'
import { createChordDescriptor } from './chords'
import type {
  ChordDescriptor,
  ChordQuality,
  ChordSeed,
  ExtensionToken,
  ParsedProgression,
  ProgressionSource,
  RootNote,
} from './types'

const CHORD_PATTERN = /^\s*([A-Ga-g])([#b]?)([^/]*?)(?:\/([A-Ga-g])([#b]?))?\s*$/
const TOKEN_PATTERN = /(maj7|add13|add11|add9|#11|#9|b13|b9|13|11|9|7|6|sus2|sus4|sus)/g

function normalizeRoot(raw: string): RootNote | null {
  const candidate = `${raw[0].toUpperCase()}${raw.slice(1)}` as RootNote
  return ROOT_OPTIONS.includes(candidate) ? candidate : null
}

function parseQuality(body: string): { quality: ChordQuality; remainder: string; explicitMajor: boolean } {
  if (body.startsWith('maj')) {
    return { quality: 'maj', remainder: body.slice(3), explicitMajor: true }
  }

  if (body.startsWith('min')) {
    return { quality: 'min', remainder: body.slice(3), explicitMajor: false }
  }

  if (body.startsWith('m') && !body.startsWith('maj')) {
    return { quality: 'min', remainder: body.slice(1), explicitMajor: false }
  }

  if (body.startsWith('dim') || body.startsWith('o')) {
    return { quality: 'dim', remainder: body.replace(/^(dim|o)/, ''), explicitMajor: false }
  }

  if (body.startsWith('aug') || body.startsWith('+')) {
    return { quality: 'aug', remainder: body.replace(/^(aug|\+)/, ''), explicitMajor: false }
  }

  if (body.startsWith('sus2')) {
    return { quality: 'sus2', remainder: body.slice(4), explicitMajor: false }
  }

  if (body.startsWith('sus4') || body.startsWith('sus')) {
    return {
      quality: 'sus4',
      remainder: body.startsWith('sus4') ? body.slice(4) : body.slice(3),
      explicitMajor: false,
    }
  }

  return { quality: 'maj', remainder: body, explicitMajor: false }
}

function uniqueExtensions(tokens: ExtensionToken[]): ExtensionToken[] {
  return [...new Set(tokens)]
}

function promoteDominant(quality: ChordQuality, tokens: ExtensionToken[], explicitMajor: boolean): ChordQuality {
  if (quality !== 'maj' || explicitMajor) {
    return quality
  }

  const hasDominantMarker = tokens.includes('7') || tokens.includes('9') || tokens.includes('11') || tokens.includes('13')
  const hasMajorMarker = tokens.includes('maj7')

  if (hasDominantMarker && !hasMajorMarker) {
    return 'dom'
  }

  return quality
}

function parseExtensions(remainder: string): ExtensionToken[] {
  const tokens = remainder.match(TOKEN_PATTERN) ?? []
  return uniqueExtensions(tokens as ExtensionToken[])
}

function ensureSupportedRemainder(remainder: string, tokens: ExtensionToken[], symbol: string): void {
  const stripped = tokens.reduce((carry, token) => carry.replace(token, ''), remainder)

  if (stripped.length > 0) {
    throw new Error(`Unsupported chord symbol: ${symbol}`)
  }
}

export function parseChordSymbol(symbol: string, index = 0, source: ProgressionSource = 'manual-text'): ChordDescriptor {
  const match = symbol.match(CHORD_PATTERN)

  if (!match) {
    throw new Error(`Unsupported chord symbol: ${symbol}`)
  }

  const [, letter, accidental = '', bodyPart = '', bassLetter = '', bassAccidental = ''] = match
  const root = normalizeRoot(`${letter.toUpperCase()}${accidental}`)

  if (!root) {
    throw new Error(`Invalid root note in chord: ${symbol}`)
  }

  const sanitizedBody = bodyPart.replace(/\s+/g, '')
  const { quality, remainder, explicitMajor } = parseQuality(sanitizedBody)
  const extensions = parseExtensions(remainder)
  ensureSupportedRemainder(remainder, extensions, symbol)
  const resolvedQuality = promoteDominant(quality, extensions, explicitMajor)
  const bass = bassLetter ? normalizeRoot(`${bassLetter.toUpperCase()}${bassAccidental}`) : null

  if (bassLetter && !bass) {
    throw new Error(`Invalid slash bass note in chord: ${symbol}`)
  }

  const seed: ChordSeed = {
    id: `manual-${index}-${symbol.trim().replace(/\s+/g, '-').toLowerCase()}`,
    root,
    quality: resolvedQuality,
    extensions,
    bass: bass ?? undefined,
    inversion: 0,
    rhythmBeats: 1,
    source,
    explanation: ['Parsed from free-text symbol'],
  }

  return createChordDescriptor(seed)
}

export function parseProgressionInput(input: string): ParsedProgression {
  const entries = input
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)

  const chords: ChordDescriptor[] = []
  const issues: string[] = []

  entries.forEach((entry, index) => {
    try {
      chords.push(parseChordSymbol(entry, index))
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unsupported chord symbol: ${entry}`
      issues.push(message)
    }
  })

  return { chords, issues }
}

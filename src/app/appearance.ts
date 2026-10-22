import { DEFAULT_FLIP, isFlipStyle, type FlipStyle } from '../lib/dice/flips'

export type ColorMode = 'system' | 'light' | 'dark'
export type TableTheme = 'felt' | 'velvet' | 'glass' | 'pads'
export type TextFont = 'default' | 'readable' | 'dyslexic'

export interface Appearance {
  colorMode: ColorMode
  theme: TableTheme
  font: TextFont
  /** null follows the system reduced-motion setting. */
  flip: FlipStyle | null
  sound: boolean
}

export const APPEARANCE_KEY = 'rng-chords-appearance'

export const DEFAULT_APPEARANCE: Appearance = {
  colorMode: 'system',
  theme: 'felt',
  font: 'default',
  flip: null,
  sound: true,
}

export const COLOR_MODES: ReadonlyArray<{ id: ColorMode; label: string }> = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

export const TABLE_THEMES: ReadonlyArray<{ id: TableTheme; label: string; detail: string; tray: string; die: string }> = [
  { id: 'felt', label: 'Felt', detail: 'Green baize, brass trim, glossy gem dice.', tray: 'oklch(0.34 0.07 165)', die: 'oklch(0.62 0.2 22)' },
  { id: 'velvet', label: 'Velvet', detail: 'Garnet cloth with ivory dice.', tray: 'oklch(0.28 0.09 18)', die: 'oklch(0.95 0.02 85)' },
  { id: 'glass', label: 'Glass', detail: 'Blueprint grid with clear glass dice.', tray: 'oklch(0.2 0.05 258)', die: 'oklch(0.7 0.12 215)' },
  { id: 'pads', label: 'Pads', detail: 'Matte hardware with flat, clicky keys.', tray: 'oklch(0.25 0.008 70)', die: 'oklch(0.72 0.17 50)' },
]

export const TEXT_FONTS: ReadonlyArray<{ id: TextFont; label: string; detail: string }> = [
  { id: 'default', label: 'Default', detail: 'Cormorant Garamond headings, Manrope text.' },
  { id: 'readable', label: 'High legibility', detail: 'Atkinson Hyperlegible everywhere.' },
  { id: 'dyslexic', label: 'OpenDyslexic', detail: 'Weighted letter shapes with extra spacing.' },
]

const LEGACY_THEMES: Record<string, TableTheme> = {
  emerald: 'felt',
  crimson: 'velvet',
  sapphire: 'glass',
  amethyst: 'pads',
}

function oneOf<T extends string>(value: unknown, options: ReadonlyArray<{ id: T }>, fallback: T): T {
  return options.some((option) => option.id === value) ? (value as T) : fallback
}

export function parseAppearance(raw: string | null): Appearance {
  if (!raw) {
    return DEFAULT_APPEARANCE
  }

  try {
    const saved = JSON.parse(raw) as Partial<Record<keyof Appearance, unknown>>

    return {
      colorMode: oneOf(saved.colorMode, COLOR_MODES, DEFAULT_APPEARANCE.colorMode),
      theme: oneOf(saved.theme, TABLE_THEMES, DEFAULT_APPEARANCE.theme),
      font: oneOf(saved.font, TEXT_FONTS, DEFAULT_APPEARANCE.font),
      flip: isFlipStyle(saved.flip) ? saved.flip : null,
      sound: typeof saved.sound === 'boolean' ? saved.sound : DEFAULT_APPEARANCE.sound,
    }
  } catch {
    return DEFAULT_APPEARANCE
  }
}

/** Sessions saved before the appearance menu stored the table theme inside the idea. */
export function readLegacyTheme(rawSession: string | null): TableTheme | null {
  if (!rawSession) {
    return null
  }

  try {
    const legacy = (JSON.parse(rawSession) as { tableTheme?: string }).tableTheme
    return legacy ? (LEGACY_THEMES[legacy] ?? null) : null
  } catch {
    return null
  }
}

export function resolveFlip(appearance: Appearance, prefersReducedMotion: boolean): FlipStyle {
  return appearance.flip ?? (prefersReducedMotion ? 'none' : DEFAULT_FLIP)
}

export const BROWSER_CHROME = { dark: '#0f1411', light: '#f4f3ef' } as const

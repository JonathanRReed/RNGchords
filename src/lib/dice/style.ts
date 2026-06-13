export type DiceAccent = 'ruby' | 'brass' | 'emerald' | 'sapphire'

type DicePaletteAccentDefinition = {
  surfaceTop: string
  surfaceBottom: string
  text: string
  mutedText: string
  border: string
  shadow: string
}

const PALETTE_ACCENTS: Record<DiceAccent, DicePaletteAccentDefinition> = {
  ruby: {
    surfaceTop: 'rgba(216, 86, 88, 1)',
    surfaceBottom: 'rgba(112, 24, 44, 1)',
    text: '#fff6eb',
    mutedText: 'rgba(255, 241, 226, 0.93)',
    border: 'rgba(255, 226, 200, 0.24)',
    shadow: 'rgba(48, 8, 16, 0.42)',
  },
  brass: {
    surfaceTop: 'rgba(236, 191, 100, 1)',
    surfaceBottom: 'rgba(126, 75, 18, 1)',
    text: '#24150f',
    mutedText: 'rgba(38, 21, 9, 0.95)',
    border: 'rgba(255, 240, 196, 0.28)',
    shadow: 'rgba(68, 42, 12, 0.38)',
  },
  // Brighter, cooler jade so the gem reads as polished glass against the green
  // felt instead of disappearing into it.
  emerald: {
    surfaceTop: 'rgba(72, 212, 178, 1)',
    surfaceBottom: 'rgba(11, 98, 82, 1)',
    text: '#f1fffa',
    mutedText: 'rgba(236, 255, 248, 0.94)',
    border: 'rgba(224, 255, 247, 0.3)',
    shadow: 'rgba(3, 36, 31, 0.42)',
  },
  sapphire: {
    surfaceTop: 'rgba(102, 145, 238, 1)',
    surfaceBottom: 'rgba(32, 55, 144, 1)',
    text: '#f4f7ff',
    mutedText: 'rgba(235, 241, 255, 0.93)',
    border: 'rgba(232, 239, 255, 0.24)',
    shadow: 'rgba(14, 24, 58, 0.42)',
  },
}

export function getDiceAccentStyle(accent: DiceAccent): Record<string, string> {
  const palette = PALETTE_ACCENTS[accent]

  return {
    '--die-surface-top': palette.surfaceTop,
    '--die-surface-bottom': palette.surfaceBottom,
    '--die-text': palette.text,
    '--die-muted': palette.mutedText,
    '--die-border': palette.border,
    '--die-shadow': palette.shadow,
  }
}

// The dice-tray felt is now fully theme-driven from CSS (the --felt-* tokens in
// global.css, re-skinned per [data-theme]). The only thing the component still
// injects inline is the column count (--dice-cols).

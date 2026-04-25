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
    surfaceTop: 'rgba(191, 86, 86, 0.98)',
    surfaceBottom: 'rgba(98, 31, 43, 0.99)',
    text: '#fff6eb',
    mutedText: 'rgba(255, 240, 222, 0.86)',
    border: 'rgba(255, 226, 200, 0.18)',
    shadow: 'rgba(48, 8, 16, 0.38)',
  },
  brass: {
    surfaceTop: 'rgba(222, 184, 104, 0.99)',
    surfaceBottom: 'rgba(124, 78, 28, 0.99)',
    text: '#24150f',
    mutedText: 'rgba(53, 30, 16, 0.76)',
    border: 'rgba(255, 240, 196, 0.24)',
    shadow: 'rgba(68, 42, 12, 0.34)',
  },
  emerald: {
    surfaceTop: 'rgba(94, 176, 142, 0.98)',
    surfaceBottom: 'rgba(25, 82, 69, 0.99)',
    text: '#effff7',
    mutedText: 'rgba(229, 255, 245, 0.82)',
    border: 'rgba(217, 255, 241, 0.18)',
    shadow: 'rgba(4, 34, 30, 0.38)',
  },
  sapphire: {
    surfaceTop: 'rgba(105, 138, 216, 0.98)',
    surfaceBottom: 'rgba(39, 60, 126, 0.99)',
    text: '#f4f7ff',
    mutedText: 'rgba(233, 239, 255, 0.84)',
    border: 'rgba(232, 239, 255, 0.18)',
    shadow: 'rgba(14, 24, 58, 0.38)',
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

export function getDiceTrayStyle(): Record<string, string> {
  return {
    '--dice-tray-background':
      'radial-gradient(circle at 50% 54%, rgba(169, 119, 67, 0.15), transparent 0 26%), radial-gradient(circle at 50% 18%, rgba(133, 92, 54, 0.18), transparent 30%), linear-gradient(180deg, rgba(35, 21, 18, 0.98), rgba(14, 10, 11, 1))',
    '--dice-tray-border': 'rgba(236, 190, 132, 0.16)',
    '--dice-tray-inset': 'rgba(255, 228, 194, 0.08)',
    '--dice-tray-edge': 'rgba(255, 214, 166, 0.05)',
  }
}

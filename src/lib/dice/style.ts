export type DiceTheme = 'studio-resin' | 'walnut-brass' | 'gem-noir' | 'glass-luxe'
export type DiceMotionProfile = 'subtle' | 'balanced' | 'dramatic'
export type DiceContentDensity = 'chord-only' | 'chord-notes' | 'detailed'
export type DicePalette = 'ember' | 'moss' | 'sapphire' | 'ivory' | 'noir'
export type DiceAccent = 'ruby' | 'brass' | 'emerald' | 'sapphire'

export type DiceStyleSettings = {
  theme: DiceTheme
  motionProfile: DiceMotionProfile
  palette: DicePalette
  contentDensity: DiceContentDensity
}

type DiceOption<Value extends string> = {
  value: Value
  label: string
  detail: string
}

type DiceThemeDefinition = {
  label: string
  detail: string
  defaultPalette: DicePalette
  palettes: DicePalette[]
  trayBackground: string
  trayBorder: string
  trayInset: string
  trayEdge: string
}

type DicePaletteAccentDefinition = {
  surfaceTop: string
  surfaceBottom: string
  text: string
  mutedText: string
  border: string
  shadow: string
}

type DicePaletteDefinition = {
  label: string
  detail: string
  accents: Record<DiceAccent, DicePaletteAccentDefinition>
}

export const DICE_STYLE_STORAGE_KEY = 'rng-chords-dice-style-v1'

export const DEFAULT_DICE_STYLE_SETTINGS: DiceStyleSettings = {
  theme: 'studio-resin',
  motionProfile: 'balanced',
  palette: 'ember',
  contentDensity: 'chord-notes',
}

export const DICE_THEME_OPTIONS: DiceOption<DiceTheme>[] = [
  {
    value: 'studio-resin',
    label: 'Studio Resin',
    detail: 'Polished resin with warm studio glow and a premium practice-table feel.',
  },
  {
    value: 'walnut-brass',
    label: 'Walnut',
    detail: 'Warm wood and brass energy, like a crafted instrument case turned into a dice stage.',
  },
  {
    value: 'gem-noir',
    label: 'Gem Noir',
    detail: 'Dark jewel tones with dramatic contrast and richer shadow depth.',
  },
  {
    value: 'glass-luxe',
    label: 'Glass Luxe',
    detail: 'Cool composite surfaces and crisp reflections for a modern premium look.',
  },
]

export const DICE_MOTION_OPTIONS: DiceOption<DiceMotionProfile>[] = [
  {
    value: 'subtle',
    label: 'Subtle',
    detail: 'Shorter toss, restrained bounce, quick premium settle.',
  },
  {
    value: 'balanced',
    label: 'Balanced',
    detail: 'Default premium motion with a clear tumble and clean landing.',
  },
  {
    value: 'dramatic',
    label: 'Dramatic',
    detail: 'Longer toss, stronger lift, and more theatrical impact without leaving the slot.',
  },
]

export const DICE_CONTENT_DENSITY_OPTIONS: DiceOption<DiceContentDensity>[] = [
  {
    value: 'chord-only',
    label: 'Chord only',
    detail: 'Keep the face clean and let the rack carry the extra info.',
  },
  {
    value: 'chord-notes',
    label: 'Chord + notes',
    detail: 'Show the chord plus a short note preview on the face.',
  },
  {
    value: 'detailed',
    label: 'More detail',
    detail: 'Use the full face for more note and roll context while staying clamped.',
  },
]

export const DICE_PALETTES: Record<DicePalette, DicePaletteDefinition> = {
  ember: {
    label: 'Ember',
    detail: 'Amber, brass, forest, and blue-black tones with a warm premium glow.',
    accents: {
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
    },
  },
  moss: {
    label: 'Moss',
    detail: 'Organic greens and honeyed neutrals with a mellow analog warmth.',
    accents: {
      ruby: {
        surfaceTop: 'rgba(156, 96, 73, 0.98)',
        surfaceBottom: 'rgba(88, 45, 28, 0.99)',
        text: '#fff3e7',
        mutedText: 'rgba(252, 237, 222, 0.84)',
        border: 'rgba(255, 228, 205, 0.2)',
        shadow: 'rgba(48, 22, 10, 0.38)',
      },
      brass: {
        surfaceTop: 'rgba(194, 176, 115, 0.99)',
        surfaceBottom: 'rgba(104, 88, 35, 0.99)',
        text: '#1d170d',
        mutedText: 'rgba(47, 41, 18, 0.74)',
        border: 'rgba(245, 236, 179, 0.22)',
        shadow: 'rgba(58, 43, 12, 0.34)',
      },
      emerald: {
        surfaceTop: 'rgba(116, 165, 118, 0.99)',
        surfaceBottom: 'rgba(43, 87, 51, 0.99)',
        text: '#f4fff2',
        mutedText: 'rgba(239, 255, 236, 0.82)',
        border: 'rgba(224, 255, 220, 0.18)',
        shadow: 'rgba(16, 35, 16, 0.38)',
      },
      sapphire: {
        surfaceTop: 'rgba(112, 138, 154, 0.98)',
        surfaceBottom: 'rgba(40, 61, 70, 0.99)',
        text: '#f3fbff',
        mutedText: 'rgba(232, 245, 250, 0.82)',
        border: 'rgba(228, 243, 248, 0.18)',
        shadow: 'rgba(11, 20, 25, 0.36)',
      },
    },
  },
  sapphire: {
    label: 'Sapphire',
    detail: 'Cool jewel colors with cleaner glassy contrast.',
    accents: {
      ruby: {
        surfaceTop: 'rgba(146, 82, 124, 0.98)',
        surfaceBottom: 'rgba(74, 34, 74, 0.99)',
        text: '#fff4ff',
        mutedText: 'rgba(251, 234, 255, 0.84)',
        border: 'rgba(248, 222, 255, 0.2)',
        shadow: 'rgba(28, 7, 36, 0.4)',
      },
      brass: {
        surfaceTop: 'rgba(182, 195, 223, 0.99)',
        surfaceBottom: 'rgba(84, 103, 140, 0.99)',
        text: '#152031',
        mutedText: 'rgba(24, 36, 56, 0.76)',
        border: 'rgba(236, 244, 255, 0.24)',
        shadow: 'rgba(15, 27, 53, 0.34)',
      },
      emerald: {
        surfaceTop: 'rgba(109, 182, 194, 0.99)',
        surfaceBottom: 'rgba(31, 95, 112, 0.99)',
        text: '#f0fdff',
        mutedText: 'rgba(228, 252, 255, 0.82)',
        border: 'rgba(220, 250, 255, 0.18)',
        shadow: 'rgba(7, 31, 44, 0.38)',
      },
      sapphire: {
        surfaceTop: 'rgba(112, 138, 233, 0.99)',
        surfaceBottom: 'rgba(37, 56, 148, 0.99)',
        text: '#f7f8ff',
        mutedText: 'rgba(233, 238, 255, 0.84)',
        border: 'rgba(231, 236, 255, 0.2)',
        shadow: 'rgba(9, 17, 60, 0.4)',
      },
    },
  },
  ivory: {
    label: 'Ivory',
    detail: 'Lighter premium tones with strong contrast and soft brass warmth.',
    accents: {
      ruby: {
        surfaceTop: 'rgba(239, 215, 203, 0.99)',
        surfaceBottom: 'rgba(187, 121, 112, 0.99)',
        text: '#26150f',
        mutedText: 'rgba(53, 29, 23, 0.76)',
        border: 'rgba(255, 246, 231, 0.28)',
        shadow: 'rgba(82, 35, 30, 0.28)',
      },
      brass: {
        surfaceTop: 'rgba(244, 230, 196, 0.99)',
        surfaceBottom: 'rgba(201, 157, 78, 0.99)',
        text: '#21150d',
        mutedText: 'rgba(51, 33, 16, 0.76)',
        border: 'rgba(255, 250, 223, 0.3)',
        shadow: 'rgba(92, 62, 17, 0.26)',
      },
      emerald: {
        surfaceTop: 'rgba(222, 239, 229, 0.99)',
        surfaceBottom: 'rgba(112, 166, 136, 0.99)',
        text: '#132119',
        mutedText: 'rgba(28, 45, 33, 0.74)',
        border: 'rgba(246, 255, 248, 0.28)',
        shadow: 'rgba(30, 68, 42, 0.24)',
      },
      sapphire: {
        surfaceTop: 'rgba(224, 234, 248, 0.99)',
        surfaceBottom: 'rgba(118, 149, 210, 0.99)',
        text: '#101a2e',
        mutedText: 'rgba(26, 42, 67, 0.74)',
        border: 'rgba(244, 248, 255, 0.28)',
        shadow: 'rgba(32, 55, 92, 0.24)',
      },
    },
  },
  noir: {
    label: 'Noir',
    detail: 'Shadow-heavy blacks and jewel accents with cinematic depth.',
    accents: {
      ruby: {
        surfaceTop: 'rgba(123, 47, 66, 0.99)',
        surfaceBottom: 'rgba(46, 11, 24, 1)',
        text: '#fff1f5',
        mutedText: 'rgba(255, 227, 236, 0.84)',
        border: 'rgba(244, 210, 221, 0.16)',
        shadow: 'rgba(10, 3, 6, 0.46)',
      },
      brass: {
        surfaceTop: 'rgba(132, 114, 72, 0.99)',
        surfaceBottom: 'rgba(42, 28, 12, 1)',
        text: '#fff8ec',
        mutedText: 'rgba(247, 237, 212, 0.8)',
        border: 'rgba(238, 221, 173, 0.16)',
        shadow: 'rgba(12, 8, 3, 0.44)',
      },
      emerald: {
        surfaceTop: 'rgba(61, 118, 107, 0.99)',
        surfaceBottom: 'rgba(10, 33, 29, 1)',
        text: '#f0fff8',
        mutedText: 'rgba(225, 255, 241, 0.8)',
        border: 'rgba(211, 255, 236, 0.16)',
        shadow: 'rgba(3, 12, 10, 0.44)',
      },
      sapphire: {
        surfaceTop: 'rgba(70, 92, 150, 0.99)',
        surfaceBottom: 'rgba(11, 19, 48, 1)',
        text: '#f4f7ff',
        mutedText: 'rgba(230, 236, 255, 0.82)',
        border: 'rgba(219, 228, 255, 0.16)',
        shadow: 'rgba(2, 6, 18, 0.46)',
      },
    },
  },
}

const DICE_THEMES: Record<DiceTheme, DiceThemeDefinition> = {
  'studio-resin': {
    label: 'Studio Resin',
    detail: 'Warm studio lighting with polished resin surfaces.',
    defaultPalette: 'ember',
    palettes: ['ember', 'moss', 'sapphire', 'ivory'],
    trayBackground: 'radial-gradient(circle at 50% 54%, rgba(169, 119, 67, 0.15), transparent 0 26%), radial-gradient(circle at 50% 18%, rgba(133, 92, 54, 0.18), transparent 30%), linear-gradient(180deg, rgba(35, 21, 18, 0.98), rgba(14, 10, 11, 1))',
    trayBorder: 'rgba(236, 190, 132, 0.16)',
    trayInset: 'rgba(255, 228, 194, 0.08)',
    trayEdge: 'rgba(255, 214, 166, 0.05)',
  },
  'walnut-brass': {
    label: 'Walnut Brass',
    detail: 'Crafted wood tones with brass hardware energy.',
    defaultPalette: 'moss',
    palettes: ['moss', 'ember', 'ivory', 'noir'],
    trayBackground: 'radial-gradient(circle at 50% 20%, rgba(182, 141, 79, 0.14), transparent 28%), linear-gradient(180deg, rgba(66, 38, 21, 0.99), rgba(28, 17, 12, 1))',
    trayBorder: 'rgba(210, 171, 106, 0.18)',
    trayInset: 'rgba(255, 232, 189, 0.08)',
    trayEdge: 'rgba(255, 226, 176, 0.06)',
  },
  'gem-noir': {
    label: 'Gem Noir',
    detail: 'Dark jewel shadows with dramatic contrast.',
    defaultPalette: 'noir',
    palettes: ['noir', 'sapphire', 'ember'],
    trayBackground: 'radial-gradient(circle at 50% 18%, rgba(92, 82, 186, 0.12), transparent 28%), radial-gradient(circle at 50% 110%, rgba(0, 0, 0, 0.36), transparent 34%), linear-gradient(180deg, rgba(15, 14, 24, 0.99), rgba(7, 7, 13, 1))',
    trayBorder: 'rgba(132, 124, 224, 0.16)',
    trayInset: 'rgba(220, 216, 255, 0.08)',
    trayEdge: 'rgba(231, 228, 255, 0.05)',
  },
  'glass-luxe': {
    label: 'Glass Luxe',
    detail: 'Cool composite glow with crisp reflections.',
    defaultPalette: 'sapphire',
    palettes: ['sapphire', 'ivory', 'noir'],
    trayBackground: 'radial-gradient(circle at 50% 14%, rgba(116, 183, 230, 0.15), transparent 28%), linear-gradient(180deg, rgba(20, 28, 37, 0.98), rgba(9, 13, 18, 1))',
    trayBorder: 'rgba(161, 216, 255, 0.16)',
    trayInset: 'rgba(219, 243, 255, 0.08)',
    trayEdge: 'rgba(226, 246, 255, 0.05)',
  },
}

const isDiceTheme = (value: unknown): value is DiceTheme => value === 'studio-resin' || value === 'walnut-brass' || value === 'gem-noir' || value === 'glass-luxe'
const isDiceMotionProfile = (value: unknown): value is DiceMotionProfile => value === 'subtle' || value === 'balanced' || value === 'dramatic'
const isDiceContentDensity = (value: unknown): value is DiceContentDensity => value === 'chord-only' || value === 'chord-notes' || value === 'detailed'
const isDicePalette = (value: unknown): value is DicePalette => value === 'ember' || value === 'moss' || value === 'sapphire' || value === 'ivory' || value === 'noir'

export function getThemeDefaultPalette(theme: DiceTheme): DicePalette {
  return DICE_THEMES[theme].defaultPalette
}

export function resolvePaletteOptions(theme: DiceTheme): DiceOption<DicePalette>[] {
  return DICE_THEMES[theme].palettes.map((palette) => ({
    value: palette,
    label: DICE_PALETTES[palette].label,
    detail: DICE_PALETTES[palette].detail,
  }))
}

export function coerceDiceStyleSettings(raw: unknown): DiceStyleSettings {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_DICE_STYLE_SETTINGS
  }

  const candidate = raw as Partial<DiceStyleSettings>
  const theme = isDiceTheme(candidate.theme) ? candidate.theme : DEFAULT_DICE_STYLE_SETTINGS.theme
  const motionProfile = isDiceMotionProfile(candidate.motionProfile)
    ? candidate.motionProfile
    : DEFAULT_DICE_STYLE_SETTINGS.motionProfile
  const contentDensity = isDiceContentDensity(candidate.contentDensity)
    ? candidate.contentDensity
    : DEFAULT_DICE_STYLE_SETTINGS.contentDensity
  const paletteCandidate = isDicePalette(candidate.palette) ? candidate.palette : getThemeDefaultPalette(theme)
  const palette = DICE_THEMES[theme].palettes.includes(paletteCandidate) ? paletteCandidate : getThemeDefaultPalette(theme)

  return {
    theme,
    motionProfile,
    palette,
    contentDensity,
  }
}

export function getDiceTrayStyle(settings: DiceStyleSettings): Record<string, string> {
  const theme = DICE_THEMES[settings.theme]

  return {
    '--dice-tray-background': theme.trayBackground,
    '--dice-tray-border': theme.trayBorder,
    '--dice-tray-inset': theme.trayInset,
    '--dice-tray-edge': theme.trayEdge,
  }
}

export function getDiceAccentStyle(settings: DiceStyleSettings, accent: DiceAccent): Record<string, string> {
  const palette = DICE_PALETTES[settings.palette].accents[accent]

  return {
    '--die-surface-top': palette.surfaceTop,
    '--die-surface-bottom': palette.surfaceBottom,
    '--die-text': palette.text,
    '--die-muted': palette.mutedText,
    '--die-border': palette.border,
    '--die-shadow': palette.shadow,
  }
}

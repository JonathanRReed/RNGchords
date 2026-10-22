import { useCallback, useEffect, useState } from 'react'
import { setSfxMuted } from '../lib/audio/sfx'
import {
  APPEARANCE_KEY,
  BROWSER_CHROME,
  DEFAULT_APPEARANCE,
  parseAppearance,
  readLegacyTheme,
  resolveFlip,
  type Appearance,
} from './appearance'
import { SESSION_KEY } from './constants'

const DARK_QUERY = '(prefers-color-scheme: dark)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)

    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])

  return matches
}

export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE)
  const [loaded, setLoaded] = useState(false)
  const systemDark = useMediaQuery(DARK_QUERY)
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY)

  useEffect(() => {
    const saved = window.localStorage.getItem(APPEARANCE_KEY)
    const legacyTheme = saved ? null : readLegacyTheme(window.localStorage.getItem(SESSION_KEY))
    const next = parseAppearance(saved)

    setAppearance(legacyTheme ? { ...next, theme: legacyTheme } : next)
    setLoaded(true)
  }, [])

  const scheme = appearance.colorMode === 'system' ? (systemDark ? 'dark' : 'light') : appearance.colorMode

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = appearance.theme
    root.dataset.scheme = scheme
    root.dataset.font = appearance.font
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BROWSER_CHROME[scheme])
    setSfxMuted(!appearance.sound)
  }, [appearance, scheme])

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance))
    }
  }, [appearance, loaded])

  const update = useCallback((patch: Partial<Appearance>) => {
    setAppearance((current) => ({ ...current, ...patch }))
  }, [])

  return { appearance, update, flip: resolveFlip(appearance, reducedMotion) }
}

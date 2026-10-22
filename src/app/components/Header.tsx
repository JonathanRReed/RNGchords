import type { Appearance } from '../appearance'
import { AppearanceMenu } from './AppearanceMenu'
import { DiceIcon } from './icons'

interface HeaderProps {
  appearance: Appearance
  onAppearanceChange: (patch: Partial<Appearance>) => void
}

export function Header({ appearance, onAppearanceChange }: HeaderProps) {
  return (
    <header className="topbar">
      <a className="brand" href="/">
        <DiceIcon />
        <span translate="no">RNG Chords</span>
      </a>
      <nav className="topbar__nav" aria-label="Site">
        <a href="/about/">About</a>
      </nav>
      <AppearanceMenu appearance={appearance} onChange={onAppearanceChange} />
    </header>
  )
}

import { useEffect, useId, useRef, useState } from 'react'
import { FLIP_OPTIONS, isFlipStyle } from '../../lib/dice/flips'
import { COLOR_MODES, TABLE_THEMES, TEXT_FONTS, type Appearance } from '../appearance'
import { SlidersIcon } from './icons'
import { Segmented } from './Segmented'

const FONT_FAMILIES: Record<string, string> = {
  default: 'var(--font-body-default)',
  readable: "'Atkinson Hyperlegible', system-ui, sans-serif",
  dyslexic: "'OpenDyslexic', 'Comic Sans MS', sans-serif",
}

interface AppearanceMenuProps {
  appearance: Appearance
  onChange: (patch: Partial<Appearance>) => void
}

export function AppearanceMenu({ appearance, onChange }: AppearanceMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) {
      return
    }

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div className="appearance" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="btn"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <SlidersIcon />
        <span>Appearance</span>
      </button>

      {open ? (
        <div id={panelId} role="dialog" aria-label="Appearance" className="appearance__panel">
          <fieldset className="appearance__group">
            <legend>Color mode</legend>
            <Segmented label="Color mode" options={COLOR_MODES} value={appearance.colorMode} onChange={(colorMode) => onChange({ colorMode })} />
          </fieldset>

          <fieldset className="appearance__group">
            <legend>Table</legend>
            <div className="theme-list">
              {TABLE_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className="theme-option"
                  aria-pressed={theme.id === appearance.theme}
                  onClick={() => onChange({ theme: theme.id })}
                >
                  <span className="theme-option__swatch" style={{ background: theme.tray }}>
                    <span style={{ background: theme.die }} />
                  </span>
                  <span className="theme-option__text">
                    <strong>{theme.label}</strong>
                    <small>{theme.detail}</small>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="appearance__group">
            <legend>Text</legend>
            <div className="font-list">
              {TEXT_FONTS.map((font) => (
                <label key={font.id} className="font-option">
                  <input
                    type="radio"
                    name="text-font"
                    checked={font.id === appearance.font}
                    onChange={() => onChange({ font: font.id })}
                  />
                  <span style={{ fontFamily: FONT_FAMILIES[font.id] }}>
                    <strong>{font.label}</strong>
                    <small>{font.detail}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="appearance__group">
            <legend>Dice</legend>
            <label className="field">
              <span>Roll motion</span>
              <select
                value={appearance.flip ?? 'auto'}
                onChange={(event) => onChange({ flip: isFlipStyle(event.target.value) ? event.target.value : null })}
              >
                <option value="auto">Automatic</option>
                {FLIP_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <small>
                {appearance.flip
                  ? FLIP_OPTIONS.find((option) => option.id === appearance.flip)?.detail
                  : 'Tumble, or no motion if your system asks for reduced motion.'}
              </small>
            </label>
            <label className="check">
              <input type="checkbox" checked={appearance.sound} onChange={(event) => onChange({ sound: event.target.checked })} />
              <span>Play a dice sound on each roll</span>
            </label>
          </fieldset>
        </div>
      ) : null}
    </div>
  )
}

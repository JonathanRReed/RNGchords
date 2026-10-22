import type { KeyboardEvent } from 'react'
import { MODE_COPY, MODE_OPTIONS } from '../constants'
import type { Mode } from '../types'

export const modeTabId = (mode: Mode) => `mode-tab-${mode}`
export const MODE_PANEL_ID = 'mode-panel'

interface ModeTabsProps {
  mode: Mode
  onChange: (mode: Mode) => void
}

export function ModeTabs({ mode, onChange }: ModeTabsProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, current: Mode) => {
    const index = MODE_OPTIONS.indexOf(current)
    let next: Mode | undefined

    if (event.key === 'Home') {
      next = MODE_OPTIONS[0]
    } else if (event.key === 'End') {
      next = MODE_OPTIONS.at(-1)
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const step = event.key === 'ArrowRight' ? 1 : -1
      next = MODE_OPTIONS[(index + step + MODE_OPTIONS.length) % MODE_OPTIONS.length]
    }

    if (!next) {
      return
    }

    event.preventDefault()
    onChange(next)
    document.getElementById(modeTabId(next))?.focus()
  }

  return (
    <div className="mode-tabs" role="tablist" aria-label="How to make chords">
      {MODE_OPTIONS.map((entry) => (
        <button
          key={entry}
          id={modeTabId(entry)}
          type="button"
          role="tab"
          className="mode-tabs__tab"
          aria-selected={entry === mode}
          aria-controls={MODE_PANEL_ID}
          tabIndex={entry === mode ? 0 : -1}
          onClick={() => onChange(entry)}
          onKeyDown={(event) => handleKeyDown(event, entry)}
        >
          {MODE_COPY[entry].title}
        </button>
      ))}
    </div>
  )
}

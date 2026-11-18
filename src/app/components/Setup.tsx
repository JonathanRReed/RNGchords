import { memo, type KeyboardEvent } from 'react'
import { PLAYGROUND_PRESETS } from '../../lib/music/playground'
import { KEY_CHOICES } from '../../lib/music/transpose'
import type { AdvancedDiceConfig, BuilderState, ChordComplexity, RootNote } from '../../lib/music/types'
import { COMPLEXITY_COPY, COMPLEXITY_OPTIONS, MODE_COPY, MODE_OPTIONS } from '../constants'
import type { Mode } from '../types'
import type { WorkstationActions } from '../useWorkstation'
import { AdvancedSetup } from './AdvancedSetup'
import { GuidedSetup } from './GuidedSetup'
import { ManualSetup } from './ManualSetup'
import { Segmented } from './Segmented'

interface SetupProps {
  mode: Mode
  complexity: ChordComplexity
  keyLock: RootNote | null
  presetId: string
  guidedFaces: number[]
  advancedConfig: AdvancedDiceConfig
  builder: BuilderState
  manualInput: string
  manualIssues: string[]
  actions: WorkstationActions
}

const COMPLEXITY_CHOICES = COMPLEXITY_OPTIONS.map((id) => ({ id, label: COMPLEXITY_COPY[id].label }))
const tabId = (mode: Mode) => `mode-tab-${mode}`
const PANEL_ID = 'mode-panel'

function spellKey(key: string): string {
  return key.replace('b', '♭').replace('#', '♯')
}

/** Everything that decides what the next roll can be. */
export const Setup = memo(function Setup({
  mode,
  complexity,
  keyLock,
  presetId,
  guidedFaces,
  advancedConfig,
  builder,
  manualInput,
  manualIssues,
  actions,
}: SetupProps) {
  const handleTabKey = (event: KeyboardEvent<HTMLButtonElement>, current: Mode) => {
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
    actions.setMode(next)
    document.getElementById(tabId(next))?.focus()
  }

  return (
    <aside className="setup" aria-label="Roll settings">
      <section className="setup__section">
        <div className="mode-tabs" role="tablist" aria-label="How to make chords">
          {MODE_OPTIONS.map((entry) => (
            <button
              key={entry}
              id={tabId(entry)}
              type="button"
              role="tab"
              className="mode-tabs__tab"
              aria-selected={entry === mode}
              aria-controls={PANEL_ID}
              tabIndex={entry === mode ? 0 : -1}
              onClick={() => actions.setMode(entry)}
              onKeyDown={(event) => handleTabKey(event, entry)}
            >
              {MODE_COPY[entry].title}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={PANEL_ID} aria-labelledby={tabId(mode)}>
          {mode === 'guided' ? <GuidedSetup faces={guidedFaces} actions={actions} /> : null}
          {mode === 'advanced' ? <AdvancedSetup config={advancedConfig} actions={actions} /> : null}
          {mode === 'manual' ? <ManualSetup builder={builder} manualInput={manualInput} issues={manualIssues} actions={actions} /> : null}
        </div>
      </section>

      <section className="setup__section">
        <h2 className="setup__title">Chord style</h2>
        <Segmented label="Chord style" options={COMPLEXITY_CHOICES} value={complexity} onChange={actions.setComplexity} />
        <p className="hint">{COMPLEXITY_COPY[complexity].detail}</p>
      </section>

      <section className="setup__section">
        <label className="field">
          <span className="setup__title">Key</span>
          <select value={keyLock ?? ''} onChange={(event) => actions.setKeyLock((event.target.value || null) as RootNote | null)}>
            <option value="">Let the dice pick</option>
            {KEY_CHOICES.map((key) => (
              <option key={key} value={key}>
                {spellKey(key)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="setup__section">
        <h2 className="setup__title">Starting points</h2>
        <ul className="presets">
          {PLAYGROUND_PRESETS.map((preset) => (
            <li key={preset.id}>
              <button type="button" className="preset" aria-pressed={preset.id === presetId} onClick={() => actions.loadPreset(preset)}>
                <strong>{preset.label}</strong>
                <span>{preset.strapline}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
})

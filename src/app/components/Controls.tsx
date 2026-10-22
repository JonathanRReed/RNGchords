import { memo } from 'react'
import { KEY_CHOICES } from '../../lib/music/transpose'
import type { AdvancedDiceConfig, BuilderState, ChordComplexity, RootNote } from '../../lib/music/types'
import { COMPLEXITY_COPY, COMPLEXITY_OPTIONS, MODE_COPY } from '../constants'
import type { Mode } from '../types'
import type { WorkstationActions } from '../useWorkstation'
import { AdvancedSetup } from './AdvancedSetup'
import { GuidedSetup } from './GuidedSetup'
import { ManualSetup } from './ManualSetup'
import { MODE_PANEL_ID, modeTabId } from './ModeTabs'
import { Segmented } from './Segmented'

interface ControlsProps {
  mode: Mode
  complexity: ChordComplexity
  keyLock: RootNote | null
  guidedFaces: number[]
  advancedConfig: AdvancedDiceConfig
  builder: BuilderState
  manualInput: string
  manualIssues: string[]
  actions: WorkstationActions
}

const COMPLEXITY_CHOICES = COMPLEXITY_OPTIONS.map((id) => ({ id, label: COMPLEXITY_COPY[id].label }))

export const Controls = memo(function Controls({
  mode,
  complexity,
  keyLock,
  guidedFaces,
  advancedConfig,
  builder,
  manualInput,
  manualIssues,
  actions,
}: ControlsProps) {
  return (
    <aside className="controls panel" aria-label="Roll settings">
      <div className="controls__section" role="tabpanel" id={MODE_PANEL_ID} aria-labelledby={modeTabId(mode)}>
        <h2 className="controls__title">{MODE_COPY[mode].title} setup</h2>
        {mode === 'guided' ? <GuidedSetup faces={guidedFaces} actions={actions} /> : null}
        {mode === 'advanced' ? <AdvancedSetup config={advancedConfig} actions={actions} /> : null}
        {mode === 'manual' ? <ManualSetup builder={builder} manualInput={manualInput} issues={manualIssues} actions={actions} /> : null}
      </div>

      <div className="controls__section">
        <h2 className="controls__title">Chord style</h2>
        <Segmented label="Chord style" options={COMPLEXITY_CHOICES} value={complexity} onChange={actions.setComplexity} />
        <p className="hint">{COMPLEXITY_COPY[complexity].detail}</p>
      </div>

      <div className="controls__section">
        <label className="field">
          <span className="controls__title">Key</span>
          <select value={keyLock ?? ''} onChange={(event) => actions.setKeyLock((event.target.value || null) as RootNote | null)}>
            <option value="">Any key</option>
            {KEY_CHOICES.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
      </div>
    </aside>
  )
})

import { ADVANCED_PARAMETER_LABELS, ADVANCED_PARAMETERS, FACE_OPTIONS } from '../../lib/music/constants'
import type { AdvancedDiceConfig } from '../../lib/music/types'
import type { WorkstationActions } from '../useWorkstation'

interface AdvancedSetupProps {
  config: AdvancedDiceConfig
  actions: Pick<WorkstationActions, 'setChordCount' | 'setAdvancedFace'>
}

export function AdvancedSetup({ config, actions }: AdvancedSetupProps) {
  return (
    <div className="stack">
      <label className="field">
        <span>Chords in the progression</span>
        <div className="slider-row">
          <input type="range" min={2} max={8} value={config.chordCount} onChange={(event) => actions.setChordCount(Number(event.target.value))} />
          <output>{config.chordCount}</output>
        </div>
      </label>
      <div className="field-grid">
        {ADVANCED_PARAMETERS.map((parameter) => (
          <label key={parameter} className="field">
            <span>{ADVANCED_PARAMETER_LABELS[parameter]}</span>
            <select value={config.faceCounts[parameter]} onChange={(event) => actions.setAdvancedFace(parameter, Number(event.target.value))}>
              {FACE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  d{option}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  )
}

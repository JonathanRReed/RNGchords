import { ADVANCED_PARAMETER_LABELS, ADVANCED_PARAMETERS, FACE_OPTIONS } from '../../lib/music/constants'
import type { AdvancedDiceConfig } from '../../lib/music/types'
import type { WorkstationActions } from '../useWorkstation'
import { DieShape } from './DieShape'

interface AdvancedSetupProps {
  config: AdvancedDiceConfig
  actions: Pick<WorkstationActions, 'setChordCount' | 'setAdvancedFace'>
}

export function AdvancedSetup({ config, actions }: AdvancedSetupProps) {
  return (
    <div className="stack">
      <label className="field">
        <span>
          Chords in the progression <output>{config.chordCount}</output>
        </span>
        <input type="range" min={2} max={8} value={config.chordCount} onChange={(event) => actions.setChordCount(Number(event.target.value))} />
      </label>
      <ul className="die-rows" aria-label="Dice, one for each part of the chords">
        {ADVANCED_PARAMETERS.map((parameter) => (
          <li key={parameter}>
            <label className="die-row">
              <DieShape faces={config.faceCounts[parameter]} />
              <span className="die-row__name">{ADVANCED_PARAMETER_LABELS[parameter]}</span>
              <select value={config.faceCounts[parameter]} onChange={(event) => actions.setAdvancedFace(parameter, Number(event.target.value))}>
                {FACE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    d{option}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ul>
      <p className="hint">Five dice shape the whole progression together. Changes apply on the next roll.</p>
    </div>
  )
}

import { FACE_OPTIONS } from '../../lib/music/constants'
import { MAX_GUIDED_DICE } from '../constants'
import type { WorkstationActions } from '../useWorkstation'
import { DieShape } from './DieShape'

interface GuidedSetupProps {
  faces: number[]
  actions: Pick<WorkstationActions, 'setGuidedFace' | 'addGuidedDie' | 'removeGuidedDie'>
}

export function GuidedSetup({ faces, actions }: GuidedSetupProps) {
  return (
    <div className="stack">
      <ol className="die-slots" aria-label="Dice, one for each chord">
        {faces.map((count, index) => (
          <li key={index}>
            <label className="die-slot">
              <DieShape faces={count} />
              <span className="die-slot__name">d{count}</span>
              <select
                value={count}
                aria-label={`Die for chord ${index + 1}`}
                onChange={(event) => actions.setGuidedFace(index, Number(event.target.value))}
              >
                {FACE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    d{option}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ol>
      <div className="row">
        <button type="button" className="btn btn--sm" onClick={actions.addGuidedDie} disabled={faces.length >= MAX_GUIDED_DICE}>
          Add a die
        </button>
        <button type="button" className="btn btn--sm" onClick={actions.removeGuidedDie} disabled={faces.length <= 1}>
          Remove a die
        </button>
      </div>
      <p className="hint">One die for each chord. Bigger dice wander further from the key. Changes apply on the next roll.</p>
    </div>
  )
}

import { FACE_OPTIONS } from '../../lib/music/constants'
import { MAX_GUIDED_DICE } from '../constants'
import type { WorkstationActions } from '../useWorkstation'

interface GuidedSetupProps {
  faces: number[]
  actions: Pick<WorkstationActions, 'setGuidedFace' | 'addGuidedDie' | 'removeGuidedDie'>
}

export function GuidedSetup({ faces, actions }: GuidedSetupProps) {
  return (
    <div className="stack">
      <div className="field-grid">
        {faces.map((count, index) => (
          <label key={index} className="field">
            <span>Chord {index + 1}</span>
            <select value={count} onChange={(event) => actions.setGuidedFace(index, Number(event.target.value))}>
              {FACE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  d{option}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="row">
        <button type="button" className="btn btn--sm" onClick={actions.addGuidedDie} disabled={faces.length >= MAX_GUIDED_DICE}>
          Add a chord
        </button>
        <button type="button" className="btn btn--sm" onClick={actions.removeGuidedDie} disabled={faces.length <= 1}>
          Remove a chord
        </button>
      </div>
      <p className="hint">Bigger dice wander further from the key. A d4 stays close, a d20 can land almost anywhere.</p>
    </div>
  )
}

import { memo } from 'react'
import { PLAYGROUND_PRESETS } from '../../lib/music/playground'
import type { WorkstationActions } from '../useWorkstation'

interface PresetsProps {
  presetId: string
  actions: WorkstationActions
}

export const Presets = memo(function Presets({ presetId, actions }: PresetsProps) {
  return (
    <div className="presets" role="group" aria-label="Starting points">
      <span className="presets__label">Start from</span>
      {PLAYGROUND_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className="chip"
          title={preset.strapline}
          aria-pressed={preset.id === presetId}
          onClick={() => actions.loadPreset(preset)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
})

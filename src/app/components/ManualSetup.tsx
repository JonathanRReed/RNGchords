import { COLOR_TONE_OPTIONS, PRIMARY_EXTENSION_OPTIONS, QUALITY_OPTIONS, RHYTHM_LABELS, ROOT_OPTIONS } from '../../lib/music/constants'
import type { BuilderState } from '../../lib/music/types'
import type { WorkstationActions } from '../useWorkstation'

interface ManualSetupProps {
  builder: BuilderState
  manualInput: string
  issues: string[]
  actions: Pick<WorkstationActions, 'updateBuilder' | 'addBuilderChord' | 'setManualInput' | 'applyManualInput'>
}

export function ManualSetup({ builder, manualInput, issues, actions }: ManualSetupProps) {
  const { updateBuilder } = actions

  return (
    <div className="stack">
      <label className="field field--wide">
        <span>Type chord names</span>
        <textarea
          value={manualInput}
          rows={2}
          spellCheck={false}
          placeholder="Cmaj7, Am7, D7, Gmaj7"
          onChange={(event) => actions.setManualInput(event.target.value)}
        />
      </label>
      <div className="row">
        <button type="button" className="btn btn--primary btn--sm" onClick={() => actions.applyManualInput(true)}>
          Use these chords
        </button>
        <button type="button" className="btn btn--sm" onClick={() => actions.applyManualInput(false)}>
          Add to progression
        </button>
      </div>
      {issues.length > 0 ? (
        <div className="notice" role="status">
          {issues.map((issue) => (
            <p key={issue}>{issue}</p>
          ))}
        </div>
      ) : null}

      <fieldset className="builder">
        <legend>Or build one chord</legend>
        <div className="field-grid">
          <label className="field">
            <span>Root</span>
            <select value={builder.root} onChange={(event) => updateBuilder('root', event.target.value as BuilderState['root'])}>
              {ROOT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Quality</span>
            <select value={builder.quality} onChange={(event) => updateBuilder('quality', event.target.value as BuilderState['quality'])}>
              {QUALITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Extension</span>
            <select
              value={builder.extensionPrimary}
              onChange={(event) => updateBuilder('extensionPrimary', event.target.value as BuilderState['extensionPrimary'])}
            >
              {PRIMARY_EXTENSION_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Bass note</span>
            <select value={builder.bass} onChange={(event) => updateBuilder('bass', event.target.value as BuilderState['bass'])}>
              <option value="">Same as root</option>
              {ROOT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Inversion</span>
            <div className="slider-row">
              <input type="range" min={0} max={3} value={builder.inversion} onChange={(event) => updateBuilder('inversion', Number(event.target.value))} />
              <output>{builder.inversion}</output>
            </div>
          </label>
          <label className="field">
            <span>Length</span>
            <div className="slider-row">
              <input
                type="range"
                min={1}
                max={4}
                step={0.5}
                value={builder.rhythmBeats}
                onChange={(event) => updateBuilder('rhythmBeats', Number(event.target.value))}
              />
              <output>{RHYTHM_LABELS[builder.rhythmBeats] ?? `${builder.rhythmBeats} beats`}</output>
            </div>
          </label>
        </div>

        <div className="chips" role="group" aria-label="Color tones">
          {COLOR_TONE_OPTIONS.map((option) => {
            const active = builder.colorTones.includes(option.value)

            return (
              <button
                key={option.value}
                type="button"
                className="chip"
                aria-pressed={active}
                onClick={() =>
                  updateBuilder('colorTones', active ? builder.colorTones.filter((tone) => tone !== option.value) : [...builder.colorTones, option.value])
                }
              >
                {option.label}
              </button>
            )
          })}
        </div>

        <div className="row">
          <button type="button" className="btn btn--sm" onClick={() => actions.addBuilderChord(false)}>
            Add this chord
          </button>
          <button type="button" className="btn btn--sm" onClick={() => actions.addBuilderChord(true)}>
            Replace progression
          </button>
        </div>
      </fieldset>
    </div>
  )
}

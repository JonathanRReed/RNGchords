import { memo } from 'react'
import { INSTRUMENT_FOCUS_COPY, createPlayerTips, type InstrumentFocus } from '../../lib/music/playground'
import type { ProgressionResult } from '../../lib/music/types'
import { FOCUS_OPTIONS } from '../constants'
import { Segmented } from './Segmented'

const FOCUS_CHOICES = FOCUS_OPTIONS.map((id) => ({ id, label: INSTRUMENT_FOCUS_COPY[id].label }))

interface PlayingTipsProps {
  progression: ProgressionResult
  focus: InstrumentFocus
  onFocusChange: (focus: InstrumentFocus) => void
}

export const PlayingTips = memo(function PlayingTips({ progression, focus, onFocusChange }: PlayingTipsProps) {
  const tips = createPlayerTips(progression, focus).slice(0, 2)
  const reason = progression.explanation[0]

  return (
    <section className="tips panel" aria-label="Playing tips">
      <div className="tips__head">
        <h2>Playing it</h2>
        <Segmented label="Instrument" options={FOCUS_CHOICES} value={focus} onChange={onFocusChange} />
      </div>
      <ul>
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
      {reason ? <p className="hint">{reason}</p> : null}
    </section>
  )
})

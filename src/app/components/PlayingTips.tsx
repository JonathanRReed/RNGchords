import { memo } from 'react'
import { describeProgression } from '../../lib/music/notes'
import type { ProgressionResult } from '../../lib/music/types'

interface PlayingTipsProps {
  progression: ProgressionResult
}

export const PlayingTips = memo(function PlayingTips({ progression }: PlayingTipsProps) {
  const notes = describeProgression(progression)

  if (notes.length === 0) {
    return null
  }

  return (
    <section className="tips panel" aria-label="About this progression">
      <h2>What is going on in here</h2>
      <ul>
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  )
})

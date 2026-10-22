import { memo } from 'react'
import type { FlipStyle } from '../../lib/dice/flips'
import type { StageDie } from '../types'
import { DieCard } from './DieCard'

interface DiceTrayProps {
  dice: StageDie[]
  rollId: number
  flip: FlipStyle
}

export const DiceTray = memo(function DiceTray({ dice, rollId, flip }: DiceTrayProps) {
  if (dice.length === 0) {
    return <p className="dice-empty">No chords yet. Roll the dice or type a few chord names.</p>
  }

  return (
    <div className="dice" aria-hidden="true">
      {dice.map((die, index) => (
        <DieCard key={die.id} die={die} accent={(index % 4) + 1} sequence={index} rollId={rollId} flip={flip} />
      ))}
    </div>
  )
})

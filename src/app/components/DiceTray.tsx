import { memo } from 'react'
import type { FlipStyle } from '../../lib/dice/flips'
import type { StageDie } from '../types'
import { DieCard } from './DieCard'

interface DiceTrayProps {
  dice: StageDie[]
  rollId: number
  flip: FlipStyle
  playingIndex: number | null
  keptSlots: number[]
  onPress: (chordIndex: number) => void
}

export const DiceTray = memo(function DiceTray({ dice, rollId, flip, playingIndex, keptSlots, onPress }: DiceTrayProps) {
  if (dice.length === 0) {
    return <p className="dice-empty">The tray is empty. Roll the dice or type a few chord names.</p>
  }

  return (
    <div className="dice" role="group" aria-label="Dice">
      {dice.map((die, index) => (
        <DieCard
          key={die.id}
          die={die}
          accent={(index % 4) + 1}
          sequence={index}
          rollId={rollId}
          flip={flip}
          playing={die.chordIndex !== undefined && die.chordIndex === playingIndex}
          kept={die.chordIndex !== undefined && keptSlots.includes(die.chordIndex)}
          onPress={onPress}
        />
      ))}
    </div>
  )
})

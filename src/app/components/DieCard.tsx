import { memo, useLayoutEffect, useRef } from 'react'
import { getDieAnimation, type FlipStyle } from '../../lib/dice/flips'
import type { StageDie } from '../types'

interface DieCardProps {
  die: StageDie
  accent: number
  sequence: number
  rollId: number
  flip: FlipStyle
}

export const DieCard = memo(function DieCard({ die, accent, sequence, rollId, flip }: DieCardProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const shadowRef = useRef<HTMLDivElement>(null)
  const playedRoll = useRef(0)

  useLayoutEffect(() => {
    if (rollId === playedRoll.current) {
      return
    }

    playedRoll.current = rollId

    const animation = getDieAnimation(flip, sequence)

    if (!animation) {
      return
    }

    const target = animation.target === 'body' ? bodyRef.current : contentRef.current
    const running = [target?.animate(animation.keyframes, animation.options)]

    if (animation.shadow) {
      running.push(shadowRef.current?.animate(animation.shadow.keyframes, animation.shadow.options))
    }

    return () => {
      for (const item of running) {
        item?.cancel()
      }
    }
  }, [rollId, flip, sequence])

  return (
    <div className="die" data-accent={accent}>
      <div className="die__shadow" ref={shadowRef} />
      <div className="die__body" ref={bodyRef}>
        <div className="die__face">
          <div className="die__content" ref={contentRef}>
            <span className="die__label">{die.label}</span>
            <strong className="die__value" data-kind={typeof die.value === 'number' ? 'number' : 'text'}>
              {die.value}
            </strong>
            <span className="die__foot">
              {die.detail ? <span className="die__detail">{die.detail}</span> : null}
              <span>{die.footer}</span>
            </span>
          </div>
        </div>
        <div className="die__face die__face--back" aria-hidden="true">
          <span className="die__pip" />
        </div>
      </div>
    </div>
  )
})

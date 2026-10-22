import { memo, useId, useLayoutEffect, useRef, type CSSProperties } from 'react'
import { getDieAnimation, type FlipStyle } from '../../lib/dice/flips'
import { CUBE_FACE_MATRIX, getDieShape, getPips, hashString } from '../../lib/dice/shapes'
import type { StageDie } from '../types'

interface DieCardProps {
  die: StageDie
  accent: number
  sequence: number
  rollId: number
  flip: FlipStyle
  playing: boolean
  kept: boolean
  onPress?: (chordIndex: number) => void
}

function valueSize(text: string, width: number, isNumber: boolean): number {
  const fit = width / (Math.max(2, text.length) * 0.56)
  return Math.min(isNumber ? 28 : 21, Math.max(9, fit))
}

export const DieCard = memo(function DieCard({ die, accent, sequence, rollId, flip, playing, kept, onPress }: DieCardProps) {
  const bodyRef = useRef<HTMLSpanElement>(null)
  const contentRef = useRef<HTMLSpanElement>(null)
  const shadowRef = useRef<HTMLSpanElement>(null)
  const playedRoll = useRef(0)
  const gradientId = `die-${useId().replace(/:/g, '')}`

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

  const shape = getDieShape(die.faces)
  const text = String(die.value)
  const isNumber = typeof die.value === 'number'
  const seed = hashString(`${die.id}:${rollId}`)
  const tilt = ((seed % 15) - 7) * 0.9
  const sidePips = [(seed % 6) + 1, ((seed >> 4) % 6) + 1]
  const pressable = onPress !== undefined && die.chordIndex !== undefined

  const art = (
    <>
      <span className="die__shadow" ref={shadowRef} />
      <span className="die__body" ref={bodyRef}>
        <svg className="die__art" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={gradientId} x1="0.15" y1="0" x2="0.85" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--die-a)' }} />
              <stop offset="1" style={{ stopColor: 'var(--die-b)' }} />
            </linearGradient>
          </defs>
          <polygon className="die__hull" points={shape.hull} fill={`url(#${gradientId})`} />
          {shape.facets.map((facet) => (
            <polygon
              key={facet.points}
              className="die__facet"
              data-shade={facet.tone >= 0 ? 'light' : 'dark'}
              points={facet.points}
              style={{ '--tone': Math.abs(facet.tone) } as CSSProperties}
            />
          ))}
          {shape.cube ? (
            <g className="die__pips">
              <g transform={CUBE_FACE_MATRIX.top}>
                {getPips(sidePips[0] ?? 1).map(([x, y]) => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r={0.1} />
                ))}
              </g>
              <g transform={CUBE_FACE_MATRIX.side}>
                {getPips(sidePips[1] ?? 1).map(([x, y]) => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r={0.1} />
                ))}
              </g>
            </g>
          ) : null}
          <ellipse
            className="die__spec"
            cx={shape.spec.cx}
            cy={shape.spec.cy}
            rx={shape.spec.rx}
            ry={shape.spec.ry}
            transform={`rotate(${shape.spec.angle} ${shape.spec.cx} ${shape.spec.cy})`}
          />
          <polygon className="die__rim" points={shape.hull} />
        </svg>
        <span
          className="die__value"
          ref={contentRef}
          data-kind={isNumber ? 'number' : 'text'}
          style={{ left: `${shape.label.x}%`, top: `${shape.label.y}%`, fontSize: `${valueSize(text, shape.label.width, isNumber)}cqw` }}
        >
          {text}
        </span>
      </span>
    </>
  )

  return (
    <div
      className="die"
      data-accent={accent}
      data-faces={die.faces}
      data-playing={playing || undefined}
      data-kept={kept || undefined}
      style={{ '--tilt': `${tilt.toFixed(1)}deg` } as CSSProperties}
      aria-hidden={pressable ? undefined : true}
    >
      {pressable ? (
        <button
          type="button"
          className="die__hit"
          onClick={() => onPress(die.chordIndex as number)}
          aria-label={`${die.label}: ${text}. Hear this chord.`}
        >
          {art}
        </button>
      ) : (
        <div className="die__hit">{art}</div>
      )}
      <span className="die__cap">
        <span className="die__label">{die.label}</span>
        <span className="die__sub">{die.detail ?? die.footer}</span>
      </span>
    </div>
  )
})

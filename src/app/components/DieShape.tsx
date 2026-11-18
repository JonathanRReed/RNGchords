import { getDieShape } from '../../lib/dice/shapes'

interface DieShapeProps {
  faces: number
  className?: string
}

/** A small outline of a die, so a d8 can be told from a d20 at a glance. */
export function DieShape({ faces, className }: DieShapeProps) {
  const shape = getDieShape(faces)

  return (
    <svg className={className ? `die-shape ${className}` : 'die-shape'} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <polygon className="die-shape__hull" points={shape.hull} />
      {shape.facets.map((facet) => (
        <polygon key={facet.points} className="die-shape__facet" points={facet.points} />
      ))}
    </svg>
  )
}

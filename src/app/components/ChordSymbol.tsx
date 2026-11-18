import { ACCIDENTAL_LIFT, ACCIDENTAL_SCALE, FLAT, SHARP, splitSymbol } from '../../lib/music/accidentals'

interface ChordSymbolProps {
  /** A chord or note name in plain text, such as `Bbm7b5` or `F#`. */
  text: string
  className?: string
}

/**
 * Sets a chord name the way a lead sheet does, with real flat and sharp
 * signs. Screen readers get the plain text.
 */
export function ChordSymbol({ text, className }: ChordSymbolProps) {
  return (
    <span className={className ? `chord-symbol ${className}` : 'chord-symbol'}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {splitSymbol(text).map((piece, index) => {
          if (piece.kind === 'text') {
            return piece.text
          }

          const glyph = piece.kind === 'flat' ? FLAT : SHARP

          return (
            <svg
              key={index}
              className="chord-symbol__sign"
              viewBox={`0 -840 ${glyph.width} 1000`}
              style={{ width: `${(glyph.width / 1000) * ACCIDENTAL_SCALE}em`, height: `${ACCIDENTAL_SCALE}em`, verticalAlign: `${ACCIDENTAL_LIFT - 0.16 * ACCIDENTAL_SCALE}em` }}
              focusable="false"
            >
              <path d={glyph.path} />
            </svg>
          )
        })}
      </span>
    </span>
  )
}

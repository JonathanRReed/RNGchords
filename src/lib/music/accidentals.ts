/**
 * Flat and sharp signs, drawn here so they look the same in every font, on
 * the page and on a die face. Paths sit on a 1000-unit em with the baseline
 * at y = 0 and y running down, the way SVG and canvas both count.
 */

export interface AccidentalGlyph {
  path: string
  /** Advance width in em units. */
  width: number
}

export const FLAT: AccidentalGlyph = {
  path: 'M40 -800h74v372c62-52 136-72 196-50 92 32 100 156 28 246-62 78-154 152-298 232zM114 -338v250c82-52 142-112 166-164 34-72 18-132-32-142-46-8-96 16-134 56z',
  width: 400,
}

export const SHARP: AccidentalGlyph = {
  path: 'M128 -748h62v828h-62zM314 -790h62v828h-62zM40 -452l424-92v118l-424 92zM40 -172l424-92v118l-424 92z',
  width: 504,
}

/** Accidentals are set a little smaller and lifted, like a superscript. */
export const ACCIDENTAL_SCALE = 0.74
export const ACCIDENTAL_LIFT = 0.2

export type SymbolPiece = { kind: 'text'; text: string } | { kind: 'flat' } | { kind: 'sharp' }

/**
 * Splits chord text into letters and accidentals. A `b` counts as a flat only
 * where a musician would read one: after a note letter, or before a number as
 * in `7b9`. A `#` is always a sharp.
 */
export function splitSymbol(text: string): SymbolPiece[] {
  const pieces: SymbolPiece[] = []
  let run = ''

  const flush = () => {
    if (run) {
      pieces.push({ kind: 'text', text: run })
      run = ''
    }
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!
    const previous = text[index - 1] ?? ''
    const next = text[index + 1] ?? ''

    if (char === '#' || char === '♯') {
      flush()
      pieces.push({ kind: 'sharp' })
    } else if (char === '♭' || (char === 'b' && (/[A-G]/.test(previous) || /\d/.test(next)) && !/[a-z]/.test(previous))) {
      flush()
      pieces.push({ kind: 'flat' })
    } else {
      run += char
    }
  }

  flush()
  return pieces
}

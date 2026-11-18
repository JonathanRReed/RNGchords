/**
 * Paints a die's faces onto one canvas, a cell per face. The canvas becomes
 * the die's colour texture, so the lettering takes the same light and gloss
 * as the die itself.
 */

import { ACCIDENTAL_LIFT, ACCIDENTAL_SCALE, FLAT, SHARP, splitSymbol, type SymbolPiece } from '../music/accidentals'
import type { DieMesh, Polyhedron } from './polyhedra'

export interface FaceLabel {
  main: string
  /** A second, smaller line: the extension of a long chord name. */
  sub?: string
}

export interface AtlasStyle {
  body: string
  ink: string
  /** Colour of the bevelled edges. */
  edge: string
  font: string
  weight: number
  /** Paint lettering in white on black instead, for a glow or an engraving map. */
  mask?: boolean
  /** In a mask, how bright the bevelled edges are, from 0 to 1. */
  edgeLevel?: number
}

export interface AtlasLayout {
  cols: number
  rows: number
  cell: number
}

/** Share of a cell the face is allowed to cover, leaving a bleed margin. */
const FILL = 0.94

export function atlasLayout(polyhedron: Polyhedron): AtlasLayout {
  const cells = polyhedron.faces.length + 1
  const cols = Math.ceil(Math.sqrt(cells))
  // Small faces get small cells: a d20 face is a fraction of a d6 face on screen, and texture memory adds up over eight dice.
  const cell = polyhedron.faces.length > 12 ? 128 : polyhedron.faces.length > 6 ? 192 : 256
  return { cols, rows: Math.ceil(cells / cols), cell }
}

/** Texture coordinates for a die mesh: faces map into their cells, bevels into the spare last cell. */
export function atlasUvs(mesh: DieMesh, polyhedron: Polyhedron): number[] {
  const { cols, rows } = atlasLayout(polyhedron)
  const uvs: number[] = []

  for (let index = 0; index < mesh.cells.length; index += 1) {
    const cell = mesh.cells[index]! < 0 ? polyhedron.faces.length : mesh.cells[index]!
    const x = cell % cols
    const y = Math.floor(cell / cols)
    uvs.push((x + 0.5 + mesh.local[index * 2]! * 0.5 * FILL) / cols, 1 - (y + 0.5 - mesh.local[index * 2 + 1]! * 0.5 * FILL) / rows)
  }

  return uvs
}

const glyphs = new Map<string, Path2D>()

function glyphPath(path: string): Path2D {
  let cached = glyphs.get(path)

  if (!cached) {
    cached = new Path2D(path)
    glyphs.set(path, cached)
  }

  return cached
}

function pieceWidth(context: CanvasRenderingContext2D, piece: SymbolPiece, size: number): number {
  if (piece.kind === 'text') {
    return context.measureText(piece.text).width
  }

  return ((piece.kind === 'flat' ? FLAT : SHARP).width / 1000) * size * ACCIDENTAL_SCALE + size * 0.04
}

function lineWidth(context: CanvasRenderingContext2D, pieces: SymbolPiece[], size: number): number {
  return pieces.reduce((sum, piece) => sum + pieceWidth(context, piece, size), 0)
}

function drawLine(context: CanvasRenderingContext2D, pieces: SymbolPiece[], size: number, baseline: number): void {
  let x = -lineWidth(context, pieces, size) / 2

  for (const piece of pieces) {
    if (piece.kind === 'text') {
      context.fillText(piece.text, x, baseline)
    } else {
      const glyph = piece.kind === 'flat' ? FLAT : SHARP
      const unit = (size * ACCIDENTAL_SCALE) / 1000

      context.save()
      context.translate(x + size * 0.02, baseline - size * ACCIDENTAL_LIFT)
      context.scale(unit, unit)
      context.fill(glyphPath(glyph.path))
      context.restore()
    }

    x += pieceWidth(context, piece, size)
  }
}

export interface FacePaint {
  label: FaceLabel
  /** Turn of the text on the face, counter-clockwise, in radians. */
  angle: number
}

export function paintAtlas(canvas: HTMLCanvasElement, polyhedron: Polyhedron, faces: FacePaint[], style: AtlasStyle): void {
  const { cols, rows, cell } = atlasLayout(polyhedron)
  canvas.width = cols * cell
  canvas.height = rows * cell

  const context = canvas.getContext('2d')

  if (!context) {
    return
  }

  context.fillStyle = style.mask ? '#000' : style.body
  context.fillRect(0, 0, canvas.width, canvas.height)

  const edgeCell = polyhedron.faces.length
  const level = Math.round((style.edgeLevel ?? 0) * 255)
  context.fillStyle = style.mask ? `rgb(${level}, ${level}, ${level})` : style.edge
  context.fillRect((edgeCell % cols) * cell, Math.floor(edgeCell / cols) * cell, cell, cell)

  context.fillStyle = style.mask ? '#fff' : style.ink
  context.textBaseline = 'alphabetic'
  context.textAlign = 'left'

  polyhedron.faces.forEach((face, index) => {
    const paint = faces[index]

    if (!paint || !paint.label.main) {
      return
    }

    const corners = face.corners.map((corner) => polyhedron.corners[corner]!)
    const extent = Math.max(...corners.map((corner) => Math.hypot(corner[0] - face.center[0], corner[1] - face.center[1], corner[2] - face.center[2])))
    // Radius of the circle the text has to stay inside, in canvas pixels.
    const room = (face.inradius / extent) * (cell / 2) * FILL
    const main = splitSymbol(paint.label.main)
    const sub = paint.label.sub ? splitSymbol(paint.label.sub) : null
    const font = (size: number) => `${style.weight} ${size}px ${style.font}`

    const fit = (pieces: SymbolPiece[], cap: number, width: number): number => {
      context.font = font(100)
      return Math.min(cap, (width / lineWidth(context, pieces, 100)) * 100)
    }

    context.save()
    context.translate(((index % cols) + 0.5) * cell, (Math.floor(index / cols) + 0.5) * cell)
    context.rotate(-paint.angle)

    if (sub) {
      const mainSize = fit(main, room * 0.78, room * 1.62)
      const subSize = fit(sub, mainSize * 0.62, room * 1.5)

      context.font = font(mainSize)
      drawLine(context, main, mainSize, -room * 0.04)
      context.font = font(subSize)
      drawLine(context, sub, subSize, -room * 0.04 + subSize * 1.02)
    } else {
      const size = fit(main, room * 1.05, room * 1.72)

      context.font = font(size)
      drawLine(context, main, size, size * 0.34)
    }

    context.restore()
  })
}

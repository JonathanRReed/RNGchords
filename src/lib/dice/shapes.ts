/**
 * Flat drawings of the six dice a player can pick, on a 100 by 100 grid.
 *
 * Each die is a silhouette cut into facets. A facet has a tone from -1 (in
 * shadow) to 1 (catching the light); themes decide how strongly the tones show.
 * The label sits on `face`, the facet that points at the player.
 */

export interface Facet {
  points: string
  tone: number
}

export interface DieShape {
  hull: string
  facets: Facet[]
  /** Centre of the front facet and how wide text can run there, in grid units. */
  label: { x: number; y: number; width: number }
  /** Highlight blob for glossy materials. */
  spec: { cx: number; cy: number; rx: number; ry: number; angle: number }
  /** Dice that draw pips on their side faces. */
  cube?: boolean
}

const D4: DieShape = {
  hull: '50,5 97,91 3,91',
  facets: [
    { points: '50,5 3,91 50,66', tone: 0.28 },
    { points: '50,5 97,91 50,66', tone: -0.12 },
    { points: '3,91 97,91 50,66', tone: -0.36 },
  ],
  label: { x: 50, y: 80, width: 58 },
  spec: { cx: 36, cy: 40, rx: 9, ry: 4, angle: -62 },
}

const D6: DieShape = {
  hull: '6,30 30,6 94,6 94,70 70,94 6,94',
  facets: [
    { points: '6,30 70,30 70,94 6,94', tone: 0.04 },
    { points: '6,30 30,6 94,6 70,30', tone: 0.34 },
    { points: '70,30 94,6 94,70 70,94', tone: -0.3 },
  ],
  label: { x: 38, y: 62, width: 56 },
  spec: { cx: 18, cy: 42, rx: 10, ry: 4, angle: -50 },
  cube: true,
}

const D8: DieShape = {
  hull: '50,3 94,50 50,97 6,50',
  facets: [
    { points: '50,3 94,50 6,50', tone: 0.22 },
    { points: '6,50 50,50 50,97', tone: -0.1 },
    { points: '94,50 50,50 50,97', tone: -0.38 },
  ],
  label: { x: 50, y: 37, width: 40 },
  spec: { cx: 36, cy: 24, rx: 9, ry: 3.5, angle: -38 },
}

const D10: DieShape = {
  hull: '50,3 96,38 50,97 4,38',
  facets: [
    { points: '50,3 4,38 50,48', tone: 0.34 },
    { points: '50,3 96,38 50,48', tone: 0.04 },
    { points: '4,38 50,48 96,38 50,97', tone: -0.06 },
    { points: '96,38 50,97 82,60', tone: -0.3 },
  ],
  label: { x: 46, y: 56, width: 40 },
  spec: { cx: 31, cy: 26, rx: 10, ry: 4, angle: -35 },
}

const D12: DieShape = {
  hull: '50,3 97,37 79,94 21,94 3,37',
  facets: [
    { points: '50,3 97,37 75,48 50,30', tone: 0.02 },
    { points: '97,37 79,94 66,77 75,48', tone: -0.26 },
    { points: '79,94 21,94 34,77 66,77', tone: -0.42 },
    { points: '21,94 3,37 25,48 34,77', tone: 0.02 },
    { points: '3,37 50,3 50,30 25,48', tone: 0.3 },
    { points: '50,30 75,48 66,77 34,77 25,48', tone: 0.08 },
  ],
  label: { x: 50, y: 57, width: 38 },
  spec: { cx: 33, cy: 22, rx: 9, ry: 4, angle: -30 },
}

const D20: DieShape = {
  hull: '50,3 93,27 93,73 50,97 7,73 7,27',
  facets: [
    { points: '50,3 7,27 50,22', tone: 0.32 },
    { points: '50,3 93,27 50,22', tone: 0.1 },
    { points: '7,27 7,73 16,70', tone: 0.2 },
    { points: '7,27 16,70 50,22', tone: 0.18 },
    { points: '93,27 50,22 84,70', tone: -0.14 },
    { points: '93,27 93,73 84,70', tone: -0.26 },
    { points: '7,73 50,97 16,70', tone: -0.02 },
    { points: '50,97 16,70 84,70', tone: -0.3 },
    { points: '50,97 93,73 84,70', tone: -0.42 },
    { points: '50,22 84,70 16,70', tone: 0.06 },
  ],
  label: { x: 50, y: 55, width: 40 },
  spec: { cx: 30, cy: 20, rx: 10, ry: 4, angle: -28 },
}

const SHAPES: Record<number, DieShape> = { 4: D4, 6: D6, 8: D8, 10: D10, 12: D12, 20: D20 }

export function getDieShape(faces: number): DieShape {
  return SHAPES[faces] ?? D6
}

/** Pip positions on a unit square for a face showing 1 to 6. */
const PIP_GRID: Record<number, Array<[number, number]>> = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.26, 0.26], [0.74, 0.26], [0.5, 0.5], [0.26, 0.74], [0.74, 0.74]],
  6: [[0.3, 0.24], [0.7, 0.24], [0.3, 0.5], [0.7, 0.5], [0.3, 0.76], [0.7, 0.76]],
}

export function getPips(count: number): Array<[number, number]> {
  return PIP_GRID[Math.min(6, Math.max(1, count))] ?? PIP_GRID[1]
}

/** Where the top and right faces of the cube sit, as SVG matrices that map a unit square onto each face. */
export const CUBE_FACE_MATRIX = {
  top: 'matrix(64 0 24 -24 6 30)',
  side: 'matrix(24 -24 0 64 70 30)',
} as const

/** A small stable number from a string, so every die keeps its look between renders. */
export function hashString(value: string): number {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

/**
 * What each table theme is made of. Colours stay in tokens.css, where the
 * rest of the page reads them; this file holds only what CSS cannot say, such
 * as how rough a surface is or how light passes through it.
 */

export type TableLook = 'felt' | 'velvet' | 'glass' | 'pads'

export interface DieLook {
  roughness: number
  clearcoat: number
  clearcoatRoughness: number
  /** 0 is solid. 1 lets light through, for glass. */
  transmission: number
  /** How far the die's own colour sits between its light and dark tokens. */
  shade: number
  /** Bevelled edges: the die's colour, worn lighter, lit from inside, or outlined dark. */
  edge: 'body' | 'worn' | 'lit' | 'dark'
  /** How strongly the lettering glows. 0 is plain ink. */
  glow: number
  bevel: number
  weight: number
}

export interface FloorLook {
  roughness: number
  /** Cloth nap that catches light at a grazing angle. */
  sheen: number
  pattern: 'baize' | 'pile' | 'grid' | 'dots'
  /** Lane markings: stitched boxes, ruled boxes, corner ticks, or pressed wells. */
  marks: 'stitched' | 'ruled' | 'ticks' | 'wells'
  grain: number
}

export interface Look {
  die: DieLook
  floor: FloorLook
  keyLight: number
  fillLight: number
  reflections: number
  /** 0 to 1: how dark the shadows under the dice get. */
  shadow: number
}

export const LOOKS: Record<TableLook, Look> = {
  felt: {
    die: { roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06, transmission: 0, shade: 0.6, edge: 'body', glow: 0, bevel: 0.07, weight: 700 },
    floor: { roughness: 1, sheen: 0.5, pattern: 'baize', marks: 'stitched', grain: 0.5 },
    keyLight: 2.1,
    fillLight: 0.14,
    reflections: 0.42,
    shadow: 0.72,
  },
  velvet: {
    die: { roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35, transmission: 0, shade: 0.3, edge: 'worn', glow: 0, bevel: 0.085, weight: 700 },
    floor: { roughness: 1, sheen: 1, pattern: 'pile', marks: 'ruled', grain: 0.6 },
    keyLight: 1.9,
    fillLight: 0.2,
    reflections: 0.4,
    shadow: 0.75,
  },
  glass: {
    die: { roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, transmission: 0.4, shade: 0.55, edge: 'lit', glow: 1.3, bevel: 0.05, weight: 600 },
    floor: { roughness: 0.55, sheen: 0, pattern: 'grid', marks: 'ticks', grain: 0.15 },
    keyLight: 1.5,
    fillLight: 0.15,
    reflections: 0.7,
    shadow: 0.45,
  },
  pads: {
    die: { roughness: 0.62, clearcoat: 0, clearcoatRoughness: 0, transmission: 0, shade: 0.35, edge: 'dark', glow: 0, bevel: 0.075, weight: 800 },
    floor: { roughness: 0.82, sheen: 0, pattern: 'dots', marks: 'wells', grain: 0.25 },
    keyLight: 2.1,
    fillLight: 0.3,
    reflections: 0.25,
    shadow: 0.85,
  },
}

export function isTableLook(value: unknown): value is TableLook {
  return typeof value === 'string' && value in LOOKS
}

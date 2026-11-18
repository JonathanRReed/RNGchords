/**
 * Where things sit on the table: how many dice fit across, where each one is
 * meant to land, where the camera stands, and where the walls are. Pure math,
 * shared by the physics and the renderer.
 */

import type { Vec3 } from './polyhedra'

export interface TrayLayout {
  cols: number
  rows: number
  /** Width over height of the tray on screen. */
  aspect: number
}

const LANE_WIDTH = 2.5
const LANE_DEPTH = 2.6
const PAD_X = 0.85
const PAD_NEAR = 0.95
const NARROW_PX = 560

export const CAMERA_TILT = (24 * Math.PI) / 180
export const CAMERA_FOV = 30

const TAN = Math.tan((CAMERA_FOV * Math.PI) / 360)
const SIN = Math.sin(CAMERA_TILT)
const COS = Math.cos(CAMERA_TILT)
/** Per unit of camera distance, how far in front of the aim point the bottom edge of the view meets the table. */
const NEAR_REACH = SIN - (COS * (SIN - TAN * COS)) / (COS + TAN * SIN)

/** How far back the camera stands to show every row with room in front for the captions. */
function depthDistance(rows: number): number {
  return ((rows * LANE_DEPTH) / 2 + PAD_NEAR) / NEAR_REACH
}

/** Half the table width the camera sees at the front edge of the lanes, for a camera at `distance`. */
function halfWidthSeen(distance: number, aspect: number, rows: number): number {
  return TAN * aspect * (distance - ((rows * LANE_DEPTH) / 2) * SIN)
}

export function trayLayout(count: number, widthPx: number): TrayLayout {
  const dice = Math.max(1, count)
  const narrow = widthPx < NARROW_PX
  const cols = narrow ? (dice <= 1 ? 1 : dice <= 4 ? 2 : 3) : dice <= 6 ? dice : 4
  const rows = Math.ceil(dice / cols)
  const natural = ((cols * LANE_WIDTH) / 2 + PAD_X) / halfWidthSeen(depthDistance(rows), 1, rows)
  const aspect = narrow ? Math.min(1.5, Math.max(0.8, natural)) : Math.min(2.8, Math.max(rows > 1 ? 1.5 : 2.2, natural))

  return { cols, rows, aspect: Math.round(aspect * 1000) / 1000 }
}

export interface Wall {
  /** A point on the wall and the direction pointing back into the tray. */
  point: Vec3
  normal: Vec3
}

export interface TrayGeometry {
  camera: Vec3
  /** Where each die is meant to come to rest, in order. */
  slots: Vec3[]
  walls: Wall[]
  /** Corners of the floor the camera can see: near-left, near-right, far-right, far-left. */
  floor: [Vec3, Vec3, Vec3, Vec3]
  nearZ: number
  farZ: number
}

function floorHit(camera: Vec3, aspect: number, x: number, y: number): Vec3 {
  const ray: Vec3 = [x * TAN * aspect, -COS + y * TAN * SIN, -SIN - y * TAN * COS]
  const reach = -camera[1] / ray[1]
  return [camera[0] + ray[0] * reach, 0, camera[2] + ray[2] * reach]
}

export function trayGeometry(count: number, layout: TrayLayout): TrayGeometry {
  const { cols, rows, aspect } = layout
  const halfWidth = (cols * LANE_WIDTH) / 2 + PAD_X
  // Back far enough for the rows, and further if the lanes would not fit across.
  const distance = Math.max(depthDistance(rows), halfWidth / (TAN * aspect) + ((rows * LANE_DEPTH) / 2) * SIN)
  const camera: Vec3 = [0, COS * distance, SIN * distance]
  const nearRight = floorHit(camera, aspect, 1, -1)
  const farRight = floorHit(camera, aspect, 1, 1)
  const nearLeft: Vec3 = [-nearRight[0], 0, nearRight[2]]
  const farLeft: Vec3 = [-farRight[0], 0, farRight[2]]
  const slots: Vec3[] = []

  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / cols)
    const inRow = Math.min(cols, count - row * cols)
    const col = index - row * cols
    slots.push([(col - (inRow - 1) / 2) * LANE_WIDTH, 0, (row - (rows - 1) / 2) * LANE_DEPTH])
  }

  const slope = (farRight[0] - nearRight[0]) / (nearRight[2] - farRight[2])
  const sideLength = Math.hypot(1, slope)
  // A die is tall, and near the edges of the view its top leans outward, so the walls stand in from the edge.
  const sideInset = 0.62
  const farInset = 0.85

  return {
    camera,
    slots,
    floor: [nearLeft, nearRight, farRight, farLeft],
    nearZ: nearRight[2],
    farZ: farRight[2],
    walls: [
      { point: [0, 0, nearRight[2] - 0.3], normal: [0, 0, -1] },
      { point: [0, 0, farRight[2] + farInset], normal: [0, 0, 1] },
      { point: [nearRight[0] - sideInset, 0, nearRight[2]], normal: [-1 / sideLength, 0, -slope / sideLength] },
      { point: [-nearRight[0] + sideInset, 0, nearRight[2]], normal: [1 / sideLength, 0, -slope / sideLength] },
    ],
  }
}

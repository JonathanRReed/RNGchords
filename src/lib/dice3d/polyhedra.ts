/**
 * The six dice as solids. Pure math, so the physics, the renderer, and the
 * tests all read the same shapes.
 *
 * Each solid is listed as corner points only. The faces are found from those
 * corners, which keeps the tables short and rules out a mistyped face.
 */

export type Vec3 = readonly [number, number, number]

export interface Face {
  /** Corner indices, counter-clockwise seen from outside. */
  corners: number[]
  normal: Vec3
  center: Vec3
  /** In-plane axes for laying text on the face. `up` points at the top of the text. */
  right: Vec3
  up: Vec3
  /** Radius of the largest circle that fits inside the face. */
  inradius: number
}

export interface Polyhedron {
  sides: number
  corners: Vec3[]
  faces: Face[]
  /** Distance from the centre to a face, which is how high the die sits at rest. */
  restHeight: number
  /** Distance from the centre to the furthest corner. */
  reach: number
}

const PHI = (1 + Math.sqrt(5)) / 2

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s]
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2])
export const normalize = (a: Vec3): Vec3 => scale(a, 1 / (length(a) || 1))

function signs(point: Vec3): Vec3[] {
  const out: Vec3[] = []

  for (const x of point[0] === 0 ? [0] : [point[0], -point[0]]) {
    for (const y of point[1] === 0 ? [0] : [point[1], -point[1]]) {
      for (const z of point[2] === 0 ? [0] : [point[2], -point[2]]) {
        out.push([x, y, z])
      }
    }
  }

  return out
}

function cyclic(point: Vec3): Vec3[] {
  const [a, b, c] = point
  return [...signs([a, b, c]), ...signs([c, a, b]), ...signs([b, c, a])]
}

function trapezohedron(): Vec3[] {
  const apex = 1.06
  // The one ring height that keeps every kite flat.
  const ring = (apex * (1 - Math.cos(Math.PI / 5))) / (1 + Math.cos(Math.PI / 5))
  const corners: Vec3[] = [
    [0, apex, 0],
    [0, -apex, 0],
  ]

  for (let step = 0; step < 10; step += 1) {
    const angle = (step * Math.PI) / 5
    corners.push([Math.cos(angle), step % 2 === 0 ? ring : -ring, Math.sin(angle)])
  }

  return corners
}

/** Corner points and the size each die is scaled to, as the distance to its furthest corner. */
const SOLIDS: Record<number, { corners: Vec3[]; reach: number }> = {
  4: { corners: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]], reach: 1.02 },
  6: { corners: signs([1, 1, 1]), reach: 0.9 },
  8: { corners: cyclic([1, 0, 0]), reach: 0.98 },
  10: { corners: trapezohedron(), reach: 1.0 },
  12: { corners: [...signs([1, 1, 1]), ...cyclic([0, 1 / PHI, PHI])], reach: 0.96 },
  20: { corners: cyclic([0, 1, PHI]), reach: 1.0 },
}

const EPSILON = 1e-6

function findFaces(corners: Vec3[]): number[][] {
  const found = new Map<string, number[]>()

  for (let a = 0; a < corners.length; a += 1) {
    for (let b = a + 1; b < corners.length; b += 1) {
      for (let c = b + 1; c < corners.length; c += 1) {
        const normal = cross(sub(corners[b]!, corners[a]!), sub(corners[c]!, corners[a]!))

        if (length(normal) < EPSILON) {
          continue
        }

        const offsets = corners.map((corner) => dot(normal, sub(corner, corners[a]!)))
        const above = offsets.some((value) => value > EPSILON)
        const below = offsets.some((value) => value < -EPSILON)

        if (above && below) {
          continue
        }

        const members = offsets.flatMap((value, index) => (Math.abs(value) <= EPSILON ? [index] : []))
        found.set(members.join(','), members)
      }
    }
  }

  return [...found.values()]
}

function buildFace(corners: Vec3[], members: number[]): Face {
  const center = scale(members.reduce<Vec3>((sum, index) => add(sum, corners[index]!), [0, 0, 0]), 1 / members.length)
  const [first, second, third] = members.map((index) => corners[index]!) as [Vec3, Vec3, Vec3]
  const flat = normalize(cross(sub(second, first), sub(third, first)))
  const normal = dot(flat, center) < 0 ? scale(flat, -1) : flat
  const axis = normalize(sub(corners[members[0]!]!, center))
  const side = cross(normal, axis)
  const ordered = [...members].sort((left, right) => {
    const angle = (index: number) => {
      const offset = sub(corners[index]!, center)
      return Math.atan2(dot(offset, side), dot(offset, axis))
    }

    return angle(left) - angle(right)
  })

  let inradius = Infinity

  for (let index = 0; index < ordered.length; index += 1) {
    const from = corners[ordered[index]!]!
    const to = corners[ordered[(index + 1) % ordered.length]!]!
    const edge = normalize(sub(to, from))
    const toCenter = sub(center, from)
    inradius = Math.min(inradius, length(sub(toCenter, scale(edge, dot(toCenter, edge)))))
  }

  // Text reads best with a corner at the top on odd faces and an edge at the top on even ones.
  // On the d10 kite the long corner, which is the apex, goes on top.
  let peak = ordered[0]!

  for (const index of ordered) {
    if (length(sub(corners[index]!, center)) > length(sub(corners[peak]!, center)) + EPSILON) {
      peak = index
    }
  }

  let up = normalize(sub(corners[peak]!, center))

  if (ordered.length === 4 && Math.abs(length(sub(corners[ordered[0]!]!, center)) - length(sub(corners[ordered[1]!]!, center))) < EPSILON) {
    up = normalize(sub(scale(add(corners[ordered[0]!]!, corners[ordered[1]!]!), 0.5), center))
  }

  return { corners: ordered, normal, center, up, right: cross(up, normal), inradius }
}

const cache = new Map<number, Polyhedron>()

export function getPolyhedron(sides: number): Polyhedron {
  const key = SOLIDS[sides] ? sides : 6
  const cached = cache.get(key)

  if (cached) {
    return cached
  }

  const solid = SOLIDS[key]!
  const raw = solid.corners
  const size = solid.reach / Math.max(...raw.map(length))
  const corners = raw.map((corner) => scale(corner, size))
  const faces = findFaces(corners).map((members) => buildFace(corners, members))
  const polyhedron: Polyhedron = {
    sides: key,
    corners,
    faces,
    restHeight: Math.min(...faces.map((face) => dot(face.center, face.normal))),
    reach: solid.reach,
  }

  cache.set(key, polyhedron)
  return polyhedron
}

/* ---------- Quaternions, as [x, y, z, w] ---------- */

export type Quat = readonly [number, number, number, number]

export function rotate(q: Quat, v: Vec3): Vec3 {
  const u: Vec3 = [q[0], q[1], q[2]]
  const t = scale(cross(u, v), 2)
  return add(add(v, scale(t, q[3])), cross(u, t))
}

export function multiply(a: Quat, b: Quat): Quat {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ]
}

export function fromAxisAngle(axis: Vec3, angle: number): Quat {
  const unit = normalize(axis)
  const half = Math.sin(angle / 2)
  return [unit[0] * half, unit[1] * half, unit[2] * half, Math.cos(angle / 2)]
}

/** The shortest turn that carries one direction onto another. */
export function between(from: Vec3, to: Vec3): Quat {
  const a = normalize(from)
  const b = normalize(to)
  const cosine = dot(a, b)

  if (cosine < -1 + EPSILON) {
    const spare: Vec3 = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]
    return fromAxisAngle(cross(a, spare), Math.PI)
  }

  const axis = cross(a, b)
  const q: Quat = [axis[0], axis[1], axis[2], 1 + cosine]
  const size = Math.hypot(...q) || 1
  return [q[0] / size, q[1] / size, q[2] / size, q[3] / size]
}

const UP: Vec3 = [0, 1, 0]

/** A resting pose: the given face flat on the table, then spun by `yaw` about the vertical. */
export function restOrientation(polyhedron: Polyhedron, faceDown: number, yaw: number): Quat {
  const face = polyhedron.faces[faceDown] ?? polyhedron.faces[0]!
  return multiply(fromAxisAngle(UP, yaw), between(face.normal, [0, -1, 0]))
}

/**
 * The face a player reads the result from. Every die but the d4 shows it on
 * top. A d4 has no top face, so it is the upright face turned most toward the
 * viewer.
 */
export function readFace(polyhedron: Polyhedron, orientation: Quat, towardViewer: Vec3): number {
  let best = 0
  let bestScore = -Infinity

  polyhedron.faces.forEach((face, index) => {
    const normal = rotate(orientation, face.normal)
    const lift = dot(normal, UP)
    const score = polyhedron.sides === 4 ? (lift < -0.5 ? -Infinity : dot(normal, towardViewer)) : lift

    if (score > bestScore) {
      bestScore = score
      best = index
    }
  })

  return best
}

/** How far the die is from lying flat on a face: 0 is flat, larger is leaning. */
export function tiltFromFlat(polyhedron: Polyhedron, orientation: Quat): number {
  let lowest = 1

  for (const face of polyhedron.faces) {
    lowest = Math.min(lowest, dot(rotate(orientation, face.normal), UP))
  }

  return 1 + lowest
}

/* ---------- Mesh: flat faces joined by narrow bevels ---------- */

export interface DieMesh {
  positions: number[]
  normals: number[]
  /** Which atlas cell each vertex reads from: a face index, or -1 for the bevel. */
  cells: number[]
  /** Position inside the cell, from -1 to 1 on both axes. */
  local: number[]
}

/**
 * Triangles for a die with its edges and corners cut back. The bevel faces
 * borrow the normals of the faces they join, so light rolls across them the
 * way it does on a tumbled edge.
 */
export function buildDieMesh(polyhedron: Polyhedron, bevel: number): DieMesh {
  const mesh: DieMesh = { positions: [], normals: [], cells: [], local: [] }
  const inset = new Map<string, Vec3>()
  const cornerKey = (face: number, corner: number) => `${face}:${corner}`

  const push = (point: Vec3, normal: Vec3, cell: number, local: readonly [number, number]) => {
    mesh.positions.push(...point)
    mesh.normals.push(...normal)
    mesh.cells.push(cell)
    mesh.local.push(...local)
  }

  polyhedron.faces.forEach((face, faceIndex) => {
    const count = face.corners.length
    const points = face.corners.map((index) => polyhedron.corners[index]!)
    const extent = Math.max(...points.map((point) => length(sub(point, face.center))))
    const moved = points.map((point, index) => {
      const previous = points[(index + count - 1) % count]!
      const next = points[(index + 1) % count]!
      const toPrevious = normalize(sub(previous, point))
      const toNext = normalize(sub(next, point))
      const half = Math.acos(Math.min(1, Math.max(-1, dot(toPrevious, toNext)))) / 2
      return add(point, scale(normalize(add(toPrevious, toNext)), bevel / Math.sin(half)))
    })

    moved.forEach((point, index) => inset.set(cornerKey(faceIndex, face.corners[index]!), point))

    const place = (point: Vec3): readonly [number, number] => {
      const offset = sub(point, face.center)
      return [dot(offset, face.right) / extent, dot(offset, face.up) / extent]
    }

    for (let index = 1; index < count - 1; index += 1) {
      for (const point of [moved[0]!, moved[index]!, moved[index + 1]!]) {
        push(point, face.normal, faceIndex, place(point))
      }
    }
  })

  const facesAt = new Map<number, number[]>()
  const edges = new Map<string, Array<{ face: number; from: number; to: number }>>()

  polyhedron.faces.forEach((face, faceIndex) => {
    face.corners.forEach((corner, index) => {
      const next = face.corners[(index + 1) % face.corners.length]!
      const key = corner < next ? `${corner}-${next}` : `${next}-${corner}`
      edges.set(key, [...(edges.get(key) ?? []), { face: faceIndex, from: corner, to: next }])
      facesAt.set(corner, [...(facesAt.get(corner) ?? []), faceIndex])
    })
  })

  const bevelTriangle = (points: Vec3[], normals: Vec3[]) => {
    const facing = cross(sub(points[1]!, points[0]!), sub(points[2]!, points[0]!))
    const order = dot(facing, add(add(points[0]!, points[1]!), points[2]!)) >= 0 ? [0, 1, 2] : [0, 2, 1]

    for (const index of order) {
      push(points[index]!, normals[index]!, -1, [0, 0])
    }
  }

  for (const pair of edges.values()) {
    const [first, second] = pair

    if (!first || !second) {
      continue
    }

    const a1 = inset.get(cornerKey(first.face, first.from))!
    const a2 = inset.get(cornerKey(first.face, first.to))!
    const b1 = inset.get(cornerKey(second.face, first.from))!
    const b2 = inset.get(cornerKey(second.face, first.to))!
    const na = polyhedron.faces[first.face]!.normal
    const nb = polyhedron.faces[second.face]!.normal

    bevelTriangle([a1, a2, b2], [na, na, nb])
    bevelTriangle([a1, b2, b1], [na, nb, nb])
  }

  for (const [corner, faceList] of facesAt) {
    const point = polyhedron.corners[corner]!
    const axis = normalize(point)
    const spare: Vec3 = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
    const side = normalize(cross(axis, spare))
    const forward = cross(axis, side)
    const ring = faceList
      .map((face) => ({ face, point: inset.get(cornerKey(face, corner))! }))
      .sort((left, right) => {
        const angle = (entry: { point: Vec3 }) => Math.atan2(dot(sub(entry.point, point), forward), dot(sub(entry.point, point), side))
        return angle(left) - angle(right)
      })

    for (let index = 1; index < ring.length - 1; index += 1) {
      const trio = [ring[0]!, ring[index]!, ring[index + 1]!]
      bevelTriangle(
        trio.map((entry) => entry.point),
        trio.map((entry) => polyhedron.faces[entry.face]!.normal),
      )
    }
  }

  return mesh
}

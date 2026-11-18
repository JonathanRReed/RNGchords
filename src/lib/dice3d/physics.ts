/**
 * The throw. Dice are simulated as rigid bodies ahead of time and the whole
 * flight is recorded, so the renderer only plays it back. Knowing the ending
 * before the first frame is what lets the chord be painted on the face that
 * will finish on top, and lets every knock be heard at the moment it happens.
 */

import { Body, Box, ConvexPolyhedron, ContactMaterial, Material, Plane, Quaternion, Vec3 as CVec3, World } from 'cannon-es'
import type { TrayGeometry } from './layout'
import { getPolyhedron, readFace, tiltFromFlat, type Quat, type Vec3 } from './polyhedra'

export type ThrowStyle = 'throw' | 'drop'

export interface Pose {
  position: Vec3
  orientation: Quat
}

export interface ThrowDie {
  sides: number
  /** Dice that stay where they are give their resting pose. */
  rest?: Pose
}

export type ImpactKind = 'table' | 'wall' | 'die'

export interface Impact {
  /** Seconds from the start of the throw. */
  time: number
  /** 0 to 1. */
  strength: number
  kind: ImpactKind
}

export interface ThrowResult {
  /** Seconds between recorded frames. */
  step: number
  frameCount: number
  /** Seven numbers per die per frame: position, then orientation. */
  frames: Float32Array
  /** Where each die ends up, and the face its result is read from. */
  finals: Array<Pose & { face: number }>
  impacts: Impact[]
  duration: number
}

const GRAVITY = 46
const STEP = 1 / 120
const RECORD_EVERY = 2
const MAX_SECONDS = 4.2
const MAX_TRIES = 10
const BUDGET_MS = 90
const FLAT_ENOUGH = 0.004
/** Impacts softer than this are a die settling, not a knock worth hearing. */
/** Further than this from its lane and a die reads as sitting in the wrong one. */
const STRAY = 1.05
const QUIET = 1.1
const LOUD = 16

/**
 * How a toss is aimed. `carry` is the share of the way to its lane a die
 * covers in the air; rounder dice roll further, so they are thrown shorter.
 */
const AIM = { carry: 0.68, perSide: -0.011, drag: 0.6, spinDrag: 0.6, spinDragPerSide: 0.015, dish: 18 }

function seededRandom(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

const shapes = new Map<number, Box | ConvexPolyhedron>()

function shapeFor(sides: number): Box | ConvexPolyhedron {
  const polyhedron = getPolyhedron(sides)
  const cached = shapes.get(polyhedron.sides)

  if (cached) {
    return cached
  }

  const shape =
    polyhedron.sides === 6
      ? new Box(new CVec3(polyhedron.restHeight, polyhedron.restHeight, polyhedron.restHeight))
      : new ConvexPolyhedron({
          vertices: polyhedron.corners.map((corner) => new CVec3(corner[0], corner[1], corner[2])),
          faces: polyhedron.faces.map((face) => [...face.corners]),
        })

  shapes.set(polyhedron.sides, shape)
  return shape
}

function randomOrientation(random: () => number): Quaternion {
  const u = random()
  const v = random() * Math.PI * 2
  const w = random() * Math.PI * 2
  return new Quaternion(Math.sqrt(1 - u) * Math.sin(v), Math.sqrt(1 - u) * Math.cos(v), Math.sqrt(u) * Math.sin(w), Math.sqrt(u) * Math.cos(w))
}

interface Attempt {
  result: ThrowResult
  /** How badly the dice ended: leaning, stacked, or far from their lanes. */
  fault: number
}

function attempt(dice: ThrowDie[], tray: TrayGeometry, style: ThrowStyle, seed: number, towardViewer: Vec3): Attempt {
  const random = seededRandom(seed)
  const world = new World({ gravity: new CVec3(0, -GRAVITY, 0) })
  const dieMaterial = new Material('die')
  const tableMaterial = new Material('table')
  const wallMaterial = new Material('wall')

  world.allowSleep = true
  world.addContactMaterial(new ContactMaterial(dieMaterial, tableMaterial, { friction: 0.42, restitution: 0.3 }))
  world.addContactMaterial(new ContactMaterial(dieMaterial, wallMaterial, { friction: 0.1, restitution: 0.45 }))
  world.addContactMaterial(new ContactMaterial(dieMaterial, dieMaterial, { friction: 0.2, restitution: 0.4 }))

  const table = new Body({ mass: 0, shape: new Plane(), material: tableMaterial })
  table.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
  world.addBody(table)

  const wallBodies = new Set<Body>()
  // The wall on the player's side goes up only once the dice have been thrown past it.
  let gate: Body | null = null

  tray.walls.forEach((wall, index) => {
    const body = new Body({ mass: 0, shape: new Plane(), material: wallMaterial })
    body.position.set(wall.point[0], wall.point[1], wall.point[2])
    body.quaternion.setFromVectors(new CVec3(0, 0, 1), new CVec3(wall.normal[0], wall.normal[1], wall.normal[2]))
    wallBodies.add(body)

    if (index === 0 && style === 'throw') {
      gate = body
    } else {
      world.addBody(body)
    }
  })

  const impacts: Impact[] = []
  let clock = 0

  const bodies = dice.map((die, index) => {
    const polyhedron = getPolyhedron(die.sides)
    const slot = tray.slots[index] ?? [0, 0, 0]
    const body = new Body({
      mass: die.rest ? 0 : 1,
      shape: shapeFor(die.sides),
      material: dieMaterial,
      linearDamping: 0.05,
      angularDamping: 0.05,
      sleepSpeedLimit: 0.25,
      sleepTimeLimit: 0.2,
    })
    let landed = false

    if (die.rest) {
      body.position.set(...die.rest.position)
      body.quaternion.set(...die.rest.orientation)
    } else if (style === 'drop') {
      body.position.set(slot[0] + (random() - 0.5) * 0.5, 3.6 + random() * 1.6, slot[2] + (random() - 0.5) * 0.5)
      body.quaternion.copy(randomOrientation(random))
      body.velocity.set((random() - 0.5) * 1.6, -2 - random() * 3, (random() - 0.5) * 1.6)
      body.angularVelocity.set((random() - 0.5) * 9, (random() - 0.5) * 9, (random() - 0.5) * 9)
    } else {
      // Tossed from the player's edge toward the die's lane. It lands a little
      // short and tumbles the rest of the way.
      const startZ = tray.nearZ + 1.3 + random() * 0.5
      const startX = slot[0] * 0.9 + (random() - 0.5) * 0.4
      const run = startZ - slot[2]
      const height = 1.2 + random() * 0.7 + polyhedron.reach
      const rise = 1.5 + random() * 2
      // Time in the air, from the rise and the drop back to the table.
      const air = (rise + Math.sqrt(rise * rise + 2 * GRAVITY * (height - polyhedron.restHeight))) / GRAVITY
      const carry = AIM.carry + AIM.perSide * polyhedron.sides

      body.position.set(startX, height, startZ)
      body.quaternion.copy(randomOrientation(random))
      body.velocity.set(((slot[0] - startX) * carry) / air, rise, (-run * carry) / air)
      body.angularVelocity.set(-(8 + random() * 8), (random() - 0.5) * 5, (random() - 0.5) * 5)
    }

    body.addEventListener('collide', (event: { body: Body; contact: { getImpactVelocityAlongNormal(): number } }) => {
      const other = event.body
      const againstDie = other.material === dieMaterial

      // A pair of dice reports the same knock twice. Keep one.
      if (againstDie && other.id < body.id && other.mass > 0) {
        return
      }

      // Cloth soaks up a die's spin once it touches down.
      if (!landed && body.mass > 0) {
        landed = true
        landedBodies.push({ body, slot })
        body.linearDamping = AIM.drag
        body.angularDamping = AIM.spinDrag + AIM.spinDragPerSide * polyhedron.sides
      }

      const speed = Math.abs(event.contact.getImpactVelocityAlongNormal())

      if (speed < QUIET) {
        return
      }

      impacts.push({
        time: clock,
        strength: Math.min(1, (speed - QUIET) / (LOUD - QUIET)),
        kind: againstDie ? 'die' : wallBodies.has(other) ? 'wall' : 'table',
      })
    })

    world.addBody(body)
    return body
  })

  // Each lane is very slightly dished, so a die that has landed drifts back
  // toward its own spot instead of wandering into a neighbour's.
  const landedBodies: Array<{ body: Body; slot: Vec3 }> = []

  world.addEventListener('preStep', () => {
    for (const { body, slot } of landedBodies) {
      if (body.sleepState !== Body.SLEEPING) {
        body.force.x += (slot[0] - body.position.x) * AIM.dish
        body.force.z += (slot[2] - body.position.z) * AIM.dish
      }
    }
  })

  const maxFrames = Math.ceil(MAX_SECONDS / (STEP * RECORD_EVERY)) + 1
  const frames = new Float32Array(maxFrames * dice.length * 7)
  let frameCount = 0

  const record = () => {
    bodies.forEach((body, index) => {
      const at = (frameCount * dice.length + index) * 7
      frames[at] = body.position.x
      frames[at + 1] = body.position.y
      frames[at + 2] = body.position.z
      frames[at + 3] = body.quaternion.x
      frames[at + 4] = body.quaternion.y
      frames[at + 5] = body.quaternion.z
      frames[at + 6] = body.quaternion.w
    })
    frameCount += 1
  }

  record()

  for (let tick = 1; clock < MAX_SECONDS; tick += 1) {
    world.step(STEP)
    clock = tick * STEP

    if (gate && bodies.every((body, index) => body.position.z < (gate as Body).position.z - getPolyhedron(dice[index]!.sides).reach - 0.05)) {
      world.addBody(gate)
      gate = null
    }

    if (tick % RECORD_EVERY === 0) {
      record()
    }

    if (clock > 0.35 && bodies.every((body) => body.mass === 0 || body.sleepState === Body.SLEEPING)) {
      break
    }
  }

  // Close on the exact resting pose even if the loop stopped between recordings.
  if (frameCount < maxFrames) {
    record()
  }

  let fault = 0

  const finals = bodies.map((body, index) => {
    const polyhedron = getPolyhedron(dice[index]!.sides)
    const orientation: Quat = [body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w]
    const position: Vec3 = [body.position.x, body.position.y, body.position.z]

    if (body.mass > 0) {
      const slot = tray.slots[index] ?? [0, 0, 0]
      const leaning = tiltFromFlat(polyhedron, orientation)
      const lifted = Math.abs(position[1] - polyhedron.restHeight)
      const moving = body.sleepState === Body.SLEEPING ? 0 : 1
      const astray = Math.hypot(position[0] - slot[0], position[2] - slot[2])

      fault += (leaning > FLAT_ENOUGH ? 10 : 0) + (lifted > 0.05 ? 10 : 0) + moving * 5 + (astray > STRAY ? 3 + astray : astray * 0.2)
    }

    return { position, orientation, face: readFace(polyhedron, orientation, towardViewer) }
  })

  return {
    fault,
    result: {
      step: STEP * RECORD_EVERY,
      frameCount,
      frames: frames.slice(0, frameCount * dice.length * 7),
      finals,
      impacts,
      duration: (frameCount - 1) * STEP * RECORD_EVERY,
    },
  }
}

/**
 * Simulates a throw and returns its recording. A few throws are tried and the
 * tidiest one is kept: every die flat on the table, near its own lane.
 */
export function simulateThrow(dice: ThrowDie[], tray: TrayGeometry, style: ThrowStyle, seed: number, towardViewer: Vec3): ThrowResult {
  let best: Attempt | null = null
  const started = performance.now()

  for (let tries = 0; tries < MAX_TRIES; tries += 1) {
    const current = attempt(dice, tray, style, seed + tries * 7919, towardViewer)

    if (!best || current.fault < best.fault) {
      best = current
    }

    // Good enough, or out of time: the throw has to start while the click still feels live.
    if (best.fault < 2.5 || performance.now() - started > BUDGET_MS) {
      break
    }
  }

  return best!.result
}

import { type Transition } from 'motion/react'

interface DieLandingState {
  rotate: number
  x: number
  y: number
}

function getDieLandingState(value: number, faces: number, impulse: number): DieLandingState {
  const seed = value * 37 + faces * 11 + impulse * 19
  const sign = (seed & 1) === 0 ? 1 : -1
  const rnd = ((seed * 2654435761) >>> 0) / 0xffffffff

  // The dice live in an aligned grid, so they must come to REST nearly flat and
  // centred — a few degrees of stray tilt across a row reads as "broken", not
  // "hand-tossed". Keep these resting offsets tiny; the air motion does the work.
  return {
    rotate: Math.round((rnd * 2 - 1) * sign * 100) / 100,
    x: Math.round((rnd * 2 - 1) * sign * 100) / 100,
    y: Math.round((rnd * 1.4 - 0.7) * sign * 100) / 100,
  }
}

// Single weighted dice-roll: one forward somersault that lands flat, with
// squash & stretch on impact, a shadow that shrinks at apex and snaps wide on
// landing, a brief motion-blur on the metadata, and a ground impact ring.
//
// The die is a flat card, so a full somersault would hide the value while the
// face points away from the viewer. The card carries a real back face
// (.die-card__back) so the flipping die always shows a side — the value on the
// way up and at rest, the blank underside mid-flip — instead of vanishing.

export interface DiceMotionPlan {
  bodyAnimate: any
  bodyTransition: Transition
  shadowAnimate: any
  shadowTransition: Transition
  metaAnimate: any
  metaTransition: Transition
  impactAnimate: any
  impactTransition: Transition
  glintAnimate: any
  glintTransition: Transition
}

const TOKENS = {
  duration: 0.66,
  delayStep: 0.04,
  lift: 70,
  bounce: 9,
  rotateX: 360,
  rotate: 9,
  shadowStretch: 1.28,
  shadowOpacity: 0.42,
}

export function getDiceMotionPlan({
  value,
  faces,
  impulse,
  sequence,
  reducedMotion,
}: {
  value: number
  faces: number
  impulse: number
  sequence: number
  reducedMotion: boolean
}): DiceMotionPlan {
  const landing = getDieLandingState(value, faces, impulse)

  if (reducedMotion) {
    // Honour prefers-reduced-motion: the value swaps with no vestibular
    // movement at all. The card simply rests in place; React already remounts
    // it with the new value, so nothing else is needed to convey the change.
    return {
      bodyAnimate: { x: 0, y: 0, rotateX: 0, rotateY: 0, rotateZ: 0, rotate: 0, scaleX: 1, scaleY: 1 },
      bodyTransition: { duration: 0 },
      shadowAnimate: { scaleX: 1, scaleY: 1, opacity: 0.24 },
      shadowTransition: { duration: 0 },
      metaAnimate: { opacity: 1, filter: 'blur(0px)', y: 0, scale: 1 },
      metaTransition: { duration: 0 },
      impactAnimate: { opacity: 0, scaleX: 0.6, scaleY: 0.6 },
      impactTransition: { duration: 0 },
      glintAnimate: { opacity: 0 },
      glintTransition: { duration: 0 },
    }
  }

  const tokens = TOKENS
  const seed = value * 37 + faces * 11 + impulse * 19 + sequence * 13
  const rnd1 = ((seed * 2654435761) >>> 0) / 0xffffffff
  const rnd2 = ((seed * 40503) >>> 0) / 0xffffffff
  const rnd3 = ((seed * 1597334677) >>> 0) / 0xffffffff
  const sign = (seed & 1) === 0 ? 1 : -1
  const yawSign = (seed & 2) === 0 ? 1 : -1

  // One full forward somersault (lands face-up). Sign only flips the slight
  // settle wobble, not the somersault direction, so every die tips forward.
  // rnd3 adds per-die variance so no two dice tumble identically.
  const totalRotateX = tokens.rotateX
  // Z spin wobbles freely in the air, then settles to landing.rotate, which is
  // nearly flat — so the row of dice ends up aligned, not askew.
  const restZ = landing.rotate
  const airZ = sign * (5 + rnd1 * 6)
  const apexLift = tokens.lift * (0.82 + rnd2 * 0.34)
  // A small side-to-side yaw that returns to face-front, so the toss reads as
  // 3D and hand-thrown rather than a flat flip on rails. Stays well inside ±90°
  // so the value never turns away.
  const yaw = yawSign * (7 + rnd3 * 11)
  const drift = landing.x * (1 + rnd3 * 0.4)

  const duration = tokens.duration + rnd1 * 0.1
  const delay = sequence * tokens.delayStep + rnd2 * 0.04

  // Six keyframes: rest -> apex -> impact -> settle-up -> settle-down -> final
  const times = [0, 0.36, 0.6, 0.76, 0.88, 1]

  return {
    bodyAnimate: {
      y: [0, -apexLift, tokens.bounce, -tokens.bounce * 0.26, 0, landing.y],
      x: [0, drift * 0.3, drift * 0.6, drift * 0.85, drift * 0.95, landing.x],
      rotateX: [0, totalRotateX * 0.5, totalRotateX * 0.82, totalRotateX * 0.94, totalRotateX, totalRotateX],
      rotateY: [0, yaw, yaw * 0.45, -yaw * 0.2, yaw * 0.05, 0],
      rotateZ: [0, airZ * 0.5, airZ, airZ * 0.45, restZ * 1.8, restZ],
      // Gentle stretch up, modest squash on impact, settle to rest.
      scaleX: [1, 1.03, 1.05, 0.97, 1.005, 1],
      scaleY: [1, 0.97, 0.95, 1.04, 0.995, 1],
    },
    bodyTransition: {
      duration,
      delay,
      times,
      ease: [0.32, 0.72, 0.28, 1.04],
      // Spin decelerates into the landing so the die reads as a solid object
      // settling, not a motor winding down.
      rotateX: { duration, delay, times, ease: [0.16, 0.84, 0.32, 1] },
      rotateY: { duration, delay, times, ease: [0.16, 0.84, 0.32, 1] },
      y: { duration, delay, times, ease: [0.22, 0.68, 0.32, 1] },
    },
    shadowAnimate: {
      scaleX: [1, 0.7, tokens.shadowStretch, 1.05, 1.01, 1],
      scaleY: [1, 0.72, tokens.shadowStretch * 0.9, 1.02, 1, 1],
      opacity: [0.28, 0.08, tokens.shadowOpacity, 0.3, 0.26, 0.26],
    },
    shadowTransition: {
      duration,
      delay,
      times,
      ease: 'easeOut',
    },
    metaAnimate: {
      opacity: [1, 0.72, 0.92, 0.99, 1, 1],
      filter: ['blur(0px)', 'blur(1.4px)', 'blur(0.5px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
    },
    metaTransition: {
      duration,
      delay,
      times,
      ease: 'easeOut',
      filter: { duration, delay, times, ease: 'easeOut' },
    },
    // Ground impact ring: dead until the die strikes the felt (~0.6), then a
    // quick flash that expands and fades — the "thud" payoff for the squash.
    impactAnimate: {
      opacity: [0, 0, 0.55, 0.3, 0, 0],
      scaleX: [0.55, 0.55, 1, 1.3, 1.55, 1.55],
      scaleY: [0.55, 0.55, 0.95, 1.2, 1.45, 1.45],
    },
    impactTransition: {
      duration,
      delay,
      times,
      ease: 'easeOut',
    },
    // A single specular highlight sweeps across the gem just after it settles —
    // the casino-jewel catch-the-light moment that rewards the roll.
    glintAnimate: {
      x: ['-130%', '130%'],
      opacity: [0, 0.85, 0],
    },
    glintTransition: {
      duration: 0.5,
      delay: delay + duration * 0.82 + sequence * 0.015,
      ease: 'easeOut',
      opacity: { duration: 0.5, delay: delay + duration * 0.82 + sequence * 0.015, times: [0, 0.45, 1], ease: 'easeOut' },
    },
  }
}

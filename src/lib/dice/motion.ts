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

  return {
    rotate: Math.round(rnd * 14 - 7) * sign,
    x: Math.round((rnd * 10 - 5) * sign * 100) / 100,
    y: Math.round((rnd * 6 - 3) * sign * 100) / 100,
  }
}

// Single premium dice roll animation.
// Squash & stretch, heavy bounce, shadow shrink/grow, motion blur, wobble settle.

export interface DiceMotionPlan {
  bodyAnimate: any
  bodyTransition: Transition
  shadowAnimate: any
  shadowTransition: Transition
  metaAnimate: any
  metaTransition: Transition
}

const TOKENS = {
  duration: 0.9,
  delayStep: 0.06,
  lift: 76,
  bounce: 10,
  rotateX: 720,
  rotateY: 360,
  rotate: 10,
  shadowStretch: 1.3,
  shadowOpacity: 0.4,
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
    const duration = 0.34
    const delay = sequence * 0.02

    return {
      bodyAnimate: {
        y: [0, -10, 0],
        rotate: [0, landing.rotate, 0],
        scale: [1, 0.98, 1],
      },
      bodyTransition: {
        duration,
        delay,
        times: [0, 0.45, 1],
        ease: 'easeOut',
      },
      shadowAnimate: {
        scaleX: [0.92, 1.02, 1],
        scaleY: [0.92, 0.98, 1],
        opacity: [0.2, 0.26, 0.22],
      },
      shadowTransition: {
        duration,
        delay,
        times: [0, 0.45, 1],
        ease: 'easeOut',
      },
      metaAnimate: {
        opacity: [1, 0.78, 1],
        y: [0, -1, 0],
        scale: [1, 0.99, 1],
      },
      metaTransition: {
        duration,
        delay,
        times: [0, 0.45, 1],
        ease: 'easeOut',
      },
    }
  }

  const tokens = TOKENS
  const seed = value * 37 + faces * 11 + impulse * 19 + sequence * 13
  const rnd1 = ((seed * 2654435761) >>> 0) / 0xffffffff
  const rnd2 = ((seed * 40503) >>> 0) / 0xffffffff
  const sign = (seed & 1) === 0 ? 1 : -1

  const totalRotateX = tokens.rotateX * sign
  const totalRotateY = tokens.rotateY * -sign
  const finalZ = landing.rotate + tokens.rotate * sign * (0.4 + rnd1 * 0.6)
  const apexLift = tokens.lift * (0.9 + rnd2 * 0.25)

  const duration = tokens.duration + rnd1 * 0.08
  const delay = sequence * tokens.delayStep + rnd2 * 0.04

  // Six keyframes: rest -> apex -> impact -> settle-up -> settle-down -> final
  const times = [0, 0.38, 0.62, 0.78, 0.9, 1]

  return {
    bodyAnimate: {
      y: [0, -apexLift, tokens.bounce, -tokens.bounce * 0.28, 0, landing.y],
      x: [0, landing.x * 0.3, landing.x * 0.6, landing.x * 0.85, landing.x * 0.95, landing.x],
      rotateX: [0, totalRotateX * 0.55, totalRotateX * 0.88, totalRotateX * 0.96, totalRotateX, totalRotateX],
      rotateY: [0, totalRotateY * 0.48, totalRotateY * 0.82, totalRotateY * 0.94, totalRotateY, totalRotateY],
      rotateZ: [0, finalZ * 0.35, finalZ * 1.12, finalZ * 0.92, finalZ * 1.04, finalZ],
      // Stretch at apex, heavy squash on impact, settle
      scaleX: [1, 1.02, 1.08, 0.96, 1.01, 1],
      scaleY: [1, 0.96, 0.9, 1.05, 0.99, 1],
    },
    bodyTransition: {
      duration,
      delay,
      times,
      ease: [0.32, 0.72, 0.28, 1.05],
      y: { duration, delay, times, ease: [0.22, 0.68, 0.32, 1] },
      rotateX: { duration, delay, times, ease: 'linear' },
      rotateY: { duration, delay, times, ease: 'linear' },
    },
    shadowAnimate: {
      scaleX: [1, 0.72, tokens.shadowStretch, 1.04, 1.01, 1],
      scaleY: [1, 0.74, tokens.shadowStretch * 0.92, 1.02, 1, 1],
      opacity: [0.28, 0.06, tokens.shadowOpacity, 0.3, 0.26, 0.26],
    },
    shadowTransition: {
      duration,
      delay,
      times,
      ease: 'easeOut',
    },
    metaAnimate: {
      opacity: [1, 0.48, 0.92, 0.98, 1, 1],
      filter: ['blur(0px)', 'blur(3px)', 'blur(0.8px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
    },
    metaTransition: {
      duration,
      delay,
      times,
      ease: 'easeOut',
      filter: { duration, delay, times, ease: 'easeOut' },
    },
  }
}

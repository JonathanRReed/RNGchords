import type { DiceMotionProfile } from './style'

type MotionKeyframes = Record<string, number[] | string[]>

type DiceMotionTokens = {
  duration: number
  delayStep: number
  lift: number
  bounce: number
  drift: number
  rotateX: number
  rotateY: number
  rotate: number
  shadowStretch: number
  shadowOpacity: number
}

type DiceMotionPlan = {
  bodyAnimate: MotionKeyframes
  bodyTransition: Record<string, unknown>
  shadowAnimate: MotionKeyframes
  shadowTransition: Record<string, unknown>
  metaAnimate: MotionKeyframes
  metaTransition: Record<string, unknown>
}

const DICE_MOTION_TOKENS: Record<DiceMotionProfile, DiceMotionTokens> = {
  subtle: {
    duration: 0.96,
    delayStep: 0.03,
    lift: 34,
    bounce: 5,
    drift: 2,
    rotateX: 96,
    rotateY: 72,
    rotate: 16,
    shadowStretch: 1.08,
    shadowOpacity: 0.24,
  },
  balanced: {
    duration: 1.22,
    delayStep: 0.05,
    lift: 48,
    bounce: 8,
    drift: 3,
    rotateX: 156,
    rotateY: 126,
    rotate: 28,
    shadowStretch: 1.16,
    shadowOpacity: 0.31,
  },
  dramatic: {
    duration: 1.48,
    delayStep: 0.07,
    lift: 62,
    bounce: 10,
    drift: 4,
    rotateX: 220,
    rotateY: 188,
    rotate: 40,
    shadowStretch: 1.24,
    shadowOpacity: 0.36,
  },
}

function getDieLandingState(value: number, faces: number, impulse: number): { x: number; y: number; rotate: number } {
  const tiltOptions = [-5, -3, -1, 1, 3, 5]
  const rotate = tiltOptions[(value + faces + impulse) % tiltOptions.length] ?? 0
  const x = (((value * 5 + faces + impulse) % 7) - 3) * 0.8
  const y = (((value * 3 + faces * 2 + impulse) % 5) - 2) * 0.65

  return { x, y, rotate }
}

export function getDiceMotionPlan({
  value,
  faces,
  impulse,
  sequence,
  profile,
  reducedMotion,
}: {
  value: number
  faces: number
  impulse: number
  sequence: number
  profile: DiceMotionProfile
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

  const tokens = DICE_MOTION_TOKENS[profile]
  const tumbleSeed = value * 37 + faces * 11 + impulse * 19 + sequence * 13
  const tumbleX = tokens.rotateX + (tumbleSeed % 80)
  const tumbleY = tokens.rotateY + (tumbleSeed % 64)
  const tumbleRotate = tokens.rotate + (tumbleSeed % 22)
  const driftX = landing.x * tokens.drift
  const duration = tokens.duration + sequence * tokens.delayStep
  const delay = sequence * tokens.delayStep

  return {
    bodyAnimate: {
      x: [0, driftX * -0.18, driftX * 0.14, landing.x],
      y: [0, -tokens.lift, tokens.bounce, landing.y],
      rotate: [0, landing.rotate + tumbleRotate, landing.rotate - 2, landing.rotate],
      rotateX: [0, tumbleX, 36 + (tumbleSeed % 18), 0],
      rotateY: [0, -tumbleY, -18 + (tumbleSeed % 12), 0],
      scale: [0.98, 0.92, 1.02, 1],
    },
    bodyTransition: {
      duration,
      delay,
      times: [0, 0.2, 0.76, 1],
      ease: [0.18, 0.84, 0.22, 1],
      rotateX: { duration, delay, times: [0, 0.18, 0.68, 1], ease: 'easeInOut' },
      rotateY: { duration, delay, times: [0, 0.2, 0.7, 1], ease: 'easeInOut' },
      scale: { duration, delay, times: [0, 0.18, 0.8, 1], ease: 'easeOut' },
    },
    shadowAnimate: {
      scaleX: [0.88, tokens.shadowStretch, 0.96, 1],
      scaleY: [0.9, 1.02, 0.97, 1],
      opacity: [0.22, tokens.shadowOpacity, 0.28, 0.24],
    },
    shadowTransition: {
      duration,
      delay,
      times: [0, 0.24, 0.82, 1],
      ease: 'easeOut',
    },
    metaAnimate: {
      opacity: [1, 0.18, 0.12, 1],
      y: [0, -4, -2, 0],
      scale: [1, 0.97, 0.96, 1],
      filter: ['blur(0px)', 'blur(3px)', 'blur(2px)', 'blur(0px)'],
    },
    metaTransition: {
      duration,
      delay,
      times: [0, 0.18, 0.78, 1],
      ease: 'easeOut',
      filter: { duration, delay, times: [0, 0.18, 0.78, 1], ease: 'easeOut' },
    },
  }
}

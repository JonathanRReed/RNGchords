/**
 * How the dice move on a roll. The 3D table throws real solids; these flat
 * animations are what the fallback dice do when WebGL is not available.
 */
export type FlipStyle = 'throw' | 'drop' | 'none'

export const FLIP_OPTIONS: ReadonlyArray<{ id: FlipStyle; label: string; detail: string }> = [
  { id: 'throw', label: 'Throw', detail: 'Tossed from your side of the table. They bounce, knock into each other, and settle.' },
  { id: 'drop', label: 'Drop', detail: 'Let go from above. Less travel, more bounce.' },
  { id: 'none', label: 'Instant', detail: 'No motion. The dice are set down showing the result.' },
]

export const DEFAULT_FLIP: FlipStyle = 'throw'

export function isFlipStyle(value: unknown): value is FlipStyle {
  return FLIP_OPTIONS.some((option) => option.id === value)
}

/** Reads a saved choice, including the names the flat animations used to have. */
export function parseFlip(value: unknown): FlipStyle | null {
  if (isFlipStyle(value)) {
    return value
  }

  return value === 'tumble' || value === 'coin' || value === 'card' || value === 'reel' ? 'throw' : null
}

export interface DieAnimation {
  target: 'body' | 'content'
  keyframes: Keyframe[]
  options: KeyframeAnimationOptions
  shadow?: { keyframes: Keyframe[]; options: KeyframeAnimationOptions }
}

const STAGGER_MS = 45

function between(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function pose(y: number, rotateX = 0, rotateY = 0, rotateZ = 0, scaleX = 1, scaleY = 1): string {
  return `translate3d(0, ${y.toFixed(1)}px, 0) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ.toFixed(1)}deg) scale(${scaleX}, ${scaleY})`
}

function shadowFrames(duration: number, delay: number, lift: number): DieAnimation['shadow'] {
  const apex = Math.max(0.55, 1 - lift / 220)

  return {
    keyframes: [
      { transform: 'scale(1)', opacity: 0.32, offset: 0 },
      { transform: `scale(${apex.toFixed(2)})`, opacity: 0.1, offset: 0.4 },
      { transform: 'scale(1.18)', opacity: 0.42, offset: 0.64 },
      { transform: 'scale(1)', opacity: 0.32, offset: 1 },
    ],
    options: { duration, delay, easing: 'ease-out', fill: 'backwards' },
  }
}

function tumble(sequence: number): DieAnimation {
  const duration = between(640, 740)
  const delay = sequence * STAGGER_MS
  const lift = between(58, 82)
  const sway = (Math.random() < 0.5 ? -1 : 1) * between(5, 10)
  const yaw = (Math.random() < 0.5 ? -1 : 1) * between(7, 16)

  return {
    target: 'body',
    keyframes: [
      { transform: pose(0), offset: 0, easing: 'cubic-bezier(0.22, 0.68, 0.32, 1)' },
      { transform: pose(-lift, 180, yaw, sway * 0.5, 1.03, 0.97), offset: 0.36, easing: 'cubic-bezier(0.55, 0, 0.8, 0.4)' },
      { transform: pose(9, 295, yaw * 0.45, sway, 0.96, 1.05), offset: 0.6 },
      { transform: pose(-3, 338, -yaw * 0.2, sway * 0.4, 1.01, 0.99), offset: 0.76 },
      { transform: pose(0, 360, 0, 0.4), offset: 0.88 },
      { transform: pose(0, 360, 0, 0), offset: 1 },
    ],
    options: { duration, delay, fill: 'backwards' },
    shadow: shadowFrames(duration, delay, lift),
  }
}

function drop(sequence: number): DieAnimation {
  const duration = 620
  const delay = sequence * STAGGER_MS
  const height = between(120, 170)

  return {
    target: 'body',
    keyframes: [
      { transform: pose(-height, 0, 0, between(-6, 6)), opacity: 0, offset: 0, easing: 'cubic-bezier(0.5, 0, 0.9, 0.5)' },
      { transform: pose(0, 0, 0, 0, 1.07, 0.9), opacity: 1, offset: 0.48, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
      { transform: pose(-18, 0, 0, 0, 0.98, 1.03), offset: 0.68, easing: 'cubic-bezier(0.5, 0, 0.9, 0.5)' },
      { transform: pose(0, 0, 0, 0, 1.03, 0.97), offset: 0.84 },
      { transform: pose(0), offset: 1 },
    ],
    options: { duration, delay, fill: 'backwards' },
    shadow: shadowFrames(duration, delay, height * 0.6),
  }
}

export function getDieAnimation(style: FlipStyle, sequence: number): DieAnimation | null {
  return style === 'throw' ? tumble(sequence) : style === 'drop' ? drop(sequence) : null
}

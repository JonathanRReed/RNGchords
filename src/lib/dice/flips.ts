export type FlipStyle = 'tumble' | 'coin' | 'card' | 'reel' | 'drop' | 'none'

export const FLIP_OPTIONS: ReadonlyArray<{ id: FlipStyle; label: string; detail: string }> = [
  { id: 'tumble', label: 'Tumble', detail: 'Tossed up, one somersault, lands with a squash.' },
  { id: 'coin', label: 'Coin toss', detail: 'Spins like a coin on its way up and down.' },
  { id: 'card', label: 'Card flip', detail: 'A quick turn over, face down to face up.' },
  { id: 'reel', label: 'Slot reel', detail: 'The old value rolls out and the new one rolls in.' },
  { id: 'drop', label: 'Drop', detail: 'Falls from above and bounces once.' },
  { id: 'none', label: 'Instant', detail: 'No motion. Values swap in place.' },
]

export const DEFAULT_FLIP: FlipStyle = 'tumble'

export function isFlipStyle(value: unknown): value is FlipStyle {
  return FLIP_OPTIONS.some((option) => option.id === value)
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

function coin(sequence: number): DieAnimation {
  const duration = between(780, 880)
  const delay = sequence * STAGGER_MS
  const lift = between(70, 96)

  return {
    target: 'body',
    keyframes: [
      { transform: pose(0), offset: 0, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)' },
      { transform: pose(-lift, 0, 540, 0, 1, 1), offset: 0.45, easing: 'cubic-bezier(0.6, 0, 0.9, 0.5)' },
      { transform: pose(6, 0, 1080, 0, 1.04, 0.96), offset: 0.74 },
      { transform: pose(-4, 0, 1080, 0, 0.99, 1.01), offset: 0.88 },
      { transform: pose(0, 0, 1080, 0, 1, 1), offset: 1 },
    ],
    options: { duration, delay, fill: 'backwards' },
    shadow: shadowFrames(duration, delay, lift),
  }
}

function card(sequence: number): DieAnimation {
  const duration = 460
  const delay = sequence * STAGGER_MS

  return {
    target: 'body',
    keyframes: [
      { transform: pose(0, 0, 180), offset: 0, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
      { transform: pose(-10, 0, 62, 0, 1.02, 1.02), offset: 0.55, easing: 'cubic-bezier(0.3, 0, 0.3, 1)' },
      { transform: pose(0, 0, -6), offset: 0.85 },
      { transform: pose(0, 0, 0), offset: 1 },
    ],
    options: { duration, delay, fill: 'backwards' },
    shadow: shadowFrames(duration, delay, 24),
  }
}

function reel(sequence: number): DieAnimation {
  const duration = 520
  const delay = sequence * STAGGER_MS

  return {
    target: 'content',
    keyframes: [
      { transform: 'translateY(0)', opacity: 1, offset: 0, easing: 'cubic-bezier(0.5, 0, 0.9, 0.5)' },
      { transform: 'translateY(-115%)', opacity: 0, offset: 0.34 },
      { transform: 'translateY(115%)', opacity: 0, offset: 0.35, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.15)' },
      { transform: 'translateY(0)', opacity: 1, offset: 1 },
    ],
    options: { duration, delay, fill: 'backwards' },
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
  switch (style) {
    case 'tumble':
      return tumble(sequence)
    case 'coin':
      return coin(sequence)
    case 'card':
      return card(sequence)
    case 'reel':
      return reel(sequence)
    case 'drop':
      return drop(sequence)
    default:
      return null
  }
}

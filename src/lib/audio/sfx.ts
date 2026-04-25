/* Lightweight tactile sound effects via Web Audio API.
 * All sounds are synthesised on the fly — no asset files.
 * The AudioContext is lazily created and resumed on first gesture.
 */

type SfxWindow = Window & { webkitAudioContext?: typeof AudioContext }

let sharedContext: AudioContext | null = null
let sfxMuted = false

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null
  }

  if (!sharedContext) {
    const Ctor = window.AudioContext ?? (window as SfxWindow).webkitAudioContext

    if (!Ctor) {
      return null
    }

    sharedContext = new Ctor()
  }

  if (sharedContext.state === 'suspended') {
    void sharedContext.resume()
  }

  return sharedContext
}

export function setSfxMuted(muted: boolean): void {
  sfxMuted = muted
}

/** Short, muted UI click for secondary buttons.
 * Deliberately low + soft (no 2kHz tick) so it feels like a felt tap,
 * not a sharp edge. Suitable for chips / pills / preset cards.
 */
export function playClick(strength = 1): void {
  if (sfxMuted) {
    return
  }

  const ctx = getContext()

  if (!ctx) {
    return
  }

  const now = ctx.currentTime
  const sampleRate = ctx.sampleRate

  // Low-mid thock: filtered noise, lowpass around 1 kHz.
  const length = Math.floor(sampleRate * 0.05)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  for (let index = 0; index < length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * Math.exp(-index / (sampleRate * 0.006))
  }

  const source = ctx.createBufferSource()
  const lowpass = ctx.createBiquadFilter()
  const gain = ctx.createGain()

  lowpass.type = 'lowpass'
  lowpass.frequency.value = 900
  gain.gain.value = 0.05 * strength
  source.buffer = buffer
  source.connect(lowpass)
  lowpass.connect(gain)
  gain.connect(ctx.destination)
  source.start(now)

  // Tiny tonal body so it does not sound like pure noise.
  const osc = ctx.createOscillator()
  const og = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(220, now)
  osc.frequency.exponentialRampToValueAtTime(110, now + 0.06)
  og.gain.setValueAtTime(0.0001, now)
  og.gain.exponentialRampToValueAtTime(0.035 * strength, now + 0.004)
  og.gain.exponentialRampToValueAtTime(0.0001, now + 0.07)
  osc.connect(og)
  og.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.09)
}

function scheduleWoodClack(ctx: AudioContext, when: number, strength: number): void {
  const sampleRate = ctx.sampleRate
  const length = Math.floor(sampleRate * 0.08)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let index = 0; index < length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * Math.exp(-index / (sampleRate * 0.008))
  }

  // Bandpass noise for the contact transient. Different centre freqs per
  // clack make the clatter sound like multiple corners hitting felt.
  const src = ctx.createBufferSource()
  const band = ctx.createBiquadFilter()
  const gain = ctx.createGain()

  band.type = 'bandpass'
  band.frequency.value = 260 + Math.random() * 380
  band.Q.value = 3 + Math.random() * 5
  gain.gain.value = 0.22 * strength
  src.buffer = buffer

  src.connect(band)
  band.connect(gain)
  gain.connect(ctx.destination)
  src.start(when)

  // Short tonal body — the “woody” resonance.
  const osc = ctx.createOscillator()
  const og = ctx.createGain()
  osc.type = 'triangle'
  const base = 140 + Math.random() * 110
  osc.frequency.setValueAtTime(base, when)
  osc.frequency.exponentialRampToValueAtTime(base * 0.5, when + 0.06)
  og.gain.setValueAtTime(0.0001, when)
  og.gain.exponentialRampToValueAtTime(0.18 * strength, when + 0.005)
  og.gain.exponentialRampToValueAtTime(0.0001, when + 0.09)

  osc.connect(og)
  og.connect(ctx.destination)
  osc.start(when)
  osc.stop(when + 0.1)
}

function scheduleSettleThud(ctx: AudioContext, when: number, strength: number): void {
  const sampleRate = ctx.sampleRate
  const length = Math.floor(sampleRate * 0.4)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let index = 0; index < length; index += 1) {
    const t = index / sampleRate
    data[index] = (Math.random() * 2 - 1) * Math.exp(-t * 18)
  }

  const src = ctx.createBufferSource()
  const lp = ctx.createBiquadFilter()
  const g = ctx.createGain()

  lp.type = 'lowpass'
  lp.frequency.value = 420
  g.gain.value = 0.2 * strength
  src.buffer = buffer
  src.connect(lp)
  lp.connect(g)
  g.connect(ctx.destination)
  src.start(when)

  const sub = ctx.createOscillator()
  const sg = ctx.createGain()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(120, when)
  sub.frequency.exponentialRampToValueAtTime(55, when + 0.22)
  sg.gain.setValueAtTime(0.0001, when)
  sg.gain.exponentialRampToValueAtTime(0.28 * strength, when + 0.012)
  sg.gain.exponentialRampToValueAtTime(0.0001, when + 0.34)
  sub.connect(sg)
  sg.connect(ctx.destination)
  sub.start(when)
  sub.stop(when + 0.38)
}

/** A realistic multi-bounce dice roll: several wooden clacks spread over
 *  roughly one second with diminishing intensity, ending on a soft settle.
 *  `dieCount` scales how many impacts we schedule (more dice = more clatter).
 */
export function playDiceRoll(dieCount = 4): void {
  if (sfxMuted) {
    return
  }

  const ctx = getContext()

  if (!ctx) {
    return
  }

  const now = ctx.currentTime
  const impacts = Math.min(14, 6 + dieCount * 2)
  const duration = 0.85

  for (let index = 0; index < impacts; index += 1) {
    // Weight the first half heavier (big first hits, then trailing bounces).
    const progress = index / impacts
    const jitter = Math.random() * 0.08
    const when = now + progress * duration + jitter
    const falloff = 1 - Math.pow(progress, 0.9) * 0.7
    const strength = (0.55 + Math.random() * 0.55) * falloff
    scheduleWoodClack(ctx, when, strength)
  }

  // Final settle thud as the dice come to rest.
  scheduleSettleThud(ctx, now + duration + 0.04, 0.85)
}

/** Kept for backward compatibility with existing callers. */
export function playDiceThud(strength = 1): void {
  const ctx = getContext()
  if (!ctx) return
  scheduleSettleThud(ctx, ctx.currentTime, strength)
}


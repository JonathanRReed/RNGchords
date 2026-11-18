/* Lightweight tactile sound effects via Web Audio API.
 * All sounds are synthesised on the fly, with no asset files.
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

  // Short tonal body for the woody resonance.
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

/** What a die sounds like against each table: where the knock sits, how long it rings, and how much thud is under it. */
const TABLE_VOICES = {
  felt: { table: 240, die: 2100, ring: 0.035, thud: 1, tone: 'triangle' },
  velvet: { table: 190, die: 1700, ring: 0.045, thud: 1.2, tone: 'triangle' },
  glass: { table: 1500, die: 4200, ring: 0.16, thud: 0.25, tone: 'sine' },
  pads: { table: 520, die: 2600, ring: 0.02, thud: 0.6, tone: 'square' },
} as const

export type TableVoice = keyof typeof TABLE_VOICES

interface Knock {
  time: number
  strength: number
  kind: 'table' | 'wall' | 'die'
}

const MAX_KNOCKS = 60

/**
 * Plays a recorded throw: one knock for each time a die hit the table, a
 * wall, or another die, at the moment it happened and as hard as it happened.
 */
export function playImpacts(knocks: Knock[], table: TableVoice): void {
  if (sfxMuted || knocks.length === 0) {
    return
  }

  const ctx = getContext()

  if (!ctx) {
    return
  }

  const voice = TABLE_VOICES[table]
  const sampleRate = ctx.sampleRate
  const start = ctx.currentTime + 0.02
  // Too many dice at once would clip, so the loudest knocks are kept and the level comes down a little.
  const heard = knocks.length > MAX_KNOCKS ? [...knocks].sort((left, right) => right.strength - left.strength).slice(0, MAX_KNOCKS) : knocks
  const level = Math.min(1, 9 / Math.sqrt(heard.length * 6))
  const length = Math.floor(sampleRate * 0.25)
  const noise = ctx.createBuffer(1, length, sampleRate)
  const data = noise.getChannelData(0)

  for (let index = 0; index < length; index += 1) {
    data[index] = Math.random() * 2 - 1
  }

  const out = ctx.createGain()
  out.gain.value = level
  out.connect(ctx.destination)

  for (const knock of heard) {
    const when = start + knock.time
    const force = 0.18 + knock.strength * 0.82
    const pitch = (knock.kind === 'die' ? voice.die : knock.kind === 'wall' ? voice.table * 1.9 : voice.table) * (0.85 + Math.random() * 0.3)
    const ring = voice.ring * (knock.kind === 'die' ? 0.6 : 1) * (0.8 + Math.random() * 0.4)

    // The contact itself: a short burst of filtered noise.
    const source = ctx.createBufferSource()
    const band = ctx.createBiquadFilter()
    const gain = ctx.createGain()
    source.buffer = noise
    band.type = 'bandpass'
    band.frequency.value = pitch
    band.Q.value = knock.kind === 'die' ? 5 : 1.6
    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.exponentialRampToValueAtTime((knock.kind === 'die' ? 0.5 : 0.36) * force, when + 0.002)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + ring + 0.03)
    source.connect(band)
    band.connect(gain)
    gain.connect(out)
    source.start(when, Math.random() * 0.1, ring + 0.06)

    // The body under it: a low note that drops, heavier on cloth than on glass.
    if (knock.kind !== 'die' || table === 'glass') {
      const body = ctx.createOscillator()
      const bodyGain = ctx.createGain()
      const base = knock.kind === 'die' ? pitch : knock.kind === 'wall' ? 210 : 105 + Math.random() * 40
      body.type = voice.tone
      body.frequency.setValueAtTime(base * 1.5, when)
      body.frequency.exponentialRampToValueAtTime(base, when + 0.05)
      bodyGain.gain.setValueAtTime(0.0001, when)
      bodyGain.gain.exponentialRampToValueAtTime(0.3 * force * voice.thud * (knock.kind === 'die' ? 0.35 : 1), when + 0.006)
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.07 + ring * 2)
      body.connect(bodyGain)
      bodyGain.connect(out)
      body.start(when)
      body.stop(when + 0.12 + ring * 2)
    }
  }

  // Phones with a vibration motor get the first hard landings in the hand as well.
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    // The pattern alternates buzz and pause and has to open with a buzz, so it opens with an empty one.
    const pattern = [0]
    let clock = 0

    for (const knock of knocks.filter((entry) => entry.kind === 'table' && entry.strength > 0.3).slice(0, 5)) {
      const at = Math.round(knock.time * 1000)
      const buzz = Math.round(8 + knock.strength * 14)

      if (at >= clock) {
        pattern.push(at - clock, buzz)
        clock = at + buzz
      }
    }

    if (pattern.length > 1) {
      navigator.vibrate(pattern)
    }
  }
}

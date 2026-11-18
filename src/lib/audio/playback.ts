import type { Filter, PolySynth, Reverb } from 'tone'
import type { ChordDescriptor, ProgressionResult } from '../music/types'

export type PlaybackInstrument =
  | 'warm-piano'
  | 'electric-piano'
  | 'soft-organ'
  | 'bright-piano'
  | 'glass-bells'
  | 'mellow-pad'

export const PLAYBACK_INSTRUMENT_COPY: Record<PlaybackInstrument, { label: string; detail: string }> = {
  'warm-piano': {
    label: 'Warm piano',
    detail: 'Plain and clear.',
  },
  'electric-piano': {
    label: 'Electric piano',
    detail: 'Rounder, with a slight wobble.',
  },
  'soft-organ': {
    label: 'Soft organ',
    detail: 'Holds each chord for a long time.',
  },
  'bright-piano': {
    label: 'Bright piano',
    detail: 'Sharp attack.',
  },
  'glass-bells': {
    label: 'Glass bells',
    detail: 'High and ringing.',
  },
  'mellow-pad': {
    label: 'Mellow pad',
    detail: 'Slow to fade in and out.',
  },
}

interface Voice {
  /** Passed to the synth's oscillator. `fat` types stack detuned copies; `custom` builds a tone from its partials. */
  oscillator: Record<string, unknown>
  envelope: {
    attack: number
    decay: number
    sustain: number
    release: number
  }
  volume: number
  /** Lowpass cutoff in Hz: how bright the voice is allowed to get. */
  tone: number
  /** Share of the sound that goes through the room reverb, 0 to 1. */
  room: number
  /** Seconds between the notes of a chord, low to high, so it is played rather than switched on. */
  strum: number
}

const VOICES: Record<PlaybackInstrument, Voice> = {
  'warm-piano': {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.02, decay: 0.22, sustain: 0.22, release: 0.7 },
    volume: -9,
    tone: 3400,
    room: 0.16,
    strum: 0.012,
  },
  'electric-piano': {
    oscillator: { type: 'fatsine', count: 2, spread: 14 },
    envelope: { attack: 0.012, decay: 0.3, sustain: 0.24, release: 0.6 },
    volume: -10,
    tone: 2600,
    room: 0.2,
    strum: 0.014,
  },
  'soft-organ': {
    oscillator: { type: 'custom', partials: [1, 0.55, 0.3, 0.12] },
    envelope: { attack: 0.05, decay: 0.08, sustain: 0.88, release: 0.22 },
    volume: -16,
    tone: 3000,
    room: 0.24,
    strum: 0,
  },
  'bright-piano': {
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.008, decay: 0.16, sustain: 0.14, release: 0.5 },
    volume: -17,
    tone: 5200,
    room: 0.14,
    strum: 0.01,
  },
  'glass-bells': {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.004, decay: 0.3, sustain: 0.04, release: 1.4 },
    volume: -14,
    tone: 9000,
    room: 0.42,
    strum: 0.03,
  },
  'mellow-pad': {
    oscillator: { type: 'fatsawtooth', count: 3, spread: 22 },
    envelope: { attack: 0.2, decay: 0.4, sustain: 0.7, release: 1.5 },
    volume: -22,
    tone: 1500,
    room: 0.45,
    strum: 0,
  },
}

interface PlayOptions {
  instrument: PlaybackInstrument
  loop: boolean
  onChordStart?: (index: number) => void
  onFinish?: () => void
}

type ToneModule = typeof import('tone')

class PlaybackEngine {
  private tone: ToneModule | null = null
  private tonePromise: Promise<ToneModule> | null = null
  private synth: PolySynth | null = null
  private filter: Filter | null = null
  private reverb: Reverb | null = null
  private instrument: PlaybackInstrument | null = null
  private initialized = false

  preload(): void {
    void this.loadTone()
  }

  private loadTone(): Promise<ToneModule> {
    if (this.tone) {
      return Promise.resolve(this.tone)
    }

    this.tonePromise ??= import('tone').then((tone) => {
      this.tone = tone
      return tone
    })

    return this.tonePromise
  }

  private async ensureReady(): Promise<ToneModule> {
    const tone = await this.loadTone()

    if (!this.initialized) {
      await tone.start()
      this.tone = tone
      this.initialized = true
    } else if (tone.getContext().state !== 'running') {
      await tone.start()
    }

    if (!this.tone) {
      throw new Error('Tone engine failed to initialize')
    }

    return this.tone
  }

  private ensureSynth(instrument: PlaybackInstrument, tone: ToneModule): void {
    if (this.synth && this.instrument === instrument) {
      return
    }

    const voice = VOICES[instrument]

    // One signal path for every voice: synth, tone filter, a small room, then a limiter so stacked chords never clip.
    if (!this.filter || !this.reverb) {
      const limiter = new tone.Limiter(-1.5).toDestination()
      this.reverb = new tone.Reverb({ decay: 2.4, preDelay: 0.015 }).connect(limiter)
      this.filter = new tone.Filter({ type: 'lowpass', frequency: voice.tone, Q: 0.4 }).connect(this.reverb)
    }

    this.filter.frequency.value = voice.tone
    this.reverb.wet.value = voice.room

    this.synth?.dispose()
    const synth = new tone.PolySynth(tone.Synth, {
      oscillator: voice.oscillator as never,
      envelope: voice.envelope,
    }).connect(this.filter)
    synth.maxPolyphony = 48
    synth.volume.value = voice.volume

    this.synth = synth
    this.instrument = instrument
  }

  /** Sounds a chord from the bottom up, each note a touch softer than the last. */
  private strike(tone: ToneModule, chord: ChordDescriptor, seconds: number, time: number, velocity: number): void {
    const voice = this.instrument ? VOICES[this.instrument] : null

    chord.midi.forEach((value, index) => {
      this.synth?.triggerAttackRelease(
        tone.Frequency(value, 'midi').toNote(),
        seconds,
        time + index * (voice?.strum ?? 0),
        velocity * (1 - index * 0.035),
      )
    })
  }

  async play(progression: ProgressionResult, tempo: number, options: PlayOptions): Promise<number> {
    const tone = await this.ensureReady()
    const transport = tone.getTransport()
    const draw = tone.getDraw()

    this.ensureSynth(options.instrument, tone)

    if (!this.synth) {
      return 0
    }

    this.stop()
    transport.bpm.value = tempo
    transport.loop = options.loop

    const secondsPerBeat = 60 / tempo
    let cursor = 0

    progression.chords.forEach((chord, index) => {
      const durationSeconds = chord.rhythmBeats * secondsPerBeat
      const attackTime = cursor

      transport.scheduleOnce((time) => {
        draw.schedule(() => {
          options.onChordStart?.(index)
        }, time)
        this.strike(tone, chord, Math.max(0.12, durationSeconds * 0.82), time, 0.52)
      }, attackTime)

      cursor += durationSeconds
    })

    if (options.loop) {
      transport.loopStart = 0
      transport.loopEnd = cursor
    } else {
      transport.scheduleOnce((time) => {
        draw.schedule(() => {
          options.onFinish?.()
        }, time)
      }, cursor + 0.08)
    }

    transport.start('+0.08')
    return cursor
  }

  async preview(chord: ChordDescriptor, instrument: PlaybackInstrument): Promise<void> {
    const tone = await this.ensureReady()

    this.ensureSynth(instrument, tone)

    if (!this.synth) {
      return
    }

    this.synth.releaseAll()
    this.strike(tone, chord, Math.max(0.3, chord.rhythmBeats * 0.5), tone.now() + 0.01, 0.5)
  }

  stop(): void {
    if (!this.tone) {
      return
    }

    const transport = this.tone.getTransport()

    transport.stop()
    transport.cancel(0)
    transport.position = 0
    transport.loop = false
    this.synth?.releaseAll()
  }
}

const engine = new PlaybackEngine()

export function preloadPlayback(): void {
  engine.preload()
}

export async function playProgression(progression: ProgressionResult, tempo: number, options: PlayOptions): Promise<number> {
  return engine.play(progression, tempo, options)
}

export async function previewChord(chord: ChordDescriptor, instrument: PlaybackInstrument): Promise<void> {
  return engine.preview(chord, instrument)
}

export function stopPlayback(): void {
  engine.stop()
}

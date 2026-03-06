import type { PolySynth } from 'tone'
import type { ProgressionResult } from '../music/types'

export type PlaybackInstrument = 'warm-piano' | 'electric-piano' | 'soft-organ'

export const PLAYBACK_INSTRUMENT_COPY: Record<PlaybackInstrument, { label: string; detail: string }> = {
  'warm-piano': {
    label: 'Warm Piano',
    detail: 'Clean and simple for easy sketching.',
  },
  'electric-piano': {
    label: 'Electric Piano',
    detail: 'A little softer and wobblier in a good way.',
  },
  'soft-organ': {
    label: 'Soft Organ',
    detail: 'Longer sustain for slower, floatier ideas.',
  },
}

const PLAYBACK_INSTRUMENT_SETTINGS: Record<PlaybackInstrument, {
  oscillator: 'sine' | 'triangle'
  envelope: {
    attack: number
    decay: number
    sustain: number
    release: number
  }
  volume: number
}> = {
  'warm-piano': {
    oscillator: 'triangle',
    envelope: { attack: 0.03, decay: 0.18, sustain: 0.24, release: 0.55 },
    volume: -9,
  },
  'electric-piano': {
    oscillator: 'sine',
    envelope: { attack: 0.015, decay: 0.14, sustain: 0.2, release: 0.34 },
    volume: -11,
  },
  'soft-organ': {
    oscillator: 'triangle',
    envelope: { attack: 0.05, decay: 0.08, sustain: 0.88, release: 0.18 },
    volume: -14,
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

    this.synth?.dispose()
    const settings = PLAYBACK_INSTRUMENT_SETTINGS[instrument]
    const synth = new tone.PolySynth(tone.Synth, {
      oscillator: {
        type: settings.oscillator,
      },
      envelope: settings.envelope,
    }).toDestination()
    synth.volume.value = settings.volume

    this.synth = synth
    this.instrument = instrument
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
        const noteNames = chord.midi.map((value) => tone.Frequency(value, 'midi').toNote())
        draw.schedule(() => {
          options.onChordStart?.(index)
        }, time)
        this.synth?.triggerAttackRelease(noteNames, Math.max(0.12, durationSeconds * 0.82), time, 0.52)
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

export function stopPlayback(): void {
  engine.stop()
}

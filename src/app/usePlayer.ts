import { useCallback, useEffect, useState } from 'react'
import { createMidiBlob, downloadMidiBlob } from '../lib/audio/midi'
import { playProgression, preloadPlayback, previewChord, stopPlayback, type PlaybackInstrument } from '../lib/audio/playback'
import type { ProgressionResult } from '../lib/music/types'

interface PlayerInput {
  /** Identity changes whenever the underlying idea changes, which stops playback. */
  source: ProgressionResult
  display: ProgressionResult
  tempo: number
  instrument: PlaybackInstrument
  loop: boolean
  notify: (message: string) => void
}

export function usePlayer({ source, display, tempo, instrument, loop, notify }: PlayerInput) {
  const [playing, setPlaying] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)

  const reset = useCallback(() => {
    stopPlayback()
    setPlaying(false)
    setActiveIndex(null)
    setPreviewIndex(null)
  }, [])

  useEffect(() => {
    reset()
  }, [source, reset])

  useEffect(() => {
    preloadPlayback()
    return () => stopPlayback()
  }, [])

  const start = useCallback(async () => {
    if (display.chords.length === 0) {
      notify('Nothing to play yet. Roll first.')
      return
    }

    setPlaying(true)
    notify('')

    try {
      await playProgression(display, tempo, {
        instrument,
        loop,
        onChordStart: setActiveIndex,
        onFinish: () => {
          if (!loop) {
            setPlaying(false)
            setActiveIndex(null)
          }
        },
      })
    } catch (error) {
      console.error('Playback failed', error)
      reset()
      notify('Playback did not start. Try again or reload the page.')
    }
  }, [display, instrument, loop, notify, reset, tempo])

  const stop = useCallback(() => {
    reset()
    notify('')
  }, [notify, reset])

  const preview = useCallback(
    async (index: number) => {
      const chord = display.chords[index]

      if (!chord || playing) {
        return
      }

      setPreviewIndex(index)

      try {
        await previewChord(chord, instrument)
      } catch (error) {
        console.error('Chord preview failed', error)
      }
    },
    [display.chords, instrument, playing],
  )

  const exportMidi = useCallback(async () => {
    if (display.chords.length === 0) {
      notify('Roll something before exporting.')
      return
    }

    setExporting(true)

    try {
      const blob = await createMidiBlob(display, tempo)
      const key = display.keyCenter.toLowerCase().replace('#', 'sharp')
      downloadMidiBlob(blob, `rng-chords-${key}-${tempo}bpm.mid`)
      notify('Exported MIDI.')
    } catch (error) {
      console.error('MIDI export failed', error)
      notify('MIDI export failed. Reload and try again.')
    } finally {
      setExporting(false)
    }
  }, [display, notify, tempo])

  return { playing, activeIndex, previewIndex, highlightedIndex: activeIndex ?? previewIndex, exporting, start, stop, preview, exportMidi }
}

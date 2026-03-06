import type { ProgressionResult } from '../music/types'

export async function createMidiBlob(progression: ProgressionResult, tempo: number): Promise<Blob> {
  const { Midi } = await import('@tonejs/midi')
  const midi = new Midi()
  midi.header.setTempo(tempo)
  const track = midi.addTrack()
  const secondsPerBeat = 60 / tempo
  let cursor = 0

  progression.chords.forEach((chord) => {
    const duration = chord.rhythmBeats * secondsPerBeat

    chord.midi.forEach((value) => {
      track.addNote({
        midi: value,
        time: cursor,
        duration,
        velocity: 0.82,
      })
    })

    cursor += duration
  })

  const bytes = Uint8Array.from(midi.toArray())
  return new Blob([bytes.buffer], { type: 'audio/midi' })
}

export function downloadMidiBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

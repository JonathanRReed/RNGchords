interface PianoStripProps {
  midi: number[]
  rootPitchClass: number
}

const BLACK_PITCHES = new Set([1, 3, 6, 8, 10])
const WHITE_WIDTH = 10
const BLACK_WIDTH = 6.2
const HEIGHT = 34

/** A few octaves of keys with the chord lit up, so a pianist sees the shape at a glance. */
export function PianoStrip({ midi, rootPitchClass }: PianoStripProps) {
  if (midi.length === 0) {
    return null
  }

  const low = Math.floor(Math.min(...midi) / 12) * 12
  const high = Math.floor(Math.max(...midi) / 12) * 12 + 11
  const lit = new Set(midi)
  const whites: number[] = []
  const blacks: Array<{ note: number; x: number }> = []

  for (let note = low; note <= high; note += 1) {
    if (BLACK_PITCHES.has(note % 12)) {
      blacks.push({ note, x: whites.length * WHITE_WIDTH - BLACK_WIDTH / 2 })
    } else {
      whites.push(note)
    }
  }

  return (
    <svg className="piano" viewBox={`0 0 ${whites.length * WHITE_WIDTH} ${HEIGHT}`} role="img" aria-label="Keys in this chord" preserveAspectRatio="xMidYMid meet">
      {whites.map((note, index) => (
        <rect
          key={note}
          className="piano__white"
          x={index * WHITE_WIDTH + 0.4}
          y={0}
          width={WHITE_WIDTH - 0.8}
          height={HEIGHT}
          rx={1.4}
          data-lit={lit.has(note) || undefined}
          data-root={(lit.has(note) && note % 12 === rootPitchClass) || undefined}
        />
      ))}
      {blacks.map(({ note, x }) => (
        <rect
          key={note}
          className="piano__black"
          x={x}
          y={0}
          width={BLACK_WIDTH}
          height={HEIGHT * 0.62}
          rx={1.2}
          data-lit={lit.has(note) || undefined}
          data-root={(lit.has(note) && note % 12 === rootPitchClass) || undefined}
        />
      ))}
    </svg>
  )
}

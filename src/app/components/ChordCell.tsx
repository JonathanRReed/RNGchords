import { memo, type CSSProperties } from 'react'
import { RHYTHM_LABELS } from '../../lib/music/constants'
import { toPitchClass } from '../../lib/music/chords'
import { getTheoryTags } from '../../lib/music/ideas'
import type { ChordDescriptor, RootNote } from '../../lib/music/types'
import { ChordSymbol } from './ChordSymbol'
import { CloseIcon } from './icons'
import { PianoStrip } from './PianoStrip'

const INVERSION_LABELS = ['', '1st inversion', '2nd inversion', '3rd inversion']

interface ChordCellProps {
  chord: ChordDescriptor
  index: number
  keyCenter: RootNote
  selected: boolean
  playing: boolean
  kept: boolean
  onKeep: (index: number) => void
  onPreview: (index: number) => void
  onReroll: (index: number) => void
  onRemove: (index: number) => void
}

/** One chord on the chart. Its width follows how long the chord lasts. */
export const ChordCell = memo(function ChordCell({ chord, index, keyCenter, selected, playing, kept, onKeep, onPreview, onReroll, onRemove }: ChordCellProps) {
  const [numeral] = getTheoryTags(chord, keyCenter)
  const beats = chord.rhythmBeats
  const wholeBeats = Math.floor(beats)

  return (
    <li
      className="cell"
      data-selected={selected || undefined}
      data-playing={playing || undefined}
      data-kept={kept || undefined}
      style={{ '--beats': beats } as CSSProperties}
    >
      <div className="cell__top">
        <span className="cell__index">{index + 1}</span>
        <span className="cell__numeral" title={`Where this chord sits in the key of ${keyCenter}`}>
          {numeral}
        </span>
        <button type="button" className="icon-btn cell__remove" onClick={() => onRemove(index)} aria-label={`Remove ${chord.label}`}>
          <CloseIcon />
        </button>
      </div>

      <button type="button" className="cell__chord" onClick={() => onPreview(index)} aria-label={`${chord.label}. Hear it.`}>
        <ChordSymbol text={chord.label} />
      </button>

      <PianoStrip midi={chord.midi} rootPitchClass={toPitchClass(chord.root)} />

      <ul className="cell__notes" aria-label="Notes">
        {chord.notes.map((note, noteIndex) => (
          <li key={`${note}-${noteIndex}`}>
            <ChordSymbol text={note} />
          </li>
        ))}
      </ul>

      <p className="cell__meta">
        <span>{RHYTHM_LABELS[beats] ?? `${beats} beats`}</span>
        {chord.inversion > 0 ? <span>{INVERSION_LABELS[chord.inversion] ?? `Inversion ${chord.inversion}`}</span> : null}
      </p>

      <div className="cell__actions">
        <button type="button" className="link-btn" aria-pressed={kept} onClick={() => onKeep(index)}>
          {kept ? 'Kept' : 'Keep'}
        </button>
        <button type="button" className="link-btn" onClick={() => onReroll(index)}>
          Reroll
        </button>
      </div>

      <span className="cell__beats" aria-hidden="true">
        {Array.from({ length: wholeBeats }, (_, beat) => (
          <i key={beat} />
        ))}
        {beats > wholeBeats ? <i data-half /> : null}
      </span>
    </li>
  )
})

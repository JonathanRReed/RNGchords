import { memo } from 'react'
import { RHYTHM_LABELS } from '../../lib/music/constants'
import { extensionSummary } from '../../lib/music/chords'
import { getTheoryTags } from '../../lib/music/ideas'
import type { ChordDescriptor, RootNote } from '../../lib/music/types'
import { toPitchClass } from '../../lib/music/chords'
import { CloseIcon } from './icons'
import { PianoStrip } from './PianoStrip'

interface ChordCardProps {
  chord: ChordDescriptor
  index: number
  keyCenter: RootNote
  selected: boolean
  playing: boolean
  kept: boolean
  showTheory: boolean
  onKeep: (index: number) => void
  onPreview: (index: number) => void
  onReroll: (index: number) => void
  onRemove: (index: number) => void
}

export const ChordCard = memo(function ChordCard({
  chord,
  index,
  keyCenter,
  selected,
  playing,
  kept,
  showTheory,
  onKeep,
  onPreview,
  onReroll,
  onRemove,
}: ChordCardProps) {
  const [numeral, ...theory] = getTheoryTags(chord, keyCenter)

  return (
    <article className="chord-card" data-selected={selected || undefined} data-playing={playing || undefined}>
      <header className="chord-card__head">
        <span className="chord-card__index">{index + 1}</span>
        <h3>{chord.label}</h3>
        <span className="chord-card__numeral" title="Place in the key">
          {numeral}
        </span>
        <button type="button" className="icon-btn" onClick={() => onRemove(index)} aria-label={`Remove ${chord.label}`}>
          <CloseIcon />
        </button>
      </header>

      <ul className="notes" aria-label="Notes">
        {chord.notes.map((note, noteIndex) => (
          <li key={`${note}-${noteIndex}`}>{note}</li>
        ))}
      </ul>

      <PianoStrip midi={chord.midi} rootPitchClass={toPitchClass(chord.root)} />

      {showTheory ? (
        <ul className="tags" aria-label="Theory">
          {theory.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      ) : null}

      <p className="chord-card__meta">
        <span>{RHYTHM_LABELS[chord.rhythmBeats] ?? `${chord.rhythmBeats} beats`}</span>
        <span>{extensionSummary(chord.extensions)}</span>
      </p>

      <div className="chord-card__actions">
        <button type="button" className="chip" aria-pressed={kept} onClick={() => onKeep(index)}>
          {kept ? 'Kept' : 'Keep'}
        </button>
        <button type="button" className="chip" onClick={() => onPreview(index)}>
          Preview
        </button>
        <button type="button" className="chip" onClick={() => onReroll(index)}>
          Reroll
        </button>
      </div>
    </article>
  )
})

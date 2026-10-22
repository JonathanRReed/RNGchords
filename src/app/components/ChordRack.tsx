import { memo } from 'react'
import type { ChordDescriptor, RootNote } from '../../lib/music/types'
import { SECTION_IDS } from '../constants'
import type { SectionId, SectionSnapshot } from '../types'
import type { WorkstationActions } from '../useWorkstation'
import { ChordCard } from './ChordCard'

interface ChordRackProps {
  chords: ChordDescriptor[]
  keyCenter: RootNote
  highlightedIndex: number | null
  playingIndex: number | null
  keptSlots: number[]
  showTheory: boolean
  sections: Record<SectionId, SectionSnapshot | null>
  activeSection: SectionId
  onPreview: (index: number) => void
  onCopy: () => void
  onShare: () => void
  actions: WorkstationActions
}

export const ChordRack = memo(function ChordRack({
  chords,
  keyCenter,
  highlightedIndex,
  playingIndex,
  keptSlots,
  showTheory,
  sections,
  activeSection,
  onPreview,
  onCopy,
  onShare,
  actions,
}: ChordRackProps) {
  return (
    <section className="rack" aria-label="Chords">
      <div className="rack__bar">
        <h2>Chords</h2>
        <div className="rack__tools">
          <button type="button" className="btn btn--sm" onClick={actions.rerollUnlocked} disabled={chords.length === 0}>
            Reroll unkept
          </button>
          <button type="button" className="btn btn--sm" onClick={onCopy} disabled={chords.length === 0}>
            Copy chart
          </button>
          <button type="button" className="btn btn--sm" onClick={onShare} disabled={chords.length === 0}>
            Copy link
          </button>
          <button type="button" className="btn btn--sm" aria-pressed={showTheory} onClick={() => actions.setShowTheory(!showTheory)}>
            Show theory
          </button>
          <button type="button" className="btn btn--sm" onClick={actions.clear} disabled={chords.length === 0}>
            Clear
          </button>
        </div>
      </div>

      <div className="rack__versions" role="group" aria-label="Saved versions">
        <span className="rack__versions-label">Versions</span>
        {SECTION_IDS.map((id) => {
          const filled = Boolean(sections[id])

          return (
            <button
              key={id}
              type="button"
              className="chip"
              data-filled={filled || undefined}
              aria-pressed={id === activeSection}
              aria-label={filled ? `Load version ${id}` : `Version ${id}, empty`}
              onClick={() => actions.loadSection(id)}
            >
              {id}
            </button>
          )
        })}
        <button type="button" className="btn btn--sm" onClick={actions.saveSection} disabled={chords.length === 0}>
          Save to {activeSection}
        </button>
      </div>

      {chords.length > 0 ? (
        <div className="rack__grid">
          {chords.map((chord, index) => (
            <ChordCard
              key={chord.id}
              chord={chord}
              index={index}
              keyCenter={keyCenter}
              selected={index === highlightedIndex}
              playing={index === playingIndex}
              kept={keptSlots.includes(index)}
              showTheory={showTheory}
              onKeep={actions.toggleKeep}
              onPreview={onPreview}
              onReroll={actions.rerollChord}
              onRemove={actions.removeChord}
            />
          ))}
        </div>
      ) : (
        <div className="rack__empty">
          <h3>Nothing here yet</h3>
          <p>Roll the dice, pick a starting point, or type a few chord names in Manual.</p>
        </div>
      )}
    </section>
  )
})

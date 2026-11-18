import { memo, useRef } from 'react'
import { PLAYBACK_INSTRUMENT_COPY, preloadPlayback, type PlaybackInstrument } from '../../lib/audio/playback'
import { RHYTHM_FEEL_COPY, type RhythmFeel } from '../../lib/music/ideas'
import type { ChordDescriptor, RootNote } from '../../lib/music/types'
import { INSTRUMENT_OPTIONS, MAX_TEMPO, MIN_TEMPO, SECTION_IDS } from '../constants'
import type { SectionId, SectionSnapshot } from '../types'
import type { WorkstationActions } from '../useWorkstation'
import { ChordCell } from './ChordCell'
import { DownloadIcon, LoopIcon, PlayIcon, StopIcon } from './icons'

interface SheetProps {
  chords: ChordDescriptor[]
  keyCenter: RootNote
  highlightedIndex: number | null
  playingIndex: number | null
  keptSlots: number[]
  sections: Record<SectionId, SectionSnapshot | null>
  activeSection: SectionId
  playing: boolean
  loop: boolean
  tempo: number
  instrument: PlaybackInstrument
  feel: RhythmFeel
  exporting: boolean
  canUndo: boolean
  onPlay: () => void
  onStop: () => void
  onExport: () => void
  onPreview: (index: number) => void
  onCopy: () => void
  onShare: () => void
  actions: WorkstationActions
}

const TAP_RESET_MS = 2000
const TAPS_USED = 5

/** The chart: the chords in order, with the controls to hear them and take them away. */
export const Sheet = memo(function Sheet({
  chords,
  keyCenter,
  highlightedIndex,
  playingIndex,
  keptSlots,
  sections,
  activeSection,
  playing,
  loop,
  tempo,
  instrument,
  feel,
  exporting,
  canUndo,
  onPlay,
  onStop,
  onExport,
  onPreview,
  onCopy,
  onShare,
  actions,
}: SheetProps) {
  const taps = useRef<number[]>([])
  const empty = chords.length === 0

  const tap = () => {
    const now = performance.now()
    const last = taps.current.at(-1)
    taps.current = (last !== undefined && now - last > TAP_RESET_MS ? [] : taps.current).concat(now).slice(-TAPS_USED)

    if (taps.current.length < 2) {
      return
    }

    const span = taps.current.at(-1)! - taps.current[0]!
    const bpm = Math.round(60000 / (span / (taps.current.length - 1)))
    actions.setTempo(Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, bpm)))
  }

  return (
    <section className="sheet panel" aria-label="Chord chart">
      <div className="sheet__transport" role="group" aria-label="Playback">
        <button
          type="button"
          className="btn btn--primary sheet__play"
          onClick={playing ? onStop : onPlay}
          onPointerEnter={preloadPlayback}
          onFocus={preloadPlayback}
          aria-keyshortcuts="Space"
        >
          {playing ? <StopIcon /> : <PlayIcon />}
          <span>{playing ? 'Stop' : 'Play'}</span>
        </button>
        <button type="button" className="btn" aria-pressed={loop} onClick={() => actions.setLoop(!loop)}>
          <LoopIcon />
          <span>Loop</span>
        </button>

        <label className="field field--inline sheet__tempo">
          <span>
            Tempo <output>{tempo} BPM</output>
          </span>
          <input type="range" min={MIN_TEMPO} max={MAX_TEMPO} value={tempo} onChange={(event) => actions.setTempo(Number(event.target.value))} />
        </label>
        <button type="button" className="btn btn--quiet" onClick={tap} title="Tap along to the beat you hear">
          Tap tempo
        </button>

        <label className="field field--inline">
          <span>Sound</span>
          <select value={instrument} onChange={(event) => actions.setInstrument(event.target.value as PlaybackInstrument)}>
            {INSTRUMENT_OPTIONS.map((entry) => (
              <option key={entry} value={entry}>
                {PLAYBACK_INSTRUMENT_COPY[entry].label}
              </option>
            ))}
          </select>
        </label>
        <label className="field field--inline">
          <span>Feel</span>
          <select value={feel} onChange={(event) => actions.setFeel(event.target.value as RhythmFeel)} title={RHYTHM_FEEL_COPY[feel].detail}>
            {(Object.keys(RHYTHM_FEEL_COPY) as RhythmFeel[]).map((entry) => (
              <option key={entry} value={entry}>
                {RHYTHM_FEEL_COPY[entry].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {empty ? (
        <div className="sheet__empty">
          <h2>No chords yet</h2>
          <p>Roll the dice, or switch to Manual and type a few chord names.</p>
        </div>
      ) : (
        <ol className="sheet__chart" aria-label="Chords">
          {chords.map((chord, index) => (
            <ChordCell
              key={chord.id}
              chord={chord}
              index={index}
              keyCenter={keyCenter}
              selected={index === highlightedIndex}
              playing={index === playingIndex}
              kept={keptSlots.includes(index)}
              onKeep={actions.toggleKeep}
              onPreview={onPreview}
              onReroll={actions.rerollChord}
              onRemove={actions.removeChord}
            />
          ))}
        </ol>
      )}

      <div className="sheet__foot">
        <div className="sheet__versions" role="group" aria-label="Saved versions">
          <span className="sheet__label">Versions</span>
          {SECTION_IDS.map((id) => {
            const filled = Boolean(sections[id])

            return (
              <button
                key={id}
                type="button"
                className="chip chip--letter"
                data-filled={filled || undefined}
                aria-pressed={id === activeSection}
                aria-label={filled ? `Load version ${id}` : `Version ${id}, empty`}
                onClick={() => actions.loadSection(id)}
              >
                {id}
              </button>
            )
          })}
          <button type="button" className="btn btn--quiet" onClick={actions.saveSection} disabled={empty}>
            Save to {activeSection}
          </button>
        </div>

        <div className="sheet__tools">
          <button type="button" className="btn btn--quiet" onClick={actions.rerollUnlocked} disabled={empty}>
            Reroll unkept
          </button>
          <button type="button" className="btn btn--quiet" onClick={actions.undo} disabled={!canUndo}>
            Undo
          </button>
          <button type="button" className="btn btn--quiet" onClick={onCopy} disabled={empty}>
            Copy chart
          </button>
          <button type="button" className="btn btn--quiet" onClick={onShare} disabled={empty}>
            Copy link
          </button>
          <button type="button" className="btn btn--quiet" onClick={actions.clear} disabled={empty}>
            Clear
          </button>
          <button type="button" className="btn" onClick={onExport} disabled={exporting || empty}>
            <DownloadIcon />
            <span>{exporting ? 'Exporting' : 'Export MIDI'}</span>
          </button>
        </div>
      </div>
    </section>
  )
})

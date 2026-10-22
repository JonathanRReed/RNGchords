import { PLAYBACK_INSTRUMENT_COPY, preloadPlayback, type PlaybackInstrument } from '../../lib/audio/playback'
import { RHYTHM_FEEL_COPY, type RhythmFeel } from '../../lib/music/ideas'
import { INSTRUMENT_OPTIONS, MAX_TEMPO, MIN_TEMPO } from '../constants'
import type { WorkstationActions } from '../useWorkstation'
import { DownloadIcon, LoopIcon, PlayIcon, StopIcon } from './icons'

interface TransportProps {
  playing: boolean
  loop: boolean
  tempo: number
  instrument: PlaybackInstrument
  feel: RhythmFeel
  exporting: boolean
  onPlay: () => void
  onStop: () => void
  onExport: () => void
  actions: Pick<WorkstationActions, 'setLoop' | 'setTempo' | 'setInstrument' | 'setFeel'>
}

export function Transport({ playing, loop, tempo, instrument, feel, exporting, onPlay, onStop, onExport, actions }: TransportProps) {
  return (
    <section className="transport panel" aria-label="Playback">
      <div className="transport__row">
        <button
          type="button"
          className="btn btn--primary transport__play"
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
        <label className="field field--inline transport__tempo">
          <span>Tempo</span>
          <div className="slider-row">
            <input type="range" min={MIN_TEMPO} max={MAX_TEMPO} value={tempo} onChange={(event) => actions.setTempo(Number(event.target.value))} />
            <output>{tempo} BPM</output>
          </div>
        </label>
      </div>
      <div className="transport__row">
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
        <button type="button" className="btn transport__export" onClick={onExport} disabled={exporting}>
          <DownloadIcon />
          <span>{exporting ? 'Exporting' : 'Export MIDI'}</span>
        </button>
      </div>
    </section>
  )
}

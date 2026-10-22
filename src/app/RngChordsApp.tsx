import { useEffect, useEffectEvent, useMemo, useRef, type CSSProperties } from 'react'
import { playDiceRoll } from '../lib/audio/sfx'
import { ADVANCED_PARAMETER_LABELS, ADVANCED_PARAMETERS, RHYTHM_LABELS } from '../lib/music/constants'
import { ChordRack } from './components/ChordRack'
import { Controls } from './components/Controls'
import { DiceTray } from './components/DiceTray'
import { Header } from './components/Header'
import { ModeTabs } from './components/ModeTabs'
import { PlayingTips } from './components/PlayingTips'
import { Transport } from './components/Transport'
import { formatDieChord, formatDuration, formatSource, totalBeats } from './format'
import type { StageDie } from './types'
import { useAppearance } from './useAppearance'
import { usePlayer } from './usePlayer'
import { useWorkstation } from './useWorkstation'

const INTERACTIVE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'])

export default function RngChordsApp() {
  const { appearance, update: updateAppearance, flip } = useAppearance()
  const { state, display, status, manualIssues, rollId, actions } = useWorkstation()
  const player = usePlayer({
    source: state.progression,
    display,
    tempo: state.tempo,
    instrument: state.playbackInstrument,
    loop: state.loopEnabled,
    notify: actions.notify,
  })

  const { chords } = display
  const duration = formatDuration(totalBeats(chords), state.tempo)

  const dice = useMemo<StageDie[]>(() => {
    if (state.mode === 'advanced') {
      return ADVANCED_PARAMETERS.map((parameter) => ({
        id: parameter,
        label: ADVANCED_PARAMETER_LABELS[parameter],
        value: state.advancedRoll.values[parameter],
        footer: `d${state.advancedConfig.faceCounts[parameter]}`,
      }))
    }

    return chords.map((chord, index) => ({
      id: `chord-${index}`,
      label: `Chord ${index + 1}`,
      value: formatDieChord(chord),
      footer: state.mode === 'guided' ? `d${state.guidedFaces[index] ?? 6}` : (RHYTHM_LABELS[chord.rhythmBeats] ?? `${chord.rhythmBeats} beats`),
      detail: chord.notes.slice(0, 3).join(' '),
    }))
  }, [chords, state.advancedConfig.faceCounts, state.advancedRoll.values, state.guidedFaces, state.mode])

  const soundedRoll = useRef(0)

  useEffect(() => {
    if (rollId === 0 || rollId === soundedRoll.current) {
      return
    }

    soundedRoll.current = rollId
    playDiceRoll(dice.length)
  }, [rollId, dice.length])

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null

    if (target && (INTERACTIVE_TAGS.has(target.tagName) || target.isContentEditable)) {
      return
    }

    if (event.code === 'Space') {
      event.preventDefault()
      void (player.playing ? player.stop() : player.start())
      return
    }

    if (chords.length === 0) {
      return
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const step = event.key === 'ArrowRight' ? 1 : -1
      const current = player.previewIndex
      const next = current === null ? (step > 0 ? 0 : chords.length - 1) : (current + step + chords.length) % chords.length
      void player.preview(next)
    } else if (event.key === 'Enter' && player.previewIndex !== null) {
      event.preventDefault()
      void player.preview(player.previewIndex)
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to the chord generator
      </a>
      <div className="page">
        <Header appearance={appearance} onAppearanceChange={updateAppearance} />

        <main id="main-content" tabIndex={-1}>
          <section className="intro">
            <h1>Roll the dice, get a chord progression.</h1>
            <p>A random chord generator for guitar, piano, and songwriting. Hear each roll, keep the chords you like, and export MIDI.</p>
          </section>

          <ModeTabs mode={state.mode} onChange={actions.setMode} />

          <div className="workbench">
            <div className="stage" style={{ '--beat-ms': `${Math.round(60000 / state.tempo)}ms` } as CSSProperties}>
              <section className="tray" aria-label="Dice">
                <div className="tray__bar">
                  <ul className="stats">
                    <li>Key of {state.progression.keyCenter}</li>
                    <li>{chords.length} {chords.length === 1 ? 'chord' : 'chords'}</li>
                    <li>{duration}</li>
                    <li>{formatSource(state.progression.source)}</li>
                  </ul>
                  <div className="tray__actions">
                    <button type="button" className="btn btn--primary" onClick={actions.roll}>
                      Roll the dice
                    </button>
                    <button type="button" className="btn btn--tray" onClick={actions.surprise}>
                      Surprise me
                    </button>
                  </div>
                </div>
                <DiceTray dice={dice} rollId={rollId} flip={flip} />
                <p className="tray__status" role="status" aria-live="polite">
                  {status}
                </p>
              </section>

              <Transport
                playing={player.playing}
                loop={state.loopEnabled}
                tempo={state.tempo}
                instrument={state.playbackInstrument}
                feel={state.rhythmFeel}
                exporting={player.exporting}
                onPlay={player.start}
                onStop={player.stop}
                onExport={player.exportMidi}
                actions={actions}
              />
              <p className="shortcuts">Space plays or stops. Arrow keys preview chords, and Enter replays the one you stopped on.</p>

              <ChordRack
                chords={chords}
                keyCenter={state.progression.keyCenter}
                highlightedIndex={player.highlightedIndex}
                playingIndex={player.playing ? player.activeIndex : null}
                keptSlots={state.keptChordSlots}
                showTheory={state.showTheory}
                sections={state.sections}
                activeSection={state.activeSection}
                onPreview={player.preview}
                actions={actions}
              />

              <PlayingTips progression={display} focus={state.instrumentFocus} onFocusChange={actions.setFocus} />
            </div>

            <Controls
              mode={state.mode}
              complexity={state.complexity}
              presetId={state.activePresetId}
              guidedFaces={state.guidedFaces}
              advancedConfig={state.advancedConfig}
              builder={state.builder}
              manualInput={state.manualInput}
              manualIssues={manualIssues}
              actions={actions}
            />
          </div>
        </main>
      </div>
    </>
  )
}

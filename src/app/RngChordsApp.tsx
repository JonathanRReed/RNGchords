import { useCallback, useEffect, useEffectEvent, useMemo, type CSSProperties } from 'react'
import { ADVANCED_PARAMETER_LABELS, ADVANCED_PARAMETERS, RHYTHM_LABELS } from '../lib/music/constants'
import { ChordSymbol } from './components/ChordSymbol'
import { DiceTable } from './components/DiceTable'
import { Header } from './components/Header'
import { Setup } from './components/Setup'
import { Sheet } from './components/Sheet'
import { chordDieOthers, dieFace, formatAdvancedFace, formatDuration, parameterDieOthers, totalBeats } from './format'
import { encodeShare, formatChart } from './share'
import type { StageDie } from './types'
import { useAppearance } from './useAppearance'
import { usePlayer } from './usePlayer'
import { useWorkstation } from './useWorkstation'

function faceForNoteCount(count: number): number {
  return count <= 3 ? 6 : count === 4 ? 8 : count === 5 ? 12 : 20
}

const INTERACTIVE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'])

export default function RngChordsApp() {
  const { appearance, update: updateAppearance, flip } = useAppearance()
  const { state, display, status, manualIssues, roll, canUndo, actions } = useWorkstation()
  const player = usePlayer({
    source: state.progression,
    display,
    tempo: state.tempo,
    instrument: state.playbackInstrument,
    loop: state.loopEnabled,
    notify: actions.notify,
  })

  const { chords } = display
  const { keyCenter } = state.progression
  const duration = formatDuration(totalBeats(chords), state.tempo)

  const dice = useMemo<StageDie[]>(() => {
    if (state.mode === 'advanced') {
      return ADVANCED_PARAMETERS.map((parameter) => {
        const { face, run } = formatAdvancedFace(parameter, chords)
        const sides = state.advancedConfig.faceCounts[parameter]

        return {
          id: parameter,
          label: ADVANCED_PARAMETER_LABELS[parameter],
          face: { main: face },
          others: parameterDieOthers(parameter, keyCenter, sides, face),
          footer: `d${sides}, rolled ${state.advancedRoll.values[parameter]}`,
          detail: run,
          faces: sides,
          mark: '',
        }
      })
    }

    return chords.map((chord, index) => {
      const sides = state.mode === 'guided' ? (state.guidedFaces[index] ?? 6) : faceForNoteCount(chord.notes.length)

      return {
        id: chord.id,
        label: `Chord ${index + 1}`,
        face: dieFace(chord),
        others: chordDieOthers(keyCenter, sides, chord.label),
        footer: state.mode === 'guided' ? `d${sides}` : (RHYTHM_LABELS[chord.rhythmBeats] ?? `${chord.rhythmBeats} beats`),
        faces: sides,
        mark: String(index + 1),
        chordIndex: index,
      }
    })
  }, [chords, keyCenter, state.advancedConfig.faceCounts, state.advancedRoll.values, state.guidedFaces, state.mode])

  const copyText = useCallback(
    async (text: string, done: string) => {
      try {
        await navigator.clipboard.writeText(text)
        actions.notify(done)
      } catch {
        actions.notify('Your browser blocked copying. Select the chords and copy them by hand.')
      }
    },
    [actions],
  )

  const copyChart = useCallback(() => {
    void copyText(formatChart(display.chords), 'Copied the chord chart.')
  }, [copyText, display.chords])

  const copyLink = useCallback(() => {
    const hash = encodeShare(state.progression.chords, state.tempo, state.playbackInstrument, state.rhythmFeel)
    void copyText(`${window.location.origin}${window.location.pathname}#${hash}`, 'Copied a link to this progression.')
  }, [copyText, state.progression.chords, state.tempo, state.playbackInstrument, state.rhythmFeel])

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null

    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
      return
    }

    if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
      if (canUndo) {
        event.preventDefault()
        actions.undo()
      }

      return
    }

    if (event.metaKey || event.ctrlKey || event.altKey) {
      return
    }

    if (event.key.toLowerCase() === 'r') {
      event.preventDefault()
      actions.roll()
      return
    }

    if (target && INTERACTIVE_TAGS.has(target.tagName)) {
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
          <h1 className="intro">Roll the dice, get a chord progression.</h1>

          <div className="workbench" style={{ '--beat-ms': `${Math.round(60000 / state.tempo)}ms` } as CSSProperties}>
            <section className="tray" aria-label="Dice">
              <DiceTable
                dice={dice}
                roll={roll}
                flip={flip}
                playingIndex={player.highlightedIndex}
                keptSlots={state.keptChordSlots}
                onPress={player.preview}
              />

              <div className="tray__rail">
                <div className="tray__key">
                  <button
                    type="button"
                    className="step-btn"
                    onClick={() => actions.transpose(-1)}
                    disabled={chords.length === 0}
                    aria-label="Down a half step"
                  >
                    <span aria-hidden="true">−</span>
                  </button>
                  <p className="tray__key-name">
                    Key of <ChordSymbol text={keyCenter} />
                  </p>
                  <button
                    type="button"
                    className="step-btn"
                    onClick={() => actions.transpose(1)}
                    disabled={chords.length === 0}
                    aria-label="Up a half step"
                  >
                    <span aria-hidden="true">+</span>
                  </button>
                </div>
                {chords.length > 0 ? (
                  <ul className="tray__stats">
                    <li>
                      {chords.length} {chords.length === 1 ? 'chord' : 'chords'}
                    </li>
                    <li>{duration}</li>
                  </ul>
                ) : null}
                <div className="tray__actions">
                  <button type="button" className="btn btn--tray" onClick={actions.surprise}>
                    Surprise me
                  </button>
                  <button type="button" className="btn btn--roll" onClick={actions.roll} aria-keyshortcuts="R">
                    {roll.id > 0 ? 'Roll again' : 'Roll the dice'}
                  </button>
                </div>
              </div>

              <p className="tray__status" role="status">
                {status}
              </p>
              <p className="sr-only" role="status">
                {chords.map((chord) => chord.label).join(', ')}
              </p>
            </section>

            <Sheet
              chords={chords}
              keyCenter={keyCenter}
              highlightedIndex={player.highlightedIndex}
              playingIndex={player.playing ? player.activeIndex : null}
              keptSlots={state.keptChordSlots}
              sections={state.sections}
              activeSection={state.activeSection}
              playing={player.playing}
              loop={state.loopEnabled}
              tempo={state.tempo}
              instrument={state.playbackInstrument}
              feel={state.rhythmFeel}
              exporting={player.exporting}
              canUndo={canUndo}
              onPlay={player.start}
              onStop={player.stop}
              onExport={player.exportMidi}
              onPreview={player.preview}
              onCopy={copyChart}
              onShare={copyLink}
              actions={actions}
            />

            <Setup
              mode={state.mode}
              complexity={state.complexity}
              keyLock={state.keyLock}
              presetId={state.activePresetId}
              guidedFaces={state.guidedFaces}
              advancedConfig={state.advancedConfig}
              builder={state.builder}
              manualInput={state.manualInput}
              manualIssues={manualIssues}
              actions={actions}
            />

            <p className="shortcuts">
              <kbd>Space</kbd> plays or stops. <kbd>R</kbd> rolls. <kbd>←</kbd> <kbd>→</kbd> step through the chords. <kbd>Ctrl</kbd> <kbd>Z</kbd> puts the
              last chords back.
            </p>
          </div>
        </main>
      </div>
    </>
  )
}

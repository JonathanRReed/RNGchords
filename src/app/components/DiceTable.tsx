import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { playDiceRoll, playImpacts } from '../../lib/audio/sfx'
import type { FlipStyle } from '../../lib/dice/flips'
import { trayLayout } from '../../lib/dice3d/layout'
import { isTableLook } from '../../lib/dice3d/looks'
import type { Anchor, DiceScene, DieSpec } from '../../lib/dice3d/scene'
import { faceText } from '../format'
import type { RollEvent, StageDie } from '../types'
import { ChordSymbol } from './ChordSymbol'
import { DiceTray } from './DiceTray'

interface DiceTableProps {
  dice: StageDie[]
  roll: RollEvent
  flip: FlipStyle
  playingIndex: number | null
  keptSlots: number[]
  onPress: (chordIndex: number) => void
}

const ALL = (count: number) => Array.from({ length: count }, (_, index) => index)

/**
 * The 3D code is its own download. Asking for it as soon as this file runs,
 * rather than after the page has hydrated, gets the dice on the table sooner.
 */
const sceneModule = typeof window === 'undefined' ? null : import('../../lib/dice3d/scene')
sceneModule?.catch(() => undefined)

/**
 * The dice on the table. Draws them as 3D solids when the browser has WebGL
 * and falls back to the flat dice when it does not.
 */
export function DiceTable({ dice, roll, flip, playingIndex, keptSlots, onPress }: DiceTableProps) {
  const feltRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<DiceScene | null>(null)
  const shownRoll = useRef<number | null>(null)
  const pressRef = useRef(onPress)
  const diceRef = useRef(dice)
  const [ready, setReady] = useState(false)
  const [flat, setFlat] = useState(false)
  const [width, setWidth] = useState(0)
  const [anchors, setAnchors] = useState<Array<Anchor | null>>([])

  pressRef.current = onPress
  diceRef.current = dice

  const specs = useMemo<DieSpec[]>(
    () =>
      dice.map((die, index) => ({
        key: die.id,
        sides: die.faces,
        accent: (index % 4) + 1,
        label: die.face,
        others: die.others,
        mark: die.mark,
      })),
    [dice],
  )

  useLayoutEffect(() => {
    const felt = feltRef.current

    if (!felt) {
      return
    }

    setWidth(felt.clientWidth)
    const observer = new ResizeObserver(() => setWidth(felt.clientWidth))
    observer.observe(felt)
    return () => observer.disconnect()
  }, [flat])

  useEffect(() => {
    const canvas = canvasRef.current
    let cancelled = false
    let scene: DiceScene | null = null

    if (!canvas) {
      return
    }

    const readTheme = () => {
      const theme = document.documentElement.dataset.theme
      return isTableLook(theme) ? theme : 'felt'
    }

    void (sceneModule ?? import('../../lib/dice3d/scene'))
      .then(({ DiceScene }) => {
        if (cancelled) {
          return
        }

        scene = new DiceScene(canvas, {
          onAnchors: setAnchors,
          onThrow: (impacts) => playImpacts(impacts, readTheme()),
          onPress: (index) => {
            const chordIndex = diceRef.current[index]?.chordIndex

            if (chordIndex !== undefined) {
              pressRef.current(chordIndex)
            }
          },
        })
        scene.setTheme(readTheme())
        sceneRef.current = scene
        setReady(true)
        void document.fonts.ready.then(() => scene?.refresh())
      })
      .catch((error: unknown) => {
        console.warn('3D dice are not available, using flat dice.', error)

        if (!cancelled) {
          setFlat(true)
        }
      })

    // The theme, color scheme, and font all live on <html>. Repaint when any of them changes.
    const observer = new MutationObserver(() => {
      scene?.setTheme(readTheme())
      void document.fonts.ready.then(() => scene?.refresh())
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-scheme', 'data-font'] })

    return () => {
      cancelled = true
      observer.disconnect()
      scene?.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    if (ready && width > 0) {
      sceneRef.current?.setSize(width)
    }
  }, [ready, width])

  useEffect(() => {
    const scene = sceneRef.current

    if (!ready || !scene) {
      return
    }

    const first = shownRoll.current === null
    const rolled = first || shownRoll.current !== roll.id
    shownRoll.current = roll.id
    scene.setDice(specs, rolled ? (first ? ALL(specs.length) : (roll.slots ?? ALL(specs.length))) : [], roll.quiet ? 'none' : flip)
    // `flip` is left out on purpose: it is read when a roll happens, and changing it alone should not re-throw.
  }, [ready, specs, roll])

  useEffect(() => {
    if (ready) {
      sceneRef.current?.setActive(playingIndex)
    }
  }, [ready, playingIndex])

  useEffect(() => {
    if (ready) {
      sceneRef.current?.setKept(keptSlots)
    }
  }, [ready, keptSlots, specs])

  const soundedRoll = useRef(0)

  useEffect(() => {
    if (flat && roll.id !== 0 && roll.id !== soundedRoll.current) {
      soundedRoll.current = roll.id
      playDiceRoll(dice.length)
    }
  }, [flat, roll.id, dice.length])

  if (flat) {
    return <DiceTray dice={dice} rollId={roll.id} flip={flip} playingIndex={playingIndex} keptSlots={keptSlots} onPress={onPress} />
  }

  const layout = width > 0 ? trayLayout(dice.length, width) : null

  return (
    <div
      ref={feltRef}
      className="felt"
      data-ready={ready || undefined}
      style={layout ? ({ aspectRatio: String(layout.aspect) } as CSSProperties) : undefined}
    >
      <canvas ref={canvasRef} className="felt__canvas" aria-hidden="true" />
      {dice.length === 0 ? <p className="felt__empty">The table is empty.</p> : null}
      <ol className="felt__tags" aria-label="Dice">
        {dice.map((die, index) => {
          const anchor = anchors[index]
          const style = anchor ? { left: anchor.x, top: anchor.y } : undefined
          const kept = die.chordIndex !== undefined && keptSlots.includes(die.chordIndex)
          const body = (
            <>
              <span className="die-tag__name">{die.chordIndex !== undefined ? <ChordSymbol text={faceText(die.face)} /> : die.label}</span>
              {die.detail ? <ChordSymbol className="die-tag__detail" text={die.detail} /> : null}
            </>
          )

          return (
            <li key={die.id} className="die-tag" data-shown={anchor ? true : undefined} data-playing={index === playingIndex || undefined} data-kept={kept || undefined} style={style}>
              {die.chordIndex !== undefined ? (
                <button
                  type="button"
                  className="die-tag__hit"
                  onClick={() => {
                    sceneRef.current?.hop(index)
                    onPress(die.chordIndex as number)
                  }}
                  aria-label={`Chord ${die.chordIndex + 1}, ${faceText(die.face)}${kept ? ', kept' : ''}. Hear it.`}
                >
                  {body}
                </button>
              ) : (
                <span className="die-tag__hit">{body}</span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

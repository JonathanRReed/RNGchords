import { describe, expect, it } from 'vitest'
import { chordDieOthers, dieFace, faceText, parameterDieOthers } from '../src/app/format'
import { CAMERA_TILT, trayGeometry, trayLayout } from '../src/lib/dice3d/layout'
import { simulateThrow } from '../src/lib/dice3d/physics'
import { buildDieMesh, dot, getPolyhedron, length, readFace, restOrientation, rotate, sub, tiltFromFlat } from '../src/lib/dice3d/polyhedra'
import { splitSymbol } from '../src/lib/music/accidentals'
import { createChordDescriptor } from '../src/lib/music/chords'

const TOWARD_VIEWER: [number, number, number] = [0, Math.cos(CAMERA_TILT), Math.sin(CAMERA_TILT)]
const SIDES = [4, 6, 8, 10, 12, 20]

describe('dice solids', () => {
  it('finds the right number of faces and corners for every die', () => {
    const cornersPerFace: Record<number, number> = { 4: 3, 6: 4, 8: 3, 10: 4, 12: 5, 20: 3 }

    for (const sides of SIDES) {
      const polyhedron = getPolyhedron(sides)
      expect(polyhedron.faces).toHaveLength(sides)
      expect(polyhedron.faces.every((face) => face.corners.length === cornersPerFace[sides])).toBe(true)
    }
  })

  it('keeps every face flat and pointing outward', () => {
    for (const sides of SIDES) {
      const polyhedron = getPolyhedron(sides)

      for (const face of polyhedron.faces) {
        expect(dot(face.normal, face.center)).toBeGreaterThan(0)
        expect(length(face.normal)).toBeCloseTo(1, 6)

        for (const corner of face.corners) {
          expect(Math.abs(dot(face.normal, sub(polyhedron.corners[corner]!, face.center)))).toBeLessThan(1e-6)
        }
      }
    }
  })

  it('sets a die down flat and reads the result from the top, or from the front on a d4', () => {
    for (const sides of SIDES) {
      const polyhedron = getPolyhedron(sides)
      const orientation = restOrientation(polyhedron, 0, 0.7)
      const read = readFace(polyhedron, orientation, TOWARD_VIEWER)
      const normal = rotate(orientation, polyhedron.faces[read]!.normal)

      expect(tiltFromFlat(polyhedron, orientation)).toBeCloseTo(0, 6)

      if (sides === 4) {
        expect(read).not.toBe(0)
        expect(dot(normal, TOWARD_VIEWER)).toBeGreaterThan(0)
      } else {
        expect(normal[1]).toBeCloseTo(1, 6)
      }
    }
  })

  it('builds a closed bevelled mesh with unit normals', () => {
    for (const sides of SIDES) {
      const mesh = buildDieMesh(getPolyhedron(sides), 0.07)
      expect(mesh.positions.length % 9).toBe(0)
      expect(mesh.normals).toHaveLength(mesh.positions.length)
      expect(mesh.cells).toHaveLength(mesh.positions.length / 3)

      for (let index = 0; index < mesh.normals.length; index += 3) {
        expect(Math.hypot(mesh.normals[index]!, mesh.normals[index + 1]!, mesh.normals[index + 2]!)).toBeCloseTo(1, 5)
      }
    }
  })
})

describe('tray layout', () => {
  it('puts every die in one row on a wide screen and wraps on a narrow one', () => {
    expect(trayLayout(4, 900)).toMatchObject({ cols: 4, rows: 1 })
    expect(trayLayout(8, 900)).toMatchObject({ cols: 4, rows: 2 })
    expect(trayLayout(4, 380)).toMatchObject({ cols: 2, rows: 2 })
    expect(trayLayout(8, 380)).toMatchObject({ cols: 3, rows: 3 })
  })

  it('keeps every lane inside the walls', () => {
    for (const [count, width] of [
      [1, 900],
      [4, 900],
      [6, 900],
      [8, 900],
      [4, 380],
      [8, 380],
    ] as const) {
      const tray = trayGeometry(count, trayLayout(count, width))
      expect(tray.slots).toHaveLength(count)

      for (const slot of tray.slots) {
        for (const wall of tray.walls) {
          expect(dot(sub(slot, wall.point), wall.normal)).toBeGreaterThan(1)
        }
      }
    }
  })
})

describe('throwing dice', () => {
  const sides = [6, 8, 10, 12]
  const tray = trayGeometry(sides.length, trayLayout(sides.length, 900))
  const dice = sides.map((count) => ({ sides: count }))

  it('lands every die flat on the table, inside the walls, and near its own lane', () => {
    for (const style of ['throw', 'drop'] as const) {
      for (let seed = 1; seed <= 12; seed += 1) {
        const result = simulateThrow(dice, tray, style, seed * 977, TOWARD_VIEWER)

        result.finals.forEach((final, index) => {
          const polyhedron = getPolyhedron(sides[index]!)
          expect(tiltFromFlat(polyhedron, final.orientation)).toBeLessThan(0.004)
          expect(final.position[1]).toBeCloseTo(polyhedron.restHeight, 1)
          expect(Math.hypot(final.position[0] - tray.slots[index]![0], final.position[2] - tray.slots[index]![2])).toBeLessThan(2.2)

          for (const wall of tray.walls) {
            expect(dot(sub(final.position, wall.point), wall.normal)).toBeGreaterThan(0)
          }
        })
      }
    }
  })

  it('gives the same throw for the same seed', () => {
    const first = simulateThrow(dice, tray, 'throw', 4242, TOWARD_VIEWER)
    const second = simulateThrow(dice, tray, 'throw', 4242, TOWARD_VIEWER)
    expect(second.frameCount).toBe(first.frameCount)
    expect(Array.from(second.frames)).toEqual(Array.from(first.frames))
  })

  it('records the flight frame by frame and ends on the resting pose', () => {
    const result = simulateThrow(dice, tray, 'throw', 99, TOWARD_VIEWER)
    expect(result.frames).toHaveLength(result.frameCount * dice.length * 7)
    expect(result.duration).toBeGreaterThan(0.5)
    expect(result.duration).toBeLessThan(4.5)

    result.finals.forEach((final, index) => {
      const at = (result.frameCount - 1) * dice.length * 7 + index * 7
      expect(result.frames[at]).toBeCloseTo(final.position[0], 4)
      expect(result.frames[at + 2]).toBeCloseTo(final.position[2], 4)
    })
  })

  it('hears the dice hit the table', () => {
    const { impacts, duration } = simulateThrow(dice, tray, 'throw', 7, TOWARD_VIEWER)
    expect(impacts.some((impact) => impact.kind === 'table')).toBe(true)
    expect(impacts.every((impact) => impact.time >= 0 && impact.time <= duration + 0.1 && impact.strength >= 0 && impact.strength <= 1)).toBe(true)
  })

  it('leaves kept dice exactly where they were', () => {
    const settled = simulateThrow(dice, tray, 'throw', 31, TOWARD_VIEWER)
    const kept = settled.finals[1]!
    const again = simulateThrow(
      dice.map((die, index) => (index === 1 ? { ...die, rest: { position: kept.position, orientation: kept.orientation } } : die)),
      tray,
      'throw',
      32,
      TOWARD_VIEWER,
    )

    expect(again.finals[1]!.position).toEqual(kept.position)
    expect(again.finals[1]!.orientation).toEqual(kept.orientation)
    expect(again.finals[1]!.face).toBe(kept.face)
  })
})

describe('die faces', () => {
  const chord = (root: 'C' | 'Bb', quality: 'maj' | 'min', extensions: Array<'maj7' | '7' | 'b9'>) =>
    createChordDescriptor({ id: 'x', root, quality, extensions, source: 'guided' })

  it('keeps short names on one line and splits long ones after the root', () => {
    expect(dieFace(chord('C', 'maj', []))).toEqual({ main: 'C' })
    expect(dieFace(chord('Bb', 'min', ['maj7']))).toEqual({ main: 'Bbm', sub: '(maj7)' })
    expect(faceText(dieFace(chord('Bb', 'min', ['maj7'])))).toBe('Bbm(maj7)')
  })

  it('fills the other faces with chords from the key, never the rolled one', () => {
    const others = chordDieOthers('F', 8, 'Gm')
    expect(others).toHaveLength(7)
    expect(others.some((face) => faceText(face) === 'Gm')).toBe(false)
    expect(faceText(others[0]!)).toBe('F')
    expect(others.some((face) => face.main.startsWith('Bb'))).toBe(true)
  })

  it('fills an advanced die with the rest of what it decides', () => {
    expect(parameterDieOthers('rhythm', 'C', 6, '2').map((face) => face.main)).toEqual(['½', '1', '1½', '3', '4'])
    expect(parameterDieOthers('roots', 'G', 4, 'G').map((face) => face.main)).toEqual(['A', 'B', 'C'])
  })
})

describe('accidentals', () => {
  const kinds = (text: string) => splitSymbol(text).map((piece) => (piece.kind === 'text' ? piece.text : piece.kind))

  it('reads b as a flat only where a musician would', () => {
    expect(kinds('Bb')).toEqual(['B', 'flat'])
    expect(kinds('Bbm7b5')).toEqual(['B', 'flat', 'm7', 'flat', '5'])
    expect(kinds('F#m')).toEqual(['F', 'sharp', 'm'])
    expect(kinds('Asus4')).toEqual(['Asus4'])
    expect(kinds('B')).toEqual(['B'])
    expect(kinds('Db/Ab')).toEqual(['D', 'flat', '/A', 'flat'])
    expect(kinds('D7#9b13')).toEqual(['D7', 'sharp', '9', 'flat', '13'])
  })
})

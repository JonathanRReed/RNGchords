/**
 * The table, drawn with WebGL: real solids with real light and shadow on
 * them, played back from the recorded throw in physics.ts. Nothing here runs
 * while the dice are at rest; a frame is drawn only when something moved.
 */

import {
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Quaternion,
  Raycaster,
  RepeatWrapping,
  RingGeometry,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { atlasUvs, paintAtlas, type AtlasStyle, type FaceLabel, type FacePaint } from './labels'
import { CAMERA_FOV, CAMERA_TILT, trayGeometry, trayLayout, type TrayGeometry, type TrayLayout } from './layout'
import { LOOKS, type Look, type TableLook } from './looks'
import { simulateThrow, type Impact, type Pose, type ThrowResult, type ThrowStyle } from './physics'
import { buildDieMesh, dot, getPolyhedron, readFace, restOrientation, rotate, type Polyhedron, type Quat, type Vec3 } from './polyhedra'

export interface DieSpec {
  /** Stays the same for as long as this is the same die on the table. */
  key: string
  sides: number
  /** 1 to 4: which of the theme's four die colours. */
  accent: number
  label: FaceLabel
  /** What the other faces say. */
  others: FaceLabel[]
  /** Printed on the table where this die is meant to land. */
  mark: string
}

/** Where a die's caption goes, in CSS pixels from the canvas corner. Null while the die is in the air. */
export interface Anchor {
  x: number
  y: number
}

export interface SceneEvents {
  onAnchors: (anchors: Array<Anchor | null>) => void
  onThrow: (impacts: Impact[]) => void
  onPress: (index: number) => void
}

interface Die {
  spec: DieSpec
  polyhedron: Polyhedron
  mesh: Mesh<BufferGeometry, MeshPhysicalMaterial>
  ring: Mesh<RingGeometry, MeshBasicMaterial>
  canvas: HTMLCanvasElement
  /** Lettering in white on black, used to make it glow. Only themes with lit dice have one. */
  maskCanvas: HTMLCanvasElement | null
  texture: CanvasTexture
  mask: CanvasTexture | null
  /** What the faces were last painted with, so an unchanged die is not painted again. */
  painted: string
  pose: Pose
  face: number
  angle: number
  /** Seconds into the current throw at which this die stops moving. Zero when it was not thrown. */
  restAt: number
  hopAt: number
  lit: number
}

const UP_ON_SCREEN: Vec3 = [0, Math.sin(CAMERA_TILT), -Math.cos(CAMERA_TILT)]
const TOWARD_VIEWER: Vec3 = [0, Math.cos(CAMERA_TILT), Math.sin(CAMERA_TILT)]
const HOP_SECONDS = 0.42
const FLOOR_MARGIN = 1.5

function hash(text: string): number {
  let value = 2166136261

  for (let index = 0; index < text.length; index += 1) {
    value = Math.imul(value ^ text.charCodeAt(index), 16777619)
  }

  return value >>> 0
}

/** Turns any CSS colour, including oklch(), into one the canvas and WebGL both accept. */
function makeColorReader(): (value: string) => string {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d', { willReadFrequently: true })

  return (value) => {
    if (!context) {
      return '#888'
    }

    context.clearRect(0, 0, 1, 1)
    context.fillStyle = '#888'
    context.fillStyle = value
    context.fillRect(0, 0, 1, 1)
    const [red = 0, green = 0, blue = 0, alpha = 255] = context.getImageData(0, 0, 1, 1).data
    const solid = (channel: number) => Math.round(alpha > 0 ? Math.min(255, (channel * 255) / alpha) : channel)
    return `rgb(${solid(red)}, ${solid(green)}, ${solid(blue)})`
  }
}

function mix(from: string, to: string, amount: number): string {
  const a = new Color(from)
  return `#${a.lerp(new Color(to), amount).getHexString()}`
}

function noiseTile(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')

  if (context) {
    const image = context.createImageData(size, size)

    for (let index = 0; index < image.data.length; index += 4) {
      const value = 96 + Math.random() * 96
      image.data[index] = value
      image.data[index + 1] = value
      image.data[index + 2] = value
      image.data[index + 3] = 255
    }

    context.putImageData(image, 0, 0)
  }

  return canvas
}

const geometries = new Map<string, BufferGeometry>()

function dieGeometry(polyhedron: Polyhedron, bevel: number): BufferGeometry {
  const key = `${polyhedron.sides}:${bevel}`
  let geometry = geometries.get(key)

  if (!geometry) {
    const mesh = buildDieMesh(polyhedron, bevel)
    geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(mesh.positions, 3))
    geometry.setAttribute('normal', new Float32BufferAttribute(mesh.normals, 3))
    geometry.setAttribute('uv', new Float32BufferAttribute(atlasUvs(mesh, polyhedron), 2))
    geometry.computeBoundingSphere()
    geometries.set(key, geometry)
  }

  return geometry
}

export class DiceScene {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(CAMERA_FOV, 2, 0.5, 80)
  private readonly keyLight = new DirectionalLight(0xffffff, 2)
  private readonly fillLight = new HemisphereLight(0xffffff, 0x333333, 0.5)
  private readonly floor: Mesh<PlaneGeometry, MeshPhysicalMaterial>
  private readonly floorCanvas = document.createElement('canvas')
  private readonly floorTexture: CanvasTexture
  private readonly grain: CanvasTexture
  private readonly diceGroup = new Group()
  private readonly raycaster = new Raycaster()
  private readonly readColor = makeColorReader()
  private readonly token: (name: string) => string

  private dice: Die[] = []
  private look: Look = LOOKS.felt
  private layout: TrayLayout = trayLayout(4, 900)
  private tray: TrayGeometry = trayGeometry(4, this.layout)
  private width = 900
  private height = 0
  private recording: ThrowResult | null = null
  private recordingStart = 0
  private frame = 0
  private hovered = -1
  private active = -1
  private kept = new Set<number>()
  private disposed = false
  private floorPainted = ''

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly events: SceneEvents,
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'default' })
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = NeutralToneMapping
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFShadowMap

    const styles = getComputedStyle(document.documentElement)
    this.token = (name) => this.readColor(styles.getPropertyValue(name).trim() || '#888')

    const environment = new PMREMGenerator(this.renderer)
    this.scene.environment = environment.fromScene(new RoomEnvironment(), 0.04).texture
    environment.dispose()

    this.keyLight.castShadow = true
    // Phones get a smaller shadow map: the tray is a third of the width there.
    const shadowSize = window.matchMedia('(max-width: 720px)').matches ? 1024 : 2048
    this.keyLight.shadow.mapSize.set(shadowSize, shadowSize)
    this.keyLight.shadow.bias = -0.0004
    this.keyLight.shadow.normalBias = 0.03
    this.keyLight.shadow.radius = 3.5
    this.scene.add(this.keyLight, this.keyLight.target, this.fillLight, this.diceGroup)

    this.grain = new CanvasTexture(noiseTile(256))
    this.grain.wrapS = RepeatWrapping
    this.grain.wrapT = RepeatWrapping

    this.floorTexture = new CanvasTexture(this.floorCanvas)
    this.floorTexture.colorSpace = SRGBColorSpace
    this.floorTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
    this.floor = new Mesh(new PlaneGeometry(1, 1), new MeshPhysicalMaterial({ map: this.floorTexture, bumpMap: this.grain }))
    this.floor.rotation.x = -Math.PI / 2
    this.floor.receiveShadow = true
    this.scene.add(this.floor)

    canvas.addEventListener('pointermove', this.handleMove)
    canvas.addEventListener('pointerleave', this.handleLeave)
    canvas.addEventListener('click', this.handleClick)
    canvas.addEventListener('webglcontextlost', this.handleContextLost)
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored)
  }

  /* ---------- Public ---------- */

  setTheme(theme: TableLook): void {
    this.look = LOOKS[theme]
    this.keyLight.intensity = this.look.keyLight
    this.fillLight.intensity = this.look.fillLight
    this.scene.environmentIntensity = this.look.reflections
    this.keyLight.shadow.intensity = this.look.shadow

    const floor = this.floor.material
    floor.roughness = this.look.floor.roughness
    floor.sheen = this.look.floor.sheen
    floor.sheenRoughness = 0.5
    floor.sheenColor = new Color(mix(this.token('--table'), '#ffffff', 0.35))
    floor.bumpScale = this.look.floor.grain

    this.paintFloor()

    // Materials depend on the theme, so every die is rebuilt in place.
    const specs = this.dice.map((die) => die.spec)
    const poses = this.dice.map((die) => ({ pose: die.pose, face: die.face, angle: die.angle }))
    this.clearDice()
    this.dice = specs.map((spec, index) => this.makeDie(spec, poses[index]!.pose, poses[index]!.face, poses[index]!.angle))
    this.applyRings()
    this.reportAnchors()
    this.draw()
  }

  /** Sets the width in CSS pixels. The height follows from how many rows of dice there are. */
  setSize(width: number): void {
    if (width < 2) {
      return
    }

    const layout = trayLayout(this.dice.length, width)
    const changed = layout.cols !== this.layout.cols || layout.rows !== this.layout.rows
    this.width = width
    this.arrange(layout)

    if (changed && !this.recording) {
      // The lanes moved, so the dice are set down again in their new ones.
      this.dice.forEach((die, index) => this.seat(die, index))
      this.repaintAll()
    }

    this.paintFloor()
    this.reportAnchors()
    this.draw()
  }

  /**
   * Shows a set of dice. `thrown` lists the ones to roll; the rest stay where
   * they lie, or are set down in their lanes if they are new.
   */
  setDice(specs: DieSpec[], thrown: number[], style: ThrowStyle | 'none'): void {
    const before = new Map(this.dice.map((die) => [die.spec.key, die]))
    const sameCount = specs.length === this.dice.length
    const previous = this.dice
    const layout = trayLayout(specs.length, this.width)
    const lanesMoved = layout.cols !== this.layout.cols || layout.rows !== this.layout.rows || !sameCount
    const rolling = new Set(style === 'none' ? [] : thrown)

    this.finishRecording()
    this.arrange(layout, specs.length)

    const next: Array<{ spec: DieSpec; kept: Die | null }> = specs.map((spec, index) => {
      // With the same number of dice each one keeps its place; otherwise a die is followed by its key.
      const match = sameCount ? previous[index] : before.get(spec.key)
      return { spec, kept: match && match.spec.sides === spec.sides && !rolling.has(index) ? match : null }
    })

    const stays = new Set(next.flatMap((entry) => (entry.kept ? [entry.kept] : [])))

    for (const die of previous) {
      if (!stays.has(die)) {
        this.removeDie(die)
      }
    }

    if (lanesMoved) {
      // The lanes shifted under the dice that stayed, so they are set down again.
      next.forEach((entry, index) => {
        if (entry.kept) {
          this.seat(entry.kept, index)
        }
      })
    }

    // A new die that is not part of a roll is dropped in from above.
    const dropping = new Set<number>()

    next.forEach((entry, index) => {
      if (!entry.kept && !rolling.has(index) && style !== 'none' && !lanesMoved) {
        dropping.add(index)
      }
    })

    const flying = new Set([...rolling, ...dropping])

    if (flying.size === 0) {
      this.dice = next.map((entry, index) => {
        if (entry.kept) {
          entry.kept.spec = entry.spec
          return entry.kept
        }

        const die = this.makeDie(entry.spec, { position: [0, 0, 0], orientation: [0, 0, 0, 1] }, 0, 0)
        this.seat(die, index)
        return die
      })
      this.paintFloor()
      this.repaintAll()
      this.applyRings()
      this.reportAnchors()
      this.draw()
      return
    }

    const flight: ThrowStyle = style === 'none' || rolling.size === 0 ? 'drop' : style
    const result = simulateThrow(
      next.map((entry) => ({ sides: entry.spec.sides, rest: entry.kept ? entry.kept.pose : undefined })),
      this.tray,
      flight,
      (Math.random() * 0xffffffff) >>> 0,
      TOWARD_VIEWER,
    )

    this.dice = next.map((entry, index) => {
      const final = result.finals[index]!
      const pose: Pose = { position: final.position, orientation: final.orientation }

      if (entry.kept) {
        entry.kept.spec = entry.spec
        entry.kept.restAt = 0
        return entry.kept
      }

      const polyhedron = getPolyhedron(entry.spec.sides)
      const die = this.makeDie(entry.spec, pose, final.face, this.uprightAngle(polyhedron, final.orientation, final.face, entry.spec.key))
      die.restAt = this.restTime(result, index)
      return die
    })

    this.paintFloor()
    this.repaintAll()
    this.applyRings()
    this.recording = result
    this.recordingStart = performance.now()
    this.reportAnchors()
    this.events.onThrow(result.impacts)
    this.run()
  }

  setActive(index: number | null): void {
    const next = index ?? -1

    if (next === this.active) {
      return
    }

    this.active = next

    if (next >= 0) {
      this.hop(next)
    }

    this.run()
  }

  setKept(indices: number[]): void {
    this.kept = new Set(indices)
    this.applyRings()
    this.draw()
  }

  hop(index: number): void {
    const die = this.dice[index]

    if (die) {
      die.hopAt = performance.now()
      this.run()
    }
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.frame)
    this.canvas.removeEventListener('pointermove', this.handleMove)
    this.canvas.removeEventListener('pointerleave', this.handleLeave)
    this.canvas.removeEventListener('click', this.handleClick)
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost)
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored)
    this.clearDice()
    this.floor.geometry.dispose()
    this.floor.material.dispose()
    this.floorTexture.dispose()
    this.grain.dispose()
    this.scene.environment?.dispose()
    this.renderer.dispose()
  }

  /* ---------- Layout ---------- */

  private arrange(layout: TrayLayout, count = this.dice.length): void {
    this.layout = layout
    this.tray = trayGeometry(count, layout)
    this.height = Math.max(2, Math.round(this.width / layout.aspect))
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setSize(this.width, this.height, false)

    const { camera, floor } = this.tray
    this.camera.aspect = this.width / this.height
    this.camera.position.set(camera[0], camera[1], camera[2])
    this.camera.lookAt(0, 0, 0)
    this.camera.updateProjectionMatrix()
    this.camera.updateMatrixWorld()

    const halfWidth = floor[2][0] + FLOOR_MARGIN
    const depth = this.tray.nearZ - this.tray.farZ + FLOOR_MARGIN * 2
    const middle = (this.tray.nearZ + this.tray.farZ) / 2
    this.floor.scale.set(halfWidth * 2, depth, 1)
    this.floor.position.set(0, 0, middle)

    this.keyLight.position.set(-halfWidth * 0.55 - 2, 11, middle + 3.5)
    this.keyLight.target.position.set(0, 0, middle)
    const shadow = this.keyLight.shadow.camera
    const span = Math.max(halfWidth, depth / 2) + 1
    shadow.left = -span
    shadow.right = span
    shadow.top = span
    shadow.bottom = -span
    shadow.near = 1
    shadow.far = 40
    shadow.updateProjectionMatrix()
  }

  /** Sets a die down in its lane, as if it had been placed by hand. */
  private seat(die: Die, index: number): void {
    const slot = this.tray.slots[index] ?? [0, 0, 0]
    const seed = hash(die.spec.key)
    const faceDown = seed % die.polyhedron.faces.length
    const yaw = (((seed >>> 8) % 1000) / 1000 - 0.5) * 0.9
    const orientation = restOrientation(die.polyhedron, faceDown, yaw)

    die.pose = { position: [slot[0], die.polyhedron.restHeight, slot[2]], orientation }
    die.face = readFace(die.polyhedron, orientation, TOWARD_VIEWER)
    die.angle = this.uprightAngle(die.polyhedron, orientation, die.face, die.spec.key)
    die.restAt = 0
    this.placeMesh(die, die.pose.position, die.pose.orientation)
  }

  /** The turn that makes a face's text read level on screen, plus a slight natural skew. */
  private uprightAngle(polyhedron: Polyhedron, orientation: Quat, faceIndex: number, key: string): number {
    const face = polyhedron.faces[faceIndex]!
    const right = rotate(orientation, face.right)
    const up = rotate(orientation, face.up)
    const skew = ((hash(key) % 100) / 100 - 0.5) * 0.16
    return Math.atan2(-dot(UP_ON_SCREEN, right), dot(UP_ON_SCREEN, up)) + skew
  }

  private restTime(result: ThrowResult, index: number): number {
    const dice = result.finals.length
    const last = (result.frameCount - 1) * dice * 7 + index * 7

    for (let frame = result.frameCount - 2; frame >= 0; frame -= 1) {
      const at = frame * dice * 7 + index * 7
      const drift =
        Math.abs(result.frames[at]! - result.frames[last]!) +
        Math.abs(result.frames[at + 1]! - result.frames[last + 1]!) +
        Math.abs(result.frames[at + 2]! - result.frames[last + 2]!)
      const turn =
        result.frames[at + 3]! * result.frames[last + 3]! +
        result.frames[at + 4]! * result.frames[last + 4]! +
        result.frames[at + 5]! * result.frames[last + 5]! +
        result.frames[at + 6]! * result.frames[last + 6]!

      if (drift > 0.03 || Math.abs(turn) < 0.9995) {
        return (frame + 1) * result.step
      }
    }

    return result.step
  }

  /* ---------- Dice ---------- */

  private makeDie(spec: DieSpec, pose: Pose, face: number, angle: number): Die {
    const polyhedron = getPolyhedron(spec.sides)
    const look = this.look.die
    const canvas = document.createElement('canvas')
    const glowing = look.glow > 0
    const maskCanvas = glowing ? document.createElement('canvas') : null
    const texture = new CanvasTexture(canvas)
    const mask = maskCanvas ? new CanvasTexture(maskCanvas) : null
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy()

    if (mask) {
      mask.anisotropy = texture.anisotropy
    }

    const glass = look.transmission > 0
    const tint = this.token(`--die-a${spec.accent}`)
    const material = new MeshPhysicalMaterial({
      map: texture,
      roughness: look.roughness,
      clearcoat: look.clearcoat,
      clearcoatRoughness: look.clearcoatRoughness,
      transmission: look.transmission,
      thickness: glass ? 0.9 : 0,
      ior: 1.5,
      attenuationColor: new Color(tint),
      attenuationDistance: glass ? 2.6 : Infinity,
      emissive: new Color(look.glow > 0 ? this.token(`--die-ink${spec.accent}`) : this.token('--accent-solid')),
      emissiveIntensity: look.glow,
      emissiveMap: mask,
    })

    const mesh = new Mesh(dieGeometry(polyhedron, look.bevel), material)
    mesh.castShadow = true
    mesh.receiveShadow = true

    const ring = new Mesh(
      new RingGeometry(polyhedron.reach + 0.2, polyhedron.reach + 0.27, 72),
      new MeshBasicMaterial({ color: new Color(this.token('--accent-solid')), transparent: true, opacity: 0.9 }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.visible = false

    this.diceGroup.add(mesh, ring)

    const die: Die = { spec, polyhedron, mesh, ring, canvas, maskCanvas, texture, mask, pose, face, angle, painted: '', restAt: 0, hopAt: 0, lit: 0 }
    mesh.userData.die = die
    this.placeMesh(die, pose.position, pose.orientation)
    return die
  }

  private removeDie(die: Die): void {
    this.diceGroup.remove(die.mesh, die.ring)
    die.mesh.material.dispose()
    die.ring.geometry.dispose()
    die.ring.material.dispose()
    die.texture.dispose()
    die.mask?.dispose()
  }

  private clearDice(): void {
    for (const die of this.dice) {
      this.removeDie(die)
    }

    this.dice = []
  }

  private placeMesh(die: Die, position: Vec3, orientation: Quat, lift = 0): void {
    die.mesh.position.set(position[0], position[1] + lift, position[2])
    die.mesh.quaternion.set(orientation[0], orientation[1], orientation[2], orientation[3])
    die.ring.position.set(position[0], 0.012, position[2])
  }

  private atlasStyle(die: Die): AtlasStyle {
    const look = this.look.die
    const accent = die.spec.accent
    const light = this.token(`--die-a${accent}`)
    const dark = this.token(`--die-b${accent}`)
    const ink = this.token(`--die-ink${accent}`)
    const body = mix(light, dark, look.shade)
    const edge =
      look.edge === 'worn' ? mix(body, dark, 0.5) : look.edge === 'lit' ? mix(light, '#ffffff', 0.75) : look.edge === 'dark' ? this.token('--die-edge') : body
    const family = getComputedStyle(document.documentElement).getPropertyValue('--die-font').trim() || 'sans-serif'

    return { body, ink: look.glow > 0 ? mix(body, ink, 0.6) : ink, edge, font: family, weight: look.weight }
  }

  private repaint(die: Die): void {
    let other = 0
    const faces: FacePaint[] = die.polyhedron.faces.map((_, index) => {
      if (index === die.face) {
        return { label: die.spec.label, angle: die.angle }
      }

      const label = die.spec.others[other % Math.max(1, die.spec.others.length)] ?? { main: '' }
      other += 1
      return { label, angle: 0 }
    })
    const style = this.atlasStyle(die)
    const signature = JSON.stringify([faces, style])

    if (signature === die.painted) {
      return
    }

    die.painted = signature
    paintAtlas(die.canvas, die.polyhedron, faces, style)
    die.texture.needsUpdate = true

    if (die.maskCanvas && die.mask) {
      paintAtlas(die.maskCanvas, die.polyhedron, faces, { ...style, mask: true, edgeLevel: this.look.die.edge === 'lit' ? 0.5 : 0 })
      die.mask.needsUpdate = true
    }
  }

  private repaintAll(): void {
    for (const die of this.dice) {
      this.repaint(die)
    }
  }

  /** Repaints after a webfont arrives, since the first paint may have used a fallback. */
  refresh(): void {
    this.floorPainted = ''

    for (const die of this.dice) {
      die.painted = ''
    }

    this.paintFloor()
    this.repaintAll()
    this.draw()
  }

  private applyRings(): void {
    this.dice.forEach((die, index) => {
      die.ring.visible = this.kept.has(index)
    })
  }

  /* ---------- Floor ---------- */

  private paintFloor(): void {
    const { floor, slots } = this.tray
    const look = this.look.floor
    const base = this.token('--table')
    const deep = this.token('--table-deep')
    const mark = this.token('--table-mark')
    const signature = JSON.stringify([this.layout, slots.length, this.dice.map((die) => die.spec.mark), look, base, deep, mark])

    // The cloth only changes with the lanes, their numbers, or the theme. A plain reroll leaves it alone.
    if (signature === this.floorPainted) {
      return
    }

    this.floorPainted = signature

    const halfWidth = floor[2][0] + FLOOR_MARGIN
    const depth = this.tray.nearZ - this.tray.farZ + FLOOR_MARGIN * 2
    const scale = Math.min(120, 2048 / (halfWidth * 2))
    const canvas = this.floorCanvas
    const pixelsWide = Math.round(halfWidth * 2 * scale)
    const pixelsDeep = Math.round(depth * scale)

    if (canvas.width !== pixelsWide || canvas.height !== pixelsDeep) {
      // A texture keeps the size it was first uploaded at, so a resized canvas needs a fresh one.
      this.floorTexture.dispose()
    }

    canvas.width = pixelsWide
    canvas.height = pixelsDeep

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    const toX = (x: number) => (x + halfWidth) * scale
    const toY = (z: number) => (z - this.tray.farZ + FLOOR_MARGIN) * scale

    context.fillStyle = base
    context.fillRect(0, 0, canvas.width, canvas.height)

    if (look.pattern === 'grid') {
      context.strokeStyle = mark
      for (const [step, alpha] of [
        [0.5, 0.07],
        [2.5, 0.16],
      ] as const) {
        context.globalAlpha = alpha
        context.lineWidth = 1.2
        context.beginPath()
        for (let x = -Math.ceil(halfWidth / step) * step; x <= halfWidth; x += step) {
          context.moveTo(toX(x), 0)
          context.lineTo(toX(x), canvas.height)
        }
        for (let z = -Math.ceil(depth / step) * step; z <= depth; z += step) {
          context.moveTo(0, toY(z))
          context.lineTo(canvas.width, toY(z))
        }
        context.stroke()
      }
      context.globalAlpha = 1
    } else if (look.pattern === 'dots') {
      context.fillStyle = mix(base, '#ffffff', 0.09)
      const step = 0.32 * scale
      for (let y = step / 2; y < canvas.height; y += step) {
        for (let x = step / 2; x < canvas.width; x += step) {
          context.fillRect(x - 1.5, y - 1.5, 3, 3)
        }
      }
    } else if (look.pattern === 'pile') {
      // Brushed nap: long soft streaks where the pile lies in different directions.
      context.globalAlpha = 0.1
      for (let streak = 0; streak < 26; streak += 1) {
        const x = Math.random() * canvas.width
        const gradient = context.createLinearGradient(x - 220, 0, x + 220, canvas.height)
        gradient.addColorStop(0, 'transparent')
        gradient.addColorStop(0.5, streak % 2 === 0 ? mix(base, '#ffffff', 0.4) : deep)
        gradient.addColorStop(1, 'transparent')
        context.fillStyle = gradient
        context.fillRect(0, 0, canvas.width, canvas.height)
      }
      context.globalAlpha = 1
    }

    // Lane markings, printed on the cloth where each die is meant to land.
    const laneWidth = 2.05 * scale
    const laneDepth = 2.1 * scale
    const family = getComputedStyle(document.documentElement).getPropertyValue('--die-font').trim() || 'sans-serif'

    slots.forEach((slot, index) => {
      const x = toX(slot[0])
      const y = toY(slot[2])
      const left = x - laneWidth / 2
      const top = y - laneDepth / 2
      const text = this.dice[index]?.spec.mark ?? ''

      context.strokeStyle = mark
      context.fillStyle = mark
      context.lineWidth = 2.2

      if (look.marks === 'stitched') {
        context.globalAlpha = 0.34
        context.setLineDash([9, 7])
        context.beginPath()
        context.roundRect(left, top, laneWidth, laneDepth, 16)
        context.stroke()
        context.setLineDash([])
      } else if (look.marks === 'ruled') {
        context.globalAlpha = 0.42
        context.lineWidth = 1.6
        context.beginPath()
        context.roundRect(left, top, laneWidth, laneDepth, 10)
        context.roundRect(left + 7, top + 7, laneWidth - 14, laneDepth - 14, 6)
        context.stroke()
      } else if (look.marks === 'ticks') {
        context.globalAlpha = 0.75
        context.lineWidth = 1.8
        const tick = 20
        context.beginPath()
        for (const [cx, cy, dx, dy] of [
          [left, top, 1, 1],
          [left + laneWidth, top, -1, 1],
          [left, top + laneDepth, 1, -1],
          [left + laneWidth, top + laneDepth, -1, -1],
        ] as const) {
          context.moveTo(cx + dx * tick, cy)
          context.lineTo(cx, cy)
          context.lineTo(cx, cy + dy * tick)
        }
        context.moveTo(x - 7, y)
        context.lineTo(x + 7, y)
        context.moveTo(x, y - 7)
        context.lineTo(x, y + 7)
        context.stroke()
      } else {
        context.globalAlpha = 1
        context.fillStyle = deep
        context.beginPath()
        context.roundRect(left, top, laneWidth, laneDepth, 14)
        context.fill()
        context.fillStyle = mark
      }

      if (text) {
        context.globalAlpha = look.marks === 'ticks' ? 0.8 : 0.5
        context.font = `${look.marks === 'wells' ? 800 : 600} ${Math.round(0.34 * scale)}px ${family}`
        context.textAlign = 'left'
        context.textBaseline = 'alphabetic'
        context.fillText(text, left + 14, top + laneDepth - 14)
      }

      context.globalAlpha = 1
    })

    // The light falls off toward the walls.
    const shade = context.createRadialGradient(canvas.width / 2, canvas.height * 0.45, canvas.height * 0.2, canvas.width / 2, canvas.height * 0.5, canvas.width * 0.62)
    shade.addColorStop(0, 'transparent')
    shade.addColorStop(1, deep)
    context.globalAlpha = 0.85
    context.fillStyle = shade
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.globalAlpha = 1

    this.grain.repeat.set(halfWidth * 2 * 1.4, depth * 1.4)
    this.floorTexture.needsUpdate = true
  }

  /* ---------- Frames ---------- */

  private finishRecording(): void {
    if (!this.recording) {
      return
    }

    this.recording = null

    for (const die of this.dice) {
      die.restAt = 0
      this.placeMesh(die, die.pose.position, die.pose.orientation)
    }
  }

  private run(): void {
    if (this.frame === 0 && !this.disposed) {
      this.frame = requestAnimationFrame(this.tick)
    }
  }

  private draw(): void {
    if (!this.disposed) {
      this.renderer.render(this.scene, this.camera)
    }
  }

  private readonly scratchA = new Quaternion()
  private readonly scratchB = new Quaternion()

  private readonly tick = (now: number): void => {
    this.frame = 0
    let busy = false

    if (this.recording) {
      const result = this.recording
      const elapsed = (now - this.recordingStart) / 1000
      const at = Math.min(result.frameCount - 1, Math.max(0, elapsed / result.step))
      const from = Math.floor(at)
      const to = Math.min(result.frameCount - 1, from + 1)
      const blend = at - from
      const stride = this.dice.length * 7
      let landed = false

      this.dice.forEach((die, index) => {
        const a = from * stride + index * 7
        const b = to * stride + index * 7
        const frames = result.frames

        die.mesh.position.set(
          frames[a]! + (frames[b]! - frames[a]!) * blend,
          frames[a + 1]! + (frames[b + 1]! - frames[a + 1]!) * blend,
          frames[a + 2]! + (frames[b + 2]! - frames[a + 2]!) * blend,
        )
        this.scratchA.set(frames[a + 3]!, frames[a + 4]!, frames[a + 5]!, frames[a + 6]!)
        this.scratchB.set(frames[b + 3]!, frames[b + 4]!, frames[b + 5]!, frames[b + 6]!)
        die.mesh.quaternion.slerpQuaternions(this.scratchA, this.scratchB, blend)

        if (die.restAt > 0 && elapsed >= die.restAt) {
          die.restAt = 0
          landed = true
        }
      })

      if (landed) {
        this.reportAnchors()
      }

      if (elapsed >= result.duration) {
        this.finishRecording()
        this.reportAnchors()
      } else {
        busy = true
      }
    }

    this.dice.forEach((die, index) => {
      const target = index === this.active ? 1 : index === this.hovered ? 0.4 : 0
      die.lit += (target - die.lit) * 0.22

      if (Math.abs(target - die.lit) > 0.01) {
        busy = true
      } else {
        die.lit = target
      }

      if (this.look.die.glow > 0) {
        die.mesh.material.emissiveIntensity = this.look.die.glow * (1 + die.lit * 1.4)
      } else {
        die.mesh.material.emissiveIntensity = die.lit * 0.34
      }

      const hop = die.hopAt > 0 ? (now - die.hopAt) / 1000 / HOP_SECONDS : 1

      if (hop < 1 && !this.recording) {
        const lift = Math.sin(Math.PI * hop) * 0.55 * (1 - hop * 0.35)
        this.placeMesh(die, die.pose.position, die.pose.orientation, lift)
        busy = true
      } else if (die.hopAt > 0 && !this.recording) {
        die.hopAt = 0
        this.placeMesh(die, die.pose.position, die.pose.orientation)
      }
    })

    this.draw()

    if (busy) {
      this.run()
    }
  }

  /* ---------- Captions and pointer ---------- */

  private readonly projected = new Vector3()

  private reportAnchors(): void {
    this.events.onAnchors(
      this.dice.map((die) => {
        if (die.restAt > 0) {
          return null
        }

        this.projected.set(die.pose.position[0], 0, die.pose.position[2] + die.polyhedron.reach * 1.02).project(this.camera)
        return { x: ((this.projected.x + 1) / 2) * this.width, y: ((1 - this.projected.y) / 2) * this.height }
      }),
    )
  }

  private readonly pointer = new Vector2()

  private pick(event: MouseEvent): number {
    const bounds = this.canvas.getBoundingClientRect()
    this.pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const [hit] = this.raycaster.intersectObjects(this.dice.map((die) => die.mesh), false)
    return hit ? this.dice.indexOf(hit.object.userData.die as Die) : -1
  }

  private readonly handleMove = (event: PointerEvent): void => {
    const index = this.recording ? -1 : this.pick(event)

    if (index !== this.hovered) {
      this.hovered = index
      this.canvas.style.cursor = index >= 0 ? 'pointer' : ''
      this.run()
    }
  }

  private readonly handleLeave = (): void => {
    if (this.hovered !== -1) {
      this.hovered = -1
      this.canvas.style.cursor = ''
      this.run()
    }
  }

  /** A phone can take the GPU away from a background tab. Ask for it back, then redraw everything. */
  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault()
  }

  private readonly handleContextRestored = (): void => {
    this.refresh()
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const index = this.pick(event)

    if (index >= 0) {
      this.hop(index)
      this.events.onPress(index)
    }
  }
}

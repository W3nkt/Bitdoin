// 3D scene for the Top Corner Lab (src/pages/academy/TopCornerLab.tsx).
// Every axis runs 0–100; the "top" is the corner where every drawn axis is 100.
// The first three axes that are switched on are drawn as x (right), y (up) and
// z (back); the page owns the data and calls setModel(), the scene animates it.
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export const TOP = 100

export interface LabAxis { id: number; name: string; color: string; on: boolean }
export interface LabPoint {
  id: number
  name: string
  color: string
  vals: Record<number, number>
  /** A point made with "Add point" flies in from the origin corner; others appear in place. */
  enterFromOrigin?: boolean
}

export interface LabModel {
  axes: LabAxis[]
  points: LabPoint[]
  activeId: number | null
  shell: boolean
  spin: boolean
}

/** What the pointer is over, for the page's readout. */
export type LabHover =
  | { kind: 'point'; pointId: number }
  | { kind: 'add'; vals: number[] }

export interface LabCallbacks {
  onSelectPoint: (pointId: number) => void
  /** vals holds one value per drawn axis, in drawn order. */
  onAddPoint: (vals: number[]) => void
  onHover: (hover: LabHover | null) => void
}

export const includedAxes = (axes: LabAxis[]) => axes.filter(axis => axis.on)
export const drawnAxes = (axes: LabAxis[]) => includedAxes(axes).slice(0, 3)
export const axisValue = (point: LabPoint, axis: LabAxis) => point.vals[axis.id] ?? 0

/** Straight-line distance from a point to the top corner, over the given axes. */
export function gapToTop(point: LabPoint, axes: LabAxis[]) {
  let sum = 0
  for (const axis of axes) {
    const d = TOP - axisValue(point, axis)
    sum += d * d
  }
  return Math.sqrt(sum)
}

/** 100% at the top corner, 0% at the origin corner. */
export function reachPercent(point: LabPoint, axes: LabAxis[]) {
  return axes.length ? 100 * (1 - gapToTop(point, axes) / (TOP * Math.sqrt(axes.length))) : 0
}

const ORIGIN = new THREE.Vector3(-5, 0, 0)
const DIRS = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1)]
const UP = new THREE.Vector3(0, 1, 0)
const LABEL_FONT = 'ui-monospace, Menlo, Consolas, "Noto Sans Lao", monospace'

const SHELL_VERT = `varying vec3 vW; varying vec3 vN; varying vec3 vV;
void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vV = -mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }`
const SHELL_FRAG = `uniform vec3 uColor; uniform vec3 uMin; uniform vec3 uMax; uniform vec3 uTop; uniform float uOpacity;
varying vec3 vW; varying vec3 vN; varying vec3 vV;
void main(){
  if (any(lessThan(vW, uMin - 1e-3)) || any(greaterThan(vW, uMax + 1e-3))) discard;
  float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
  float k = uTop.y - vW.y;
  float c = abs(fract(k - 0.5) - 0.5) / max(fwidth(k), 1e-4);
  float ring = 1.0 - min(c, 1.0);
  float a = (0.10 + 0.55 * pow(f, 2.0) + ring * 0.22) * uOpacity;
  gl_FragColor = vec4(uColor * (1.0 + ring * 0.4), a);
}`

interface PointViz {
  group: THREE.Group
  core: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>
  hit: THREE.Mesh
  glow: THREE.Sprite
  label: THREE.Sprite
  vec: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>
  /** Animated copy of the point's values, eased towards the real ones. */
  shown: Record<number, number>
}

export class TopCornerScene {
  private readonly container: HTMLElement
  private readonly callbacks: LabCallbacks
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 600)
  private readonly controls: OrbitControls
  private readonly clock = new THREE.Clock()
  private readonly reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  private readonly disposables: Array<{ dispose: () => void }> = []
  private readonly labelCache = new Map<string, { tex: THREE.CanvasTexture; aspect: number }>()
  private readonly resizeObserver: ResizeObserver
  private model: LabModel = { axes: [], points: [], activeId: null, shell: true, spin: false }
  /** dim.y / dim.z ease between 0 and 1 so the line grows into a square and the square into a cube. */
  private readonly dim = { y: 1, z: 1 }
  private frameId = 0
  private booted = false
  private lastDrawn = -1
  private shellR = 0
  private hover = false
  private downAt: [number, number] | null = null
  private lastHoverKey = ''
  private readonly ndc = new THREE.Vector2()
  private readonly raycaster = new THREE.Raycaster()
  private readonly tmpV = new THREE.Vector3()
  private readonly tmpTop = new THREE.Vector3()
  private readonly fly = { active: false, dir: new THREE.Vector3(), target: new THREE.Vector3(), R: 9 }

  private readonly frame: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>
  private readonly grids: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>
  private readonly axisMeshes: Array<THREE.Group & { userData: { shaft: THREE.Mesh; head: THREE.Mesh; mat: THREE.MeshBasicMaterial } }>
  private readonly tickGroups: THREE.Group[]
  private readonly axisTitles: THREE.Sprite[]
  private readonly topGroup = new THREE.Group()
  private readonly topLabel: THREE.Sprite
  private readonly shell: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>
  private readonly arc: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>
  private readonly lineTarget: THREE.Mesh
  private readonly planeTarget: THREE.Mesh
  private readonly pointViz = new Map<number, PointViz>()
  private readonly guides: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>
  private readonly gapLine: THREE.Line<THREE.BufferGeometry, THREE.LineDashedMaterial>
  private readonly marker: THREE.Mesh
  private readonly dotTex: THREE.CanvasTexture
  private topLabelText: string

  constructor(container: HTMLElement, callbacks: LabCallbacks, topLabelText: string) {
    this.container = container
    this.callbacks = callbacks
    this.topLabelText = topLabelText

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setClearColor(0x000000, 0)
    const canvas = this.renderer.domElement
    canvas.style.display = 'block'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.touchAction = 'none'
    container.prepend(canvas)

    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.autoRotateSpeed = 0.8
    this.controls.maxDistance = 140
    this.controls.minDistance = 3

    this.dotTex = this.makeDotTexture()
    this.frame = this.dynLines(0x34426a, 0.9, 12)
    this.grids = this.dynLines(0x1c2742, 1, 80)

    this.axisMeshes = [0, 1, 2].map(() => {
      const group = new THREE.Group()
      const mat = this.track(new THREE.MeshBasicMaterial({ color: 0xffffff }))
      const shaft = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.035, 0.035, 1, 10)), mat)
      const head = new THREE.Mesh(this.track(new THREE.ConeGeometry(0.12, 0.38, 16)), mat)
      group.add(shaft, head)
      group.userData = { shaft, head, mat }
      this.scene.add(group)
      return group as THREE.Group & { userData: { shaft: THREE.Mesh; head: THREE.Mesh; mat: THREE.MeshBasicMaterial } }
    })
    this.tickGroups = [0, 1, 2].map(() => {
      const group = new THREE.Group()
      this.scene.add(group)
      return group
    })
    this.axisTitles = [0, 1, 2].map(() => {
      const sprite = this.makeLabel(' ', '#e6ebf6', 0.38, 500)
      this.scene.add(sprite)
      return sprite
    })
    this.rebuildTicks()

    const topCore = new THREE.Mesh(this.track(new THREE.OctahedronGeometry(0.22)), this.track(new THREE.MeshBasicMaterial({ color: 0xffd27a })))
    const topGlow = new THREE.Sprite(this.track(new THREE.SpriteMaterial({ map: this.dotTex, color: 0xffd27a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })))
    topGlow.scale.set(1.8, 1.8, 1)
    this.topLabel = this.makeLabel(topLabelText, '#ffd27a', 0.34, 500)
    this.topLabel.position.set(0, 0.6, 0)
    this.topGroup.add(topGlow, topCore, this.topLabel)
    this.scene.add(this.topGroup)

    // Equal-reach surface: the shell (3D) or arc (2D) of positions as far from the top as the active point.
    this.shell = new THREE.Mesh(this.track(new THREE.SphereGeometry(1, 96, 64)), this.track(new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color() }, uMin: { value: new THREE.Vector3() }, uMax: { value: new THREE.Vector3() },
        uTop: { value: new THREE.Vector3() }, uOpacity: { value: 1 },
      },
      vertexShader: SHELL_VERT, fragmentShader: SHELL_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    })))
    this.scene.add(this.shell)
    this.arc = this.dynLines(0xffffff, 0.8, 400)

    // Invisible click targets for 1D and 2D.
    this.lineTarget = new THREE.Mesh(this.track(new THREE.BoxGeometry(10, 0.7, 0.7)), this.track(new THREE.MeshBasicMaterial()))
    this.lineTarget.visible = false
    this.scene.add(this.lineTarget)
    this.planeTarget = new THREE.Mesh(this.track(new THREE.PlaneGeometry(10, 10)), this.track(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })))
    this.planeTarget.position.set(0, 5, 0)
    this.planeTarget.visible = false
    this.scene.add(this.planeTarget)

    this.guides = this.dynLines(0xe6ebf6, 0.35, 8)
    const gapGeo = this.track(new THREE.BufferGeometry())
    gapGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    this.gapLine = new THREE.Line(gapGeo, this.track(new THREE.LineDashedMaterial({ color: 0xffd27a, dashSize: 0.22, gapSize: 0.14, transparent: true, opacity: 0.9 })))
    this.gapLine.frustumCulled = false
    this.scene.add(this.gapLine)

    this.marker = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.12, 16, 12)), this.track(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })))
    this.marker.visible = false
    this.scene.add(this.marker)

    canvas.addEventListener('pointermove', this.handlePointerMove)
    canvas.addEventListener('pointerleave', this.handlePointerLeave)
    canvas.addEventListener('pointerdown', this.handlePointerDown)
    canvas.addEventListener('pointerup', this.handlePointerUp)
    this.resizeObserver = new ResizeObserver(this.resize)
    this.resizeObserver.observe(container)

    // Canvas labels are drawn with the label font; redraw once it has loaded.
    document.fonts?.ready.then(() => {
      if (!this.frameId) return
      this.labelCache.forEach(entry => entry.tex.dispose())
      this.labelCache.clear()
      this.scene.traverse(object => { if (object instanceof THREE.Sprite && object.userData.key) object.userData.key = '' })
      this.rebuildTicks()
      this.setLabel(this.topLabel, this.topLabelText, '#ffd27a', 500)
      for (const point of this.model.points) {
        const viz = this.pointViz.get(point.id)
        if (viz) this.setLabel(viz.label, point.name, point.color, 500)
      }
    })

    this.frameId = requestAnimationFrame(this.tick)
  }

  /** Replaces the data the scene draws. Values animate from what is on screen now. */
  setModel(next: LabModel) {
    const firstModel = !this.booted && this.lastDrawn === -1
    this.model = next
    this.syncPointViz()
    this.controls.autoRotate = next.spin && !this.fly.active
    const drawnCount = drawnAxes(next.axes).length
    if (firstModel) {
      // Start already in the right shape, viewed from far away, then fly in.
      this.dim.y = drawnCount >= 2 ? 1 : 0
      this.dim.z = drawnCount >= 3 ? 1 : 0
      const goal = this.camGoal()
      this.controls.target.set(...goal.target)
      this.camera.position.copy(this.controls.target).addScaledVector(new THREE.Vector3(...goal.dir).normalize(), 45)
    }
    if (drawnCount !== this.lastDrawn) {
      this.lastDrawn = drawnCount
      if (this.booted) this.flyTo()
    }
  }

  /** Text of the label on the top corner (it follows the page language). */
  setTopLabel(text: string) {
    this.topLabelText = text
    this.setLabel(this.topLabel, text, '#ffd27a', 500)
  }

  /** Flies the camera back to the default view for the current number of drawn axes. */
  resetView() {
    this.flyTo()
  }

  dispose() {
    cancelAnimationFrame(this.frameId)
    this.frameId = 0
    this.resizeObserver.disconnect()
    const canvas = this.renderer.domElement
    canvas.removeEventListener('pointermove', this.handlePointerMove)
    canvas.removeEventListener('pointerleave', this.handlePointerLeave)
    canvas.removeEventListener('pointerdown', this.handlePointerDown)
    canvas.removeEventListener('pointerup', this.handlePointerUp)
    this.controls.dispose()
    for (const viz of this.pointViz.values()) this.disposePointViz(viz)
    this.pointViz.clear()
    this.tickGroups.forEach(group => this.clearLabels(group))
    this.axisTitles.forEach(sprite => sprite.material.dispose())
    this.topLabel.material.dispose()
    this.labelCache.forEach(entry => entry.tex.dispose())
    this.labelCache.clear()
    this.disposables.forEach(item => item.dispose())
    this.renderer.dispose()
    canvas.remove()
  }

  /* ---------- helpers ---------- */

  private track<T extends { dispose: () => void }>(item: T): T {
    this.disposables.push(item)
    return item
  }

  private makeDotTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.45)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    return this.track(new THREE.CanvasTexture(canvas))
  }

  private labelTexture(text: string, color: string, weight: number) {
    const key = text + color + weight
    const cached = this.labelCache.get(key)
    if (cached) return cached
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const font = `${weight} 40px ${LABEL_FONT}`
    ctx.font = font
    const width = Math.ceil(ctx.measureText(text).width) + 16
    canvas.width = width
    canvas.height = 56
    ctx.font = font
    ctx.fillStyle = color
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.fillText(text, width / 2, 29)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    const entry = { tex, aspect: width / 56 }
    this.labelCache.set(key, entry)
    return entry
  }

  private makeLabel(text: string, color = '#8995b0', size = 0.3, weight = 400) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }))
    sprite.userData.size = size
    this.setLabel(sprite, text, color, weight)
    return sprite
  }

  private setLabel(sprite: THREE.Sprite, text: string, color = '#8995b0', weight = 400) {
    const key = text + color + weight
    if (sprite.userData.key === key) return
    sprite.userData.key = key
    const { tex, aspect } = this.labelTexture(text, color, weight)
    sprite.material.map = tex
    sprite.material.needsUpdate = true
    sprite.scale.set(sprite.userData.size * aspect, sprite.userData.size, 1)
  }

  private clearLabels(group: THREE.Group) {
    for (const child of group.children) if (child instanceof THREE.Sprite) child.material.dispose()
    group.clear()
  }

  private dynLines(color: number, opacity: number, maxSegs: number) {
    const geo = this.track(new THREE.BufferGeometry())
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxSegs * 6), 3))
    const lines = new THREE.LineSegments(geo, this.track(new THREE.LineBasicMaterial({ color, transparent: true, opacity })))
    lines.frustumCulled = false
    this.scene.add(lines)
    return lines
  }

  private setSegs(lines: THREE.LineSegments<THREE.BufferGeometry>, segs: number[]) {
    const attribute = lines.geometry.attributes.position as THREE.BufferAttribute
    const arr = attribute.array as Float32Array
    const n = Math.min(segs.length, arr.length)
    for (let i = 0; i < n; i++) arr[i] = segs[i]
    lines.geometry.setDrawRange(0, n / 3)
    attribute.needsUpdate = true
  }

  private toWorld(v0: number, v1: number, v2: number, out = new THREE.Vector3()) {
    return out.set(-5 + v0 / 10, (v1 / 10) * this.dim.y, (-v2 / 10) * this.dim.z)
  }

  private fromWorld(p: THREE.Vector3) {
    return [(p.x + 5) * 10, this.dim.y > 0.5 ? (p.y / this.dim.y) * 10 : 0, this.dim.z > 0.5 ? (-p.z / this.dim.z) * 10 : 0]
  }

  private activePoint() {
    return this.model.points.find(point => point.id === this.model.activeId) ?? this.model.points[0] ?? null
  }

  /* ---------- scene parts ---------- */

  private rebuildTicks() {
    this.tickGroups.forEach(group => this.clearLabels(group))
    for (let v = 0; v <= 100; v += 20) {
      this.tickGroups.forEach(group => {
        const label = this.makeLabel(String(v))
        label.userData.v = v
        group.add(label)
      })
    }
  }

  private updateFrame() {
    const { dim } = this
    const X0 = -5, X1 = 5, Y = 10 * dim.y, Z = -10 * dim.z
    const c = [[X0, 0, 0], [X1, 0, 0], [X1, Y, 0], [X0, Y, 0], [X0, 0, Z], [X1, 0, Z], [X1, Y, Z], [X0, Y, Z]]
    const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
    this.setSegs(this.frame, edges.flatMap(([a, b]) => [...c[a], ...c[b]]))
    const g: number[] = []
    for (let i = 1; i < 10; i++) {
      const x = -5 + i, y = i * dim.y, z = -i * dim.z
      if (dim.y > 0.02) g.push(x, 0, Z, x, Y, Z, X0, y, Z, X1, y, Z) // back wall
      if (dim.z > 0.02) g.push(x, 0, 0, x, 0, Z, X0, 0, z, X1, 0, z) // floor
    }
    this.setSegs(this.grids, g)
  }

  private updateAxes() {
    const axes = drawnAxes(this.model.axes)
    this.axisMeshes.forEach((group, i) => {
      const len = 10 * (i === 0 ? 1 : i === 1 ? this.dim.y : this.dim.z) + 0.5
      group.visible = Boolean(axes[i]) && len > 0.6
      if (!group.visible) return
      group.userData.mat.color.set(axes[i].color)
      group.position.copy(ORIGIN)
      group.quaternion.setFromUnitVectors(UP, DIRS[i])
      group.userData.shaft.scale.y = len
      group.userData.shaft.position.y = len / 2
      group.userData.head.position.y = len + 0.15
    })
  }

  private updateTicks() {
    const axes = drawnAxes(this.model.axes)
    const { dim } = this
    this.tickGroups[0].children.forEach(label => label.position.set(-5 + label.userData.v / 10, -0.42, 0.25))
    this.tickGroups[1].children.forEach(label => label.position.set(-5.55, (label.userData.v / 10) * dim.y, 0))
    this.tickGroups[2].children.forEach(label => label.position.set(-5.5, -0.35, (-label.userData.v / 10) * dim.z))
    this.tickGroups[0].visible = Boolean(axes[0])
    this.tickGroups[1].visible = Boolean(axes[1]) && dim.y > 0.6
    this.tickGroups[2].visible = Boolean(axes[2]) && dim.z > 0.6
    this.axisTitles.forEach((title, i) => {
      title.visible = Boolean(axes[i]) && (i === 0 || (i === 1 ? dim.y : dim.z) > 0.6)
      if (axes[i]) this.setLabel(title, axes[i].name, axes[i].color, 500)
    })
    this.axisTitles[0].position.set(5.9, 0.05, 0)
    this.axisTitles[1].position.set(-5, 10 * dim.y + 0.75, 0)
    this.axisTitles[2].position.set(-5, 0.1, -10 * dim.z - 0.85)
  }

  private disposePointViz(viz: PointViz) {
    this.scene.remove(viz.group, viz.vec)
    viz.core.geometry.dispose()
    viz.core.material.dispose()
    ;(viz.hit.geometry as THREE.BufferGeometry).dispose()
    ;(viz.hit.material as THREE.Material).dispose()
    viz.glow.material.dispose()
    viz.label.material.dispose()
    viz.vec.geometry.dispose()
    viz.vec.material.dispose()
  }

  private syncPointViz() {
    const ids = new Set(this.model.points.map(point => point.id))
    for (const [id, viz] of this.pointViz) {
      if (!ids.has(id)) {
        this.disposePointViz(viz)
        this.pointViz.delete(id)
      }
    }
    for (const point of this.model.points) {
      let viz = this.pointViz.get(point.id)
      if (!viz) {
        const group = new THREE.Group()
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), new THREE.MeshBasicMaterial())
        const hit = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), new THREE.MeshBasicMaterial())
        hit.visible = false
        hit.userData.pointId = point.id
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
        const label = this.makeLabel(point.name, point.color, 0.32, 500)
        label.position.set(0.34, 0.38, 0)
        const vecGeo = new THREE.BufferGeometry()
        vecGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
        const vec = new THREE.Line(vecGeo, new THREE.LineBasicMaterial({ transparent: true }))
        vec.frustumCulled = false
        group.add(core, hit, glow, label)
        this.scene.add(group, vec)
        viz = { group, core, hit, glow, label, vec, shown: point.enterFromOrigin ? {} : { ...point.vals } }
        this.pointViz.set(point.id, viz)
      }
      viz.core.material.color.set(point.color)
      viz.glow.material.color.set(point.color)
      viz.vec.material.color.set(point.color)
      this.setLabel(viz.label, point.name, point.color, 500)
    }
  }

  private updatePoints() {
    const axes = drawnAxes(this.model.axes)
    const active = this.activePoint()
    for (const point of this.model.points) {
      const viz = this.pointViz.get(point.id)
      if (!viz) continue
      const shownValue = (i: number) => (axes[i] ? viz.shown[axes[i].id] ?? 0 : 0)
      const P = this.toWorld(shownValue(0), shownValue(1), shownValue(2), viz.group.position)
      const isActive = active?.id === point.id
      viz.glow.scale.setScalar(isActive ? 1.5 : 0.9)
      viz.glow.material.opacity = isActive ? 0.9 : 0.55
      const vecPos = viz.vec.geometry.attributes.position as THREE.BufferAttribute
      ;(vecPos.array as Float32Array).set([ORIGIN.x, ORIGIN.y, ORIGIN.z, P.x, P.y, P.z])
      vecPos.needsUpdate = true
      viz.vec.material.opacity = isActive ? 0.85 : 0.3
    }
    this.toWorld(axes[0] ? 100 : 0, axes[1] ? 100 : 0, axes[2] ? 100 : 0, this.tmpTop)
    this.topGroup.position.copy(this.tmpTop)
    this.topGroup.visible = axes.length > 0

    // Projection guides and the dashed gap line for the active point.
    const activeViz = active ? this.pointViz.get(active.id) : undefined
    if (active && activeViz && axes.length) {
      const P = this.tmpV.copy(activeViz.group.position)
      const segs: number[] = []
      if (this.dim.y > 0.02) segs.push(P.x, P.y, P.z, P.x, 0, P.z, P.x, P.y, P.z, -5, P.y, P.z)
      if (this.dim.z > 0.02) segs.push(P.x, 0, P.z, P.x, 0, 0, P.x, 0, P.z, -5, 0, P.z)
      this.setSegs(this.guides, segs)
      this.guides.visible = segs.length > 0
      const gapPos = this.gapLine.geometry.attributes.position as THREE.BufferAttribute
      ;(gapPos.array as Float32Array).set([P.x, P.y, P.z, this.tmpTop.x, this.tmpTop.y, this.tmpTop.z])
      gapPos.needsUpdate = true
      this.gapLine.computeLineDistances()
      this.gapLine.visible = P.distanceTo(this.tmpTop) > 0.05
    } else {
      this.guides.visible = false
      this.gapLine.visible = false
    }
  }

  private updateShell(k: number) {
    const active = this.activePoint()
    const axes = drawnAxes(this.model.axes)
    const targetR = active && axes.length ? gapToTop(active, axes) / 10 : 0
    this.shellR += (targetR - this.shellR) * k
    const show = this.model.shell && Boolean(active) && axes.length >= 2
    this.shell.visible = show && axes.length === 3 && this.dim.z > 0.15 && this.shellR > 0.02
    if (this.shell.visible && active) {
      this.shell.position.copy(this.tmpTop)
      this.shell.scale.setScalar(this.shellR)
      const u = this.shell.material.uniforms
      u.uColor.value.set(active.color)
      u.uMin.value.set(-5, 0, -10 * this.dim.z)
      u.uMax.value.set(5, 10 * this.dim.y, 0)
      u.uTop.value.copy(this.tmpTop)
      u.uOpacity.value = Math.min(1, this.dim.z * 1.2)
    }
    this.arc.visible = show && axes.length === 2 && this.shellR > 0.02
    if (this.arc.visible && active) {
      this.arc.material.color.set(active.color)
      const segs: number[] = []
      const n = 360
      const top = this.tmpTop, r = this.shellR, maxY = 10 * this.dim.y
      const inside = (x: number, y: number) => x >= -5.001 && x <= 5.001 && y >= -0.001 && y <= maxY + 0.001
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2
        const x0 = top.x + r * Math.cos(a0), y0 = top.y + r * Math.sin(a0)
        const x1 = top.x + r * Math.cos(a1), y1 = top.y + r * Math.sin(a1)
        if (inside(x0, y0) && inside(x1, y1)) segs.push(x0, y0, 0.01, x1, y1, 0.01)
      }
      this.setSegs(this.arc, segs)
    }
  }

  /* ---------- camera ---------- */

  private camGoal(): { dir: [number, number, number]; target: [number, number, number]; R: number } {
    const n = drawnAxes(this.model.axes).length
    if (n <= 1) return { dir: [0, 0.18, 1], target: [0, 0.4, 0], R: 6.3 }
    if (n === 2) return { dir: [0, 0, 1], target: [0, 5, 0], R: 7.0 }
    return { dir: [0.9, 0.62, 1], target: [0, 4.6, -5], R: 10.2 }
  }

  private fitDistance(fov: number, R: number) {
    const v = THREE.MathUtils.degToRad(fov)
    const h = 2 * Math.atan(Math.tan(v / 2) * this.camera.aspect)
    return R / Math.sin(Math.min(v, h) / 2)
  }

  private flyTo() {
    const goal = this.camGoal()
    this.fly.dir.set(...goal.dir).normalize()
    this.fly.target.set(...goal.target)
    this.fly.R = goal.R
    this.fly.active = true
    this.controls.enabled = false
    this.controls.autoRotate = false
  }

  private stepFly(k: number) {
    if (!this.fly.active) return
    const { camera, controls, fly } = this
    const dir = camera.position.clone().sub(controls.target).normalize()
    dir.lerp(fly.dir, k).normalize()
    controls.target.lerp(fly.target, k)
    const curD = camera.position.distanceTo(controls.target)
    const goalD = this.fitDistance(camera.fov, fly.R)
    camera.position.copy(controls.target).addScaledVector(dir, curD + (goalD - curD) * k)
    camera.lookAt(controls.target)
    if (dir.distanceTo(fly.dir) < 2e-3 && controls.target.distanceTo(fly.target) < 2e-3 && Math.abs(curD - goalD) < 0.02) {
      fly.active = false
      controls.enabled = true
      controls.autoRotate = this.model.spin
    }
  }

  private readonly resize = () => {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    if (!width || !height) return
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / Math.max(height, 1)
    this.camera.updateProjectionMatrix()
    if (!this.booted) {
      this.booted = true
      this.flyTo()
    }
  }

  /* ---------- picking ---------- */

  private setNdc(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
  }

  private readonly handlePointerMove = (event: PointerEvent) => {
    this.setNdc(event)
    this.hover = true
  }

  private readonly handlePointerLeave = () => {
    this.hover = false
  }

  private readonly handlePointerDown = (event: PointerEvent) => {
    this.downAt = [event.clientX, event.clientY]
  }

  private readonly handlePointerUp = (event: PointerEvent) => {
    const moved = !this.downAt || Math.hypot(event.clientX - this.downAt[0], event.clientY - this.downAt[1]) > 5
    this.downAt = null
    if (moved) return // a drag orbits the camera; only a still click picks
    this.setNdc(event)
    const hit = this.pick()
    if (!hit) return
    if ('pointId' in hit) this.callbacks.onSelectPoint(hit.pointId)
    else this.callbacks.onAddPoint(hit.vals.map(v => Math.round(Math.min(100, Math.max(0, v)) * 10) / 10))
  }

  private pick(): { pointId: number } | { vals: number[]; point: THREE.Vector3 } | null {
    if (this.fly.active) return null
    this.raycaster.setFromCamera(this.ndc, this.camera)
    const pointHit = this.raycaster.intersectObjects([...this.pointViz.values()].map(viz => viz.hit), false)[0]
    if (pointHit) return { pointId: pointHit.object.userData.pointId as number }
    const d = drawnAxes(this.model.axes).length
    const target = d === 1 ? this.lineTarget : d === 2 ? this.planeTarget : d === 3 && this.shell.visible ? this.shell : null
    if (!target) return null
    target.updateMatrixWorld()
    const { dim } = this
    const inBox = (p: THREE.Vector3) => p.x >= -5.01 && p.x <= 5.01
      && (d === 1 || (p.y >= -0.01 && p.y <= 10 * dim.y + 0.01))
      && (d < 3 || (p.z <= 0.01 && p.z >= -10 * dim.z - 0.01))
    const hit = this.raycaster.intersectObject(target, false).find(h => inBox(h.point))
    if (!hit) return null
    const vals = this.fromWorld(hit.point)
    if (d === 1) { vals[1] = 0; vals[2] = 0 }
    if (d === 2) vals[2] = 0
    const point = d === 1 ? hit.point.clone().setY(0).setZ(0) : d === 2 ? hit.point.clone().setZ(0) : hit.point
    return { vals: vals.slice(0, d), point }
  }

  private updateHover() {
    const canvas = this.renderer.domElement
    this.marker.visible = false
    let hover: LabHover | null = null
    if (this.hover) {
      const hit = this.pick()
      if (hit && 'pointId' in hit) hover = { kind: 'point', pointId: hit.pointId }
      else if (hit) {
        this.marker.position.copy(hit.point)
        this.marker.visible = true
        hover = { kind: 'add', vals: hit.vals.map(v => Math.round(v * 10) / 10) }
      }
    }
    canvas.style.cursor = hover?.kind === 'point' ? 'pointer' : hover?.kind === 'add' ? 'crosshair' : ''
    // Only tell the page when the readout would actually change.
    const key = JSON.stringify(hover)
    if (key !== this.lastHoverKey) {
      this.lastHoverKey = key
      this.callbacks.onHover(hover)
    }
  }

  /* ---------- loop ---------- */

  private readonly tick = () => {
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const k = this.reduceMotion ? 1 : 1 - Math.exp(-dt * 8)
    const n = drawnAxes(this.model.axes).length
    const { dim } = this
    dim.y += ((n >= 2 ? 1 : 0) - dim.y) * k
    dim.z += ((n >= 3 ? 1 : 0) - dim.z) * k
    if (Math.abs(dim.y - Math.round(dim.y)) < 1e-4) dim.y = Math.round(dim.y)
    if (Math.abs(dim.z - Math.round(dim.z)) < 1e-4) dim.z = Math.round(dim.z)
    for (const point of this.model.points) {
      const viz = this.pointViz.get(point.id)
      if (!viz) continue
      for (const key of Object.keys(point.vals)) {
        const id = Number(key)
        const current = viz.shown[id] ?? 0
        const diff = point.vals[id] - current
        viz.shown[id] = Math.abs(diff) < 1e-3 ? point.vals[id] : current + diff * k
      }
    }
    this.updateFrame()
    this.updateAxes()
    this.updateTicks()
    this.updatePoints()
    this.updateShell(k)
    this.stepFly(this.reduceMotion ? 1 : 1 - Math.exp(-dt * 5))
    if (!this.fly.active) this.controls.update()
    this.updateHover()
    this.renderer.render(this.scene, this.camera)
    this.frameId = requestAnimationFrame(this.tick)
  }
}

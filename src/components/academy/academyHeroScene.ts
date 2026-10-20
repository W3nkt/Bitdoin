// 3D hero for the Academy landing (src/pages/academy/AcademyLanding.tsx): a graduation cap that
// turns towards the pointer, ringed by one glowing orb per learning path. The page owns which
// path is selected and calls setSelected(); the ring then rotates that orb to the front.
// Clicking an orb reports back through onSelect. Orb labels are plain DOM elements moved
// every frame, so they stay crisp and Lao text needs no canvas font.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

export interface HeroOrb { color: string; label: string }

const RING_R = 3.2
const RING_TILT = 0.55
const AMBER = 0xffc247
const ORANGE = 0xe2650f
const NAVY = 0x1f3a70
const FRONT = Math.PI / 2
const LABEL_CLASS = 'absolute left-0 top-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold leading-none backdrop-blur will-change-transform'

interface OrbViz {
  /** The orb's colour with 53% alpha, for its label border. */
  border: string
  core: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>
  glow: THREE.Sprite
  hit: THREE.Mesh
  beam: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>
  label: HTMLSpanElement
  /** Eased 0..1 emphasis (1 = selected). */
  focus: number
  hover: number
}

export class AcademyHeroScene {
  private readonly container: HTMLElement
  private readonly onSelect: (index: number) => void
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  private readonly reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  private readonly disposables: Array<{ dispose: () => void }> = []
  private readonly resizeObserver: ResizeObserver
  private readonly labelLayer = document.createElement('div')
  private readonly rig = new THREE.Group()
  private readonly pivot = new THREE.Group()
  private readonly cap = new THREE.Group()
  private readonly tassel = new THREE.Group()
  private readonly dust = new THREE.Group()
  private readonly pulse: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>
  // Materials whose blending and colour depend on the page theme (see applyTheme).
  private readonly ringMats: Array<{ mat: THREE.MeshBasicMaterial; opacity: number }> = []
  private poolMat!: THREE.MeshBasicMaterial
  private readonly dustMats: Array<{ mat: THREE.PointsMaterial; dark: number; light: number }> = []
  private readonly orbs: OrbViz[] = []
  private readonly raycaster = new THREE.Raycaster()
  private readonly ndc = new THREE.Vector2()
  private readonly tmp = new THREE.Vector3()
  private readonly pointer = { x: 0, y: 0, at: 0 }
  private readonly look = { x: 0, y: 0 }
  private readonly dotTex: THREE.CanvasTexture
  private frameId = 0
  private lastTime = 0
  private active = true
  private selected = -1
  private hoverIndex = -1
  private spin = 0
  private t = 0
  private inset = 0
  private downAt: [number, number] | null = null
  private overCanvas = false
  private dark: boolean

  constructor(container: HTMLElement, orbs: HeroOrb[], onSelect: (index: number) => void, dark: boolean) {
    this.container = container
    this.onSelect = onSelect
    this.dark = dark

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    // Phones get a lower cap: the scene is small there and the extra pixels only cost battery.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 1.75))
    this.renderer.setClearColor(0x000000, 0)
    // Neutral keeps the orb colours saturated, where ACES would wash them towards white.
    this.renderer.toneMapping = THREE.NeutralToneMapping
    this.renderer.toneMappingExposure = 1
    const canvas = this.renderer.domElement
    canvas.style.display = 'block'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    // The page keeps scrolling vertically when a finger starts on the scene.
    canvas.style.touchAction = 'pan-y'
    container.prepend(canvas)

    this.labelLayer.setAttribute('aria-hidden', 'true')
    this.labelLayer.className = 'pointer-events-none absolute inset-0 overflow-hidden'
    container.append(this.labelLayer)

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    const room = new RoomEnvironment()
    const envMap = pmrem.fromScene(room, 0.04).texture
    this.scene.environment = envMap
    this.scene.environmentIntensity = 0.55
    this.disposables.push(envMap, pmrem)
    room.dispose()

    this.scene.add(new THREE.HemisphereLight(0x9bb8ff, 0x1a1030, 0.5))
    const key = new THREE.DirectionalLight(0xfff1d9, 2.4)
    key.position.set(4, 7, 6)
    const rim = new THREE.DirectionalLight(0x6f9bff, 1.8)
    rim.position.set(-6, 2, -4)
    const warm = new THREE.PointLight(0xffa83a, 60, 14, 2)
    warm.position.set(0, -1.6, 2.4)
    this.scene.add(key, rim, warm)

    this.dotTex = this.track(this.makeDotTexture())
    this.camera.position.set(0, 2.2, 14)
    this.scene.add(this.rig, this.cap, this.dust)
    this.rig.rotation.set(RING_TILT, 0, -0.1)
    this.rig.add(this.pivot)

    this.buildRing()
    this.buildCap()
    this.buildOrbs(orbs)
    this.buildDust()

    // A ring that expands from the cap every few seconds, like a scanner.
    this.pulse = new THREE.Mesh(
      this.track(new THREE.RingGeometry(0.97, 1, 128)),
      this.track(new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })),
    )
    this.pulse.rotation.x = -Math.PI / 2
    this.pulse.position.y = -1.5
    this.rig.add(this.pulse)
    this.applyTheme()

    window.addEventListener('pointermove', this.handleWindowMove, { passive: true })
    canvas.addEventListener('pointermove', this.handleCanvasMove)
    canvas.addEventListener('pointerleave', this.handleCanvasLeave)
    canvas.addEventListener('pointerdown', this.handlePointerDown)
    canvas.addEventListener('pointerup', this.handlePointerUp)
    this.resizeObserver = new ResizeObserver(this.resize)
    this.resizeObserver.observe(container)
    this.resize()

    if (this.reduceMotion) this.renderFrame(0)
    else {
      this.lastTime = performance.now()
      this.frameId = requestAnimationFrame(this.tick)
    }
  }

  /** The path whose orb is rotated to the front and lit; -1 for none. */
  setSelected(index: number) {
    this.selected = index
    this.requestStill()
  }

  /** Follows the page's light/dark mode. */
  setDark(dark: boolean) {
    if (this.dark === dark) return
    this.dark = dark
    this.applyTheme()
    this.requestStill()
  }

  setLabels(labels: string[]) {
    this.orbs.forEach((orb, i) => { orb.label.textContent = labels[i] ?? '' })
    this.requestStill()
  }

  /** Pixels at the bottom of the container covered by page UI; the scene is framed above them. */
  setInset(px: number) {
    this.inset = px
    this.resize()
  }

  /** Stops drawing while the scene is off screen. */
  setActive(active: boolean) {
    if (this.active === active) return
    this.active = active
    if (this.reduceMotion) return
    if (active && !this.frameId) {
      this.lastTime = performance.now()
      this.frameId = requestAnimationFrame(this.tick)
    }
    if (!active && this.frameId) {
      cancelAnimationFrame(this.frameId)
      this.frameId = 0
    }
  }

  dispose() {
    cancelAnimationFrame(this.frameId)
    this.frameId = 0
    this.resizeObserver.disconnect()
    window.removeEventListener('pointermove', this.handleWindowMove)
    const canvas = this.renderer.domElement
    canvas.removeEventListener('pointermove', this.handleCanvasMove)
    canvas.removeEventListener('pointerleave', this.handleCanvasLeave)
    canvas.removeEventListener('pointerdown', this.handlePointerDown)
    canvas.removeEventListener('pointerup', this.handlePointerUp)
    this.scene.traverse(object => {
      const item = object as THREE.Mesh
      item.geometry?.dispose()
      const material = item.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(material)) material.forEach(m => m.dispose())
      else material?.dispose()
    })
    this.disposables.forEach(item => item.dispose())
    this.renderer.dispose()
    canvas.remove()
    this.labelLayer.remove()
  }

  /* ---------- building ---------- */

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
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.4)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(canvas)
  }

  private buildRing() {
    const ringMat = (opacity: number) => new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity, depthWrite: false })
    ;[[RING_R, 0.014, 0.5], [RING_R * 0.58, 0.008, 0.16], [RING_R * 1.32, 0.008, 0.1]].forEach(([radius, tube, opacity]) => {
      const mat = ringMat(opacity)
      this.ringMats.push({ mat, opacity })
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 220), mat)
      ring.rotation.x = Math.PI / 2
      this.rig.add(ring)
    })
    // Warm pool of light on the plane the cap floats above.
    this.poolMat = new THREE.MeshBasicMaterial({ map: this.dotTex, color: AMBER, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending })
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(RING_R * 3, RING_R * 3), this.poolMat)
    pool.rotation.x = -Math.PI / 2
    pool.position.y = -1.5
    this.rig.add(pool)
  }

  private buildCap() {
    const navy = new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.42, metalness: 0.35 })
    const navyLight = new THREE.MeshStandardMaterial({ color: 0x2b4a86, roughness: 0.5, metalness: 0.25 })
    const gold = new THREE.MeshStandardMaterial({ color: AMBER, roughness: 0.26, metalness: 0.95 })

    // Mortarboard: a gold trim slab under a navy top, turned 45° so a corner faces the viewer.
    const board = new THREE.Group()
    const trim = new THREE.Mesh(new RoundedBoxGeometry(2.36, 0.07, 2.36, 3, 0.025), gold)
    const top = new THREE.Mesh(new RoundedBoxGeometry(2.26, 0.08, 2.26, 3, 0.03), navy)
    top.position.y = 0.035
    board.add(trim, top)
    board.rotation.y = Math.PI / 4

    const skull = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.74, 64), navyLight)
    skull.position.y = -0.42
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.03, 12, 72), gold)
    band.rotation.x = Math.PI / 2
    band.position.y = -0.72
    const button = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.09, 28), gold)
    button.position.y = 0.11

    // Cord from the button to the corner, then the swinging tassel.
    const cornerX = (2.36 / 2) * Math.SQRT2 - 0.1
    const cord = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.12, 0),
        new THREE.Vector3(cornerX * 0.35, 0.14, 0.04),
        new THREE.Vector3(cornerX * 0.7, 0.12, 0.02),
        new THREE.Vector3(cornerX, 0.1, 0),
      ]), 32, 0.018, 8),
      gold,
    )
    this.tassel.position.set(cornerX, 0.1, 0)
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), gold)
    rope.position.y = -0.15
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16), gold)
    knot.position.y = -0.32
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.15, 0.46, 24), gold)
    skirt.position.y = -0.58
    this.tassel.add(rope, knot, skirt)

    this.cap.add(board, skull, band, button, cord, this.tassel)
    this.cap.position.y = 0.25
    this.cap.scale.setScalar(1.08)
  }

  private buildOrbs(orbs: HeroOrb[]) {
    orbs.forEach((orb, i) => {
      const color = new THREE.Color(orb.color)
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 40, 28),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.1 }),
      )
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.dotTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.7 }))
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), new THREE.MeshBasicMaterial())
      hit.visible = false
      hit.userData.index = i
      const group = new THREE.Group()
      group.add(core, glow, hit)
      const angle = (i / orbs.length) * Math.PI * 2
      group.position.set(Math.cos(angle) * RING_R, 0, Math.sin(angle) * RING_R)
      group.userData.angle = angle
      this.pivot.add(group)

      const beamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), group.position.clone()])
      const beam = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.12, depthWrite: false }))
      this.pivot.add(beam)

      const label = document.createElement('span')
      label.className = LABEL_CLASS
      label.style.opacity = '0'
      label.textContent = orb.label
      this.labelLayer.append(label)

      this.orbs.push({ border: `${orb.color}88`, core, glow, hit, beam, label, focus: 0, hover: 0 })
    })
  }

  private buildDust() {
    const make = (count: number, color: number, size: number, light: number) => {
      const positions = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        const r = 6 + Math.random() * 12
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        positions.set([r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) * 0.7, r * Math.sin(phi) * Math.sin(theta) - 4], i * 3)
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const mat = new THREE.PointsMaterial({ color, size, map: this.dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 })
      this.dustMats.push({ mat, dark: color, light })
      return new THREE.Points(geo, mat)
    }
    this.dust.add(make(520, 0xffe3b0, 0.16, 0xf29a2e), make(320, 0x8fb2ff, 0.12, 0x6f86ff))
  }

  /**
   * Glows are additive on a dark stage; on the light stage additive light would vanish, so they
   * switch to normal blending with warmer, deeper colours.
   */
  private applyTheme() {
    const { dark } = this
    const blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending
    this.ringMats.forEach(({ mat, opacity }) => {
      mat.color.setHex(dark ? AMBER : ORANGE)
      mat.opacity = dark ? opacity : Math.min(1, opacity * 1.5)
    })
    this.poolMat.blending = blending
    this.poolMat.color.setHex(dark ? AMBER : 0xf7931a)
    this.poolMat.opacity = dark ? 0.32 : 0.2
    this.poolMat.needsUpdate = true
    this.pulse.material.blending = blending
    this.pulse.material.color.setHex(dark ? AMBER : ORANGE)
    this.pulse.material.needsUpdate = true
    this.dustMats.forEach(({ mat, dark: darkColor, light }) => {
      mat.blending = blending
      mat.color.setHex(dark ? darkColor : light)
      mat.opacity = dark ? 0.85 : 0.6
      mat.needsUpdate = true
    })
    this.orbs.forEach(orb => {
      orb.glow.material.blending = blending
      orb.glow.material.needsUpdate = true
    })
  }

  /* ---------- sizing and input ---------- */

  private readonly resize = () => {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
    const { camera } = this
    camera.aspect = w / h
    // Fit the ring (plus room for glow) into the part of the stage the page UI leaves free.
    const usable = Math.max(h - this.inset, h * 0.45)
    const extent = RING_R * 1.18
    const vHalf = THREE.MathUtils.degToRad(camera.fov) / 2
    const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect)
    const dist = Math.max(extent / Math.tan(hHalf), (extent * 0.95 * h) / (usable * Math.tan(vHalf)))
    camera.position.set(0, dist * 0.17, dist)
    camera.lookAt(0, 0, 0)
    camera.setViewOffset(w, h, 0, this.inset / 2, w, h)
    camera.updateProjectionMatrix()
    // Labels of every orb fit on a wide stage; on a narrow one only the picked and hovered orb get one.
    this.labelLayer.dataset.wide = w >= 520 ? '1' : '0'
    this.requestStill()
  }

  private setNdc(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
  }

  private readonly handleWindowMove = (event: PointerEvent) => {
    // The whole window steers the cap, not just the canvas, so it feels like it is watching you.
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    this.pointer.y = (event.clientY / window.innerHeight) * 2 - 1
    this.pointer.at = performance.now()
  }

  private readonly handleCanvasMove = (event: PointerEvent) => {
    this.setNdc(event)
    this.overCanvas = true
    if (this.reduceMotion) {
      this.updateHover()
      this.requestStill()
    }
  }

  private readonly handleCanvasLeave = () => {
    this.overCanvas = false
    if (this.reduceMotion) {
      this.hoverIndex = -1
      this.renderer.domElement.style.cursor = ''
      this.requestStill()
    }
  }

  private readonly handlePointerDown = (event: PointerEvent) => {
    this.downAt = [event.clientX, event.clientY]
  }

  private readonly handlePointerUp = (event: PointerEvent) => {
    const moved = !this.downAt || Math.hypot(event.clientX - this.downAt[0], event.clientY - this.downAt[1]) > 8
    this.downAt = null
    if (moved) return
    this.setNdc(event)
    const index = this.pick()
    if (index >= 0) this.onSelect(index === this.selected ? -1 : index)
  }

  private pick() {
    this.raycaster.setFromCamera(this.ndc, this.camera)
    const hit = this.raycaster.intersectObjects(this.orbs.map(orb => orb.hit), false)[0]
    return hit ? (hit.object.userData.index as number) : -1
  }

  private updateHover() {
    this.hoverIndex = this.overCanvas ? this.pick() : -1
    this.renderer.domElement.style.cursor = this.hoverIndex >= 0 ? 'pointer' : ''
  }

  /* ---------- loop ---------- */

  /** With reduced motion there is no loop; redraw once after something changes. */
  private requestStill() {
    if (this.reduceMotion) requestAnimationFrame(() => this.renderFrame(0))
  }

  private readonly tick = () => {
    const now = performance.now()
    const dt = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now
    this.renderFrame(dt)
    this.frameId = requestAnimationFrame(this.tick)
  }

  private renderFrame(dt: number) {
    const still = this.reduceMotion
    const k = still ? 1 : 1 - Math.exp(-dt * 6)
    this.t += dt
    const { t } = this

    // Aim: the pointer while it is moving, a slow drift otherwise.
    const idle = performance.now() - this.pointer.at > 2500
    const aimX = still ? 0 : idle ? Math.sin(t * 0.45) * 0.55 : this.pointer.x
    const aimY = still ? 0 : idle ? Math.cos(t * 0.37) * 0.3 : this.pointer.y
    const follow = still ? 1 : 1 - Math.exp(-dt * 3.2)
    this.look.x += (aimX - this.look.x) * follow
    this.look.y += (aimY - this.look.y) * follow

    // Ring: bring the picked orb to the front, otherwise keep orbiting.
    const step = (Math.PI * 2) / Math.max(this.orbs.length, 1)
    if (this.selected >= 0) {
      const diff = THREE.MathUtils.euclideanModulo(FRONT - this.selected * step - this.spin + Math.PI, Math.PI * 2) - Math.PI
      this.spin += diff * (still ? 1 : 1 - Math.exp(-dt * 4))
    } else if (!still) {
      this.spin += dt * 0.16
    }
    this.pivot.rotation.y = -this.spin
    this.rig.position.x = this.look.x * 0.18
    this.rig.rotation.x = RING_TILT + this.look.y * 0.06

    // Cap: floats, and faces the pointer.
    this.cap.position.y = 0.25 + (still ? 0 : Math.sin(t * 0.9) * 0.1)
    this.cap.rotation.y = this.look.x * 0.7 + (still ? 0 : Math.sin(t * 0.5) * 0.08)
    this.cap.rotation.x = 0.32 + this.look.y * 0.22
    this.cap.rotation.z = -this.look.x * 0.05
    this.tassel.rotation.z = still ? 0 : Math.sin(t * 1.7) * 0.12 - this.look.x * 0.1
    this.tassel.rotation.x = still ? 0 : Math.cos(t * 1.3) * 0.07

    this.dust.rotation.y = t * 0.012 + this.look.x * 0.05
    this.dust.rotation.x = this.look.y * 0.03

    const cycle = (t % 4.5) / 4.5
    this.pulse.scale.setScalar(0.35 + cycle * RING_R * 1.05)
    this.pulse.material.opacity = still ? 0 : (1 - cycle) * (1 - cycle) * 0.5

    if (!still) this.updateHover()
    const wide = this.labelLayer.dataset.wide === '1'
    const { clientWidth: w, clientHeight: h } = this.container
    this.orbs.forEach((orb, i) => {
      const isSelected = i === this.selected
      orb.focus += ((isSelected ? 1 : 0) - orb.focus) * k
      orb.hover += ((i === this.hoverIndex ? 1 : 0) - orb.hover) * k
      const emphasis = Math.max(orb.focus, orb.hover * 0.7)
      const bob = still ? 0 : Math.sin(t * 1.2 + i * 0.8) * 0.07
      const group = orb.core.parent as THREE.Group
      group.position.y = bob
      group.scale.setScalar(1 + orb.focus * 0.75 + orb.hover * 0.3)
      orb.glow.scale.setScalar(1.15 + emphasis * 1.5)
      orb.glow.material.opacity = (this.dark ? 0.5 : 0.34) + emphasis * (this.dark ? 0.45 : 0.4)
      orb.core.material.emissiveIntensity = 0.75 + emphasis * 0.9
      orb.beam.material.opacity = 0.1 + orb.focus * 0.65
      orb.beam.material.color.set(isSelected ? (this.dark ? AMBER : ORANGE) : orb.core.material.color)

      // Label follows the orb on screen; the nearer the orb, the stronger it reads.
      group.getWorldPosition(this.tmp)
      const depth = THREE.MathUtils.clamp((this.tmp.z / RING_R + 1) / 2, 0, 1)
      this.tmp.project(this.camera)
      const x = (this.tmp.x * 0.5 + 0.5) * w
      const y = (-this.tmp.y * 0.5 + 0.5) * h
      // Orbs on the far side of the ring lose their label so the back of the ring stays uncluttered.
      const show = isSelected || i === this.hoverIndex ? 1 : wide ? Math.max(0, (depth - 0.42) / 0.58) * 0.85 : 0
      const style = orb.label.style
      style.opacity = show.toFixed(2)
      // Orbs on the right half put their label on the left so it never runs off the stage.
      const gap = 16 + orb.focus * 8
      style.transform = x > w * 0.56
        ? `translate3d(${(x - gap).toFixed(1)}px, ${(y - 11).toFixed(1)}px, 0) translateX(-100%)`
        : `translate3d(${(x + gap).toFixed(1)}px, ${(y - 11).toFixed(1)}px, 0)`
      style.zIndex = String(Math.round(depth * 10 + emphasis * 20))
      style.fontSize = isSelected ? '12.5px' : '11px'
      style.color = this.dark ? '#ffffff' : '#1e293b'
      style.background = this.dark
        ? (isSelected ? 'rgba(3,7,18,0.92)' : 'rgba(3,7,18,0.66)')
        : (isSelected ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.78)')
      style.borderColor = isSelected ? (this.dark ? '#ffc247' : '#e2650f') : orb.border
    })

    this.renderer.render(this.scene, this.camera)
  }
}

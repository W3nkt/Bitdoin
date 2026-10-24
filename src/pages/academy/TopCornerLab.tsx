import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Box, Crosshair, Orbit, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { AcademyHeaderActions } from '@/components/academy/AcademyHeaderActions'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'
import {
  TOP, TopCornerScene, axisValue, drawnAxes, gapToTop, includedAxes, reachPercent,
  type LabAxis, type LabHover, type LabPoint,
} from '@/components/academy/topCornerScene'

// Top Corner Lab: every axis runs 0–100. On one axis, 100 is the top; with more
// axes the top is the corner where every axis is 100, so each dimension added
// moves the top further out. Open to every signed-in member (Free and Premium)
// from the Play & Learn card; each member's axes and points are kept on this device.

const AXIS_COLORS = ['#ff7a6b', '#4fd1c5', '#ffc857', '#6fc3ff', '#b5e655', '#f78fb3', '#c89bff', '#ff9f5a']
const POINT_COLORS = ['#8ea8ff', '#f78fb3', '#b5e655', '#c89bff', '#6fc3ff', '#ff9f5a', '#e6ebf6']
const SLOTS = ['x', 'y', 'z']
const MAX_AXES = 8
const MAX_POINTS = 12
const STORE_VERSION = 'v1'

interface LabState {
  axes: LabAxis[]
  points: LabPoint[]
  activeId: number | null
  shell: boolean
  spin: boolean
  nextId: number
}

function seedState(): LabState {
  const axes: LabAxis[] = [
    { id: 1, name: 'x', color: AXIS_COLORS[0], on: true },
    { id: 2, name: 'y', color: AXIS_COLORS[1], on: true },
    { id: 3, name: 'z', color: AXIS_COLORS[2], on: true },
  ]
  const points: LabPoint[] = [
    { id: 4, name: 'A', color: POINT_COLORS[0], vals: { 1: 100, 2: 40, 3: 70 } },
    { id: 5, name: 'B', color: POINT_COLORS[1], vals: { 1: 70, 2: 70, 3: 70 } },
  ]
  return { axes, points, activeId: 4, shell: true, spin: false, nextId: 6 }
}

const storageKey = (profileId: string | undefined) => `bitdoin.top-corner-lab.${STORE_VERSION}:${profileId ?? 'guest'}`

const isColor = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)

function loadState(profileId: string | undefined): LabState {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(profileId)) ?? 'null')
    if (!raw || !Array.isArray(raw.axes) || !Array.isArray(raw.points)) return seedState()
    const axes: LabAxis[] = raw.axes.slice(0, MAX_AXES)
      .filter((axis: LabAxis) => Number.isInteger(axis?.id) && isColor(axis.color))
      .map((axis: LabAxis) => ({ id: axis.id, name: String(axis.name ?? '').slice(0, 16) || 'axis', color: axis.color, on: axis.on !== false }))
    const axisIds = new Set(axes.map(axis => axis.id))
    const points: LabPoint[] = raw.points.slice(0, MAX_POINTS)
      .filter((point: LabPoint) => Number.isInteger(point?.id) && isColor(point.color) && point.vals && typeof point.vals === 'object')
      .map((point: LabPoint) => ({
        id: point.id,
        name: String(point.name ?? '').slice(0, 16) || '?',
        color: point.color,
        vals: Object.fromEntries(Object.entries(point.vals)
          .filter(([id, value]) => axisIds.has(Number(id)) && Number.isFinite(value))
          .map(([id, value]) => [Number(id), Math.min(TOP, Math.max(0, Number(value)))])),
      }))
    const nextId = Math.max(0, ...axes.map(axis => axis.id), ...points.map(point => point.id)) + 1
    const activeId = points.some(point => point.id === raw.activeId) ? raw.activeId : points[0]?.id ?? null
    return { axes, points, activeId, shell: raw.shell !== false, spin: false, nextId }
  } catch {
    return seedState()
  }
}

function saveState(profileId: string | undefined, state: LabState) {
  try {
    localStorage.setItem(storageKey(profileId), JSON.stringify({
      axes: state.axes,
      points: state.points.map(({ id, name, color, vals }) => ({ id, name, color, vals })),
      activeId: state.activeId,
      shell: state.shell,
    }))
  } catch {
    // Storage can be unavailable (private mode); the lab still works for this visit.
  }
}

const fmt = (value: number, digits = 1) => {
  const text = value.toFixed(digits)
  return /^-0(\.0+)?$/.test(text) ? text.slice(1) : text
}
const fmtValue = (value: number) => (Math.abs(value - Math.round(value)) < 0.05 ? String(Math.round(value)) : fmt(value))

function nextPointName(points: LabPoint[]) {
  for (let i = 0; i < 26; i++) {
    const name = String.fromCharCode(65 + i)
    if (!points.some(point => point.name === name)) return name
  }
  return `P${points.length + 1}`
}

const copy = {
  en: {
    title: 'Top Corner Lab',
    eyebrow: 'Play & Learn · 3D lab',
    intro: 'Every axis runs 0–100. On one axis, 100 is the top. Add a second axis and the top moves to the corner (100, 100), so you only reach it by being 100 on both. Each dimension you add moves the top further out.',
    dimensions: 'Dimensions',
    inUse: (n: number) => `${n} in use`,
    addAxis: 'Add axis',
    points: 'Points',
    addPoint: 'Add point',
    notInVector: 'not in vector',
    drawnAs: (slot: string) => `drawn as ${slot}`,
    notDrawn: (n: number) => `dim ${n} · not drawn`,
    on: 'on',
    off: 'off',
    removeFromVector: 'Remove from the vector',
    addToVector: 'Add to the vector',
    deleteAxis: (name: string) => `Delete axis ${name}`,
    deletePoint: (name: string) => `Delete point ${name}`,
    axisColor: (name: string) => `Color of axis ${name}`,
    axisName: 'Axis name',
    pointName: 'Point name',
    reach: 'reach',
    noAxes: 'No axes. Add one to start.',
    noPoints: 'No points. Add one, or click inside the plot.',
    turnOnAxis: 'Turn on an axis to give this point a value.',
    shell: 'Equal-reach surface',
    orbit: 'Orbit',
    resetView: 'Reset view',
    dimsGroup: 'Number of dimensions',
    hintLine: 'Click the line to add a point',
    hintSquare: 'Click inside the square to add a point',
    hintShell: 'Click the shell to add a point with the same reach',
    hintNoShell: 'Turn on the equal-reach surface to add points by clicking',
    nothing: 'Nothing to measure',
    needAxis: 'Turn on at least one axis.',
    needPoint: 'Add a point to see how close it is to the top.',
    pointHeader: (name: string, n: number, hidden: number) => `Point ${name} · ${n} dimension${n > 1 ? 's' : ''}${hidden > 0 ? ` (${hidden} not drawn)` : ''}`,
    ofTheWay: (gap: string, max: string) => `of the way to the top · gap ${gap} of ${max}`,
    onCorner: (name: string) => `${name} is 100 on every axis, so it sits on the top corner.`,
    maxedSome: (name: string, axes: string, many: boolean, n: number, gap: string) => `${name} is 100 on ${axes}, the top of ${many ? 'those axes' : 'that axis'}. The top corner needs 100 on all ${n}, so it is still ${gap} away.`,
    corner: (vector: string) => `The top corner is (${vector}). Every axis below 100 adds distance to it.`,
    clickSelect: 'click to select',
    clickAdd: 'click to add a point',
    topLabel: 'top',
    newAxis: (n: number) => `axis ${n}`,
    limitAxes: `Up to ${MAX_AXES} axes`,
    limitPoints: `Up to ${MAX_POINTS} points`,
    back: 'Back to Academy',
    noWebgl: 'This device cannot show 3D graphics, so the lab cannot open here. Try another browser or device.',
  },
  lo: {
    title: 'ຫ້ອງທົດລອງມຸມສູງສຸດ',
    eyebrow: 'ຮຽນຮູ້ຜ່ານການຫຼິ້ນ · ຫ້ອງທົດລອງ 3D',
    intro: 'ທຸກແກນມີຄ່າແຕ່ 0 ຫາ 100. ຖ້າມີແກນດຽວ, 100 ຄືຈຸດສູງສຸດ. ເມື່ອເພີ່ມແກນທີສອງ ຈຸດສູງສຸດຈະຍ້າຍໄປຢູ່ມຸມ (100, 100), ດັ່ງນັ້ນທ່ານຈະໄປຮອດໄດ້ກໍ່ຕໍ່ເມື່ອໄດ້ 100 ທັງສອງແກນ. ຍິ່ງເພີ່ມມິຕິ ຈຸດສູງສຸດກໍ່ຍິ່ງຢູ່ໄກອອກໄປ.',
    dimensions: 'ມິຕິ',
    inUse: (n: number) => `ໃຊ້ຢູ່ ${n}`,
    addAxis: 'ເພີ່ມແກນ',
    points: 'ຈຸດ',
    addPoint: 'ເພີ່ມຈຸດ',
    notInVector: 'ບໍ່ໄດ້ນັບ',
    drawnAs: (slot: string) => `ສະແດງເປັນ ${slot}`,
    notDrawn: (n: number) => `ມິຕິທີ ${n} · ບໍ່ໄດ້ແຕ້ມ`,
    on: 'ເປີດ',
    off: 'ປິດ',
    removeFromVector: 'ບໍ່ນັບແກນນີ້',
    addToVector: 'ນັບແກນນີ້',
    deleteAxis: (name: string) => `ລຶບແກນ ${name}`,
    deletePoint: (name: string) => `ລຶບຈຸດ ${name}`,
    axisColor: (name: string) => `ສີຂອງແກນ ${name}`,
    axisName: 'ຊື່ແກນ',
    pointName: 'ຊື່ຈຸດ',
    reach: 'ເຂົ້າໃກ້',
    noAxes: 'ຍັງບໍ່ມີແກນ. ເພີ່ມແກນເພື່ອເລີ່ມຕົ້ນ.',
    noPoints: 'ຍັງບໍ່ມີຈຸດ. ກົດເພີ່ມຈຸດ ຫຼື ກົດໃສ່ໃນກາຟ.',
    turnOnAxis: 'ເປີດແກນໃດໜຶ່ງ ເພື່ອໃສ່ຄ່າໃຫ້ຈຸດນີ້.',
    shell: 'ພື້ນຜິວໄລຍະເທົ່າກັນ',
    orbit: 'ໝູນອ້ອມ',
    resetView: 'ຕັ້ງມຸມມອງຄືນ',
    dimsGroup: 'ຈຳນວນມິຕິ',
    hintLine: 'ກົດໃສ່ເສັ້ນ ເພື່ອເພີ່ມຈຸດ',
    hintSquare: 'ກົດໃນສີ່ຫຼ່ຽມ ເພື່ອເພີ່ມຈຸດ',
    hintShell: 'ກົດໃສ່ພື້ນຜິວ ເພື່ອເພີ່ມຈຸດທີ່ເຂົ້າໃກ້ເທົ່າກັນ',
    hintNoShell: 'ເປີດພື້ນຜິວໄລຍະເທົ່າກັນ ເພື່ອກົດເພີ່ມຈຸດ',
    nothing: 'ຍັງບໍ່ມີຫຍັງໃຫ້ວັດແທກ',
    needAxis: 'ເປີດຢ່າງໜ້ອຍໜຶ່ງແກນ.',
    needPoint: 'ເພີ່ມຈຸດ ເພື່ອເບິ່ງວ່າມັນຢູ່ໃກ້ຈຸດສູງສຸດປານໃດ.',
    pointHeader: (name: string, n: number, hidden: number) => `ຈຸດ ${name} · ${n} ມິຕິ${hidden > 0 ? ` (ບໍ່ໄດ້ແຕ້ມ ${hidden})` : ''}`,
    ofTheWay: (gap: string, max: string) => `ຂອງທາງໄປຫາຈຸດສູງສຸດ · ຫ່າງ ${gap} ຈາກ ${max}`,
    onCorner: (name: string) => `${name} ໄດ້ 100 ທຸກແກນ, ຈຶ່ງຢູ່ມຸມສູງສຸດພໍດີ.`,
    maxedSome: (name: string, axes: string, _many: boolean, n: number, gap: string) => `${name} ໄດ້ 100 ໃນແກນ ${axes} ເຊິ່ງເປັນຈຸດສູງສຸດຂອງແກນນັ້ນ. ແຕ່ມຸມສູງສຸດຕ້ອງໄດ້ 100 ທັງໝົດ ${n} ແກນ, ຈຶ່ງຍັງຫ່າງອີກ ${gap}.`,
    corner: (vector: string) => `ມຸມສູງສຸດຄື (${vector}). ທຸກແກນທີ່ຕ່ຳກວ່າ 100 ເຮັດໃຫ້ຢູ່ຫ່າງອອກໄປ.`,
    clickSelect: 'ກົດເພື່ອເລືອກ',
    clickAdd: 'ກົດເພື່ອເພີ່ມຈຸດ',
    topLabel: 'ສູງສຸດ',
    newAxis: (n: number) => `ແກນ ${n}`,
    limitAxes: `ໄດ້ສູງສຸດ ${MAX_AXES} ແກນ`,
    limitPoints: `ໄດ້ສູງສຸດ ${MAX_POINTS} ຈຸດ`,
    back: 'ກັບໄປ Academy',
    noWebgl: 'ອຸປະກອນນີ້ສະແດງພາບ 3D ບໍ່ໄດ້, ຈຶ່ງເປີດຫ້ອງທົດລອງບໍ່ໄດ້. ລອງໃຊ້ບຣາວເຊີ ຫຼື ອຸປະກອນອື່ນ.',
  },
}

export function TopCornerLab() {
  const { language } = useLanguage()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const lo = language === 'lo'
  const text = copy[language]
  const profileId = profile?.id

  const [state, setState] = useState<LabState>(() => loadState(profileId))
  const [hover, setHover] = useState<LabHover | null>(null)
  const [webglFailed, setWebglFailed] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<TopCornerScene | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  // The signed-in profile can arrive after the first render; load that member's lab then.
  const loadedFor = useRef(profileId)
  useEffect(() => {
    if (loadedFor.current === profileId) return
    loadedFor.current = profileId
    setState(loadState(profileId))
  }, [profileId])

  useEffect(() => {
    const timer = window.setTimeout(() => saveState(profileId, state), 250)
    return () => window.clearTimeout(timer)
  }, [profileId, state])

  const included = useMemo(() => includedAxes(state.axes), [state.axes])
  const drawn = useMemo(() => drawnAxes(state.axes), [state.axes])
  const active = state.points.find(point => point.id === state.activeId) ?? state.points[0] ?? null

  function addPoint(vals: Record<number, number>, enterFromOrigin: boolean) {
    setState(current => {
      if (current.points.length >= MAX_POINTS) return current
      const used = new Set(current.points.map(point => point.color))
      const color = POINT_COLORS.find(c => !used.has(c)) ?? POINT_COLORS[current.points.length % POINT_COLORS.length]
      const point: LabPoint = { id: current.nextId, name: nextPointName(current.points), color, vals, enterFromOrigin }
      return { ...current, points: [...current.points, point], activeId: point.id, nextId: current.nextId + 1 }
    })
  }

  // Create the 3D scene once; it reads the latest state through stateRef in its callbacks.
  useEffect(() => {
    if (!stageRef.current) return
    let scene: TopCornerScene
    try {
      scene = new TopCornerScene(stageRef.current, {
        onSelectPoint: pointId => setState(current => ({ ...current, activeId: pointId })),
        onAddPoint: hitVals => {
          const current = stateRef.current
          const currentActive = current.points.find(point => point.id === current.activeId) ?? current.points[0]
          // Axes that are not drawn keep the active point's values.
          const vals: Record<number, number> = {}
          current.axes.forEach(axis => { vals[axis.id] = currentActive ? axisValue(currentActive, axis) : 50 })
          drawnAxes(current.axes).forEach((axis, i) => { vals[axis.id] = hitVals[i] })
          addPoint(vals, false)
        },
        onHover: setHover,
      }, copy[language].topLabel)
    } catch (error) {
      console.error('Top Corner Lab could not start WebGL', error)
      setWebglFailed(true)
      return
    }
    sceneRef.current = scene
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.setModel({ axes: state.axes, points: state.points, activeId: state.activeId, shell: state.shell, spin: state.spin })
  }, [state])

  useEffect(() => {
    sceneRef.current?.setTopLabel(text.topLabel)
  }, [text.topLabel])

  function goBack() {
    navigate('/academy/play')
  }

  function addAxis() {
    setState(current => {
      if (current.axes.length >= MAX_AXES) return current
      const used = new Set(current.axes.map(axis => axis.color))
      const color = AXIS_COLORS.find(c => !used.has(c)) ?? AXIS_COLORS[current.axes.length % AXIS_COLORS.length]
      const axis: LabAxis = { id: current.nextId, name: text.newAxis(current.axes.length + 1), color, on: true }
      return {
        ...current,
        axes: [...current.axes, axis],
        points: current.points.map(point => ({ ...point, vals: { ...point.vals, [axis.id]: 50 } })),
        nextId: current.nextId + 1,
      }
    })
  }

  function updateAxis(id: number, patch: Partial<LabAxis>) {
    setState(current => ({ ...current, axes: current.axes.map(axis => (axis.id === id ? { ...axis, ...patch } : axis)) }))
  }

  function deleteAxis(id: number) {
    setState(current => ({
      ...current,
      axes: current.axes.filter(axis => axis.id !== id),
      points: current.points.map(point => {
        const vals = { ...point.vals }
        delete vals[id]
        return { ...point, vals }
      }),
    }))
  }

  function setDimensions(n: number) {
    setState(current => ({ ...current, axes: current.axes.map((axis, i) => ({ ...axis, on: i < n })) }))
  }

  function updatePoint(id: number, patch: Partial<LabPoint>) {
    setState(current => ({ ...current, points: current.points.map(point => (point.id === id ? { ...point, ...patch } : point)) }))
  }

  function deletePoint(id: number) {
    setState(current => {
      const points = current.points.filter(point => point.id !== id)
      return { ...current, points, activeId: current.activeId === id ? points[0]?.id ?? null : current.activeId }
    })
  }

  const hint = drawn.length === 0 ? ''
    : drawn.length === 1 ? text.hintLine
      : drawn.length === 2 ? text.hintSquare
        : state.shell ? text.hintShell : text.hintNoShell

  return (
    // data-lang drives the Lao-only label styles below: Noto Sans Lao instead of the monospace
    // font (it has no Lao letters), a slightly larger size, and no wide letter-spacing.
    <div data-lang={language} className="min-h-screen bg-[#f5f6f2] dark:bg-gray-950 text-slate-950 dark:text-slate-100">
      <header className="sticky top-[var(--academy-banner-h,0px)] z-30 border-b border-slate-900/10 dark:border-white/10 bg-[#f5f6f2]/90 dark:bg-gray-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
          <button type="button" onClick={goBack} className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-slate-900/5 dark:hover:bg-white/10" aria-label={text.back}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className={cn('truncate text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300', lo ? 'tracking-normal' : 'tracking-[0.22em]')}>{text.eyebrow}</p>
            <h1 className="truncate text-base font-black sm:text-lg">{text.title}</h1>
          </div>
          <AcademyHeaderActions />
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 sm:px-6 lg:h-[calc(100vh-4rem-var(--academy-banner-h,0px))] lg:grid-cols-[360px_minmax(0,1fr)] lg:py-5">
        {/* Controls first and the stage below on phones; stage on the right on large screens. */}
        <section
          className="relative order-last h-[62vh] min-h-[380px] overflow-hidden rounded-3xl bg-[#0b101c] text-[#e6ebf6] shadow-card lg:h-auto"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 55% 40%, #17223f 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 20% 90%, #1a1830 0%, transparent 70%), #0b101c' }}
        >
          <div ref={stageRef} className="absolute inset-0" />

          {webglFailed ? (
            <p role="alert" className="absolute inset-0 grid place-items-center p-8 text-center text-sm font-semibold text-[#8995b0]">{text.noWebgl}</p>
          ) : (
            <>
              <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-center gap-2 sm:inset-x-4 sm:top-4">
                <div role="group" aria-label={text.dimsGroup} className="pointer-events-auto flex flex-wrap items-center gap-0.5 rounded-xl border border-[#243050] bg-[#111828]/85 p-1 backdrop-blur">
                  {state.axes.map((_, i) => {
                    const pressed = included.length === i + 1 && state.axes.slice(0, i + 1).every(axis => axis.on)
                    return (
                      <button
                        key={i}
                        type="button"
                        aria-pressed={pressed}
                        onClick={() => setDimensions(i + 1)}
                        className={cn('rounded-lg px-2.5 py-1.5 text-xs font-bold transition sm:text-[13px]', pressed ? 'bg-[#e6ebf6] text-[#0b101c]' : 'text-[#8995b0] hover:text-[#e6ebf6]')}
                      >
                        {i + 1}D
                      </button>
                    )
                  })}
                </div>
                <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-[#243050] bg-[#111828]/85 p-1 backdrop-blur">
                  <StageToggle pressed={state.shell} onClick={() => setState(current => ({ ...current, shell: !current.shell }))} icon={<Box className="h-3.5 w-3.5" />} label={text.shell} />
                </div>
                <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-[#243050] bg-[#111828]/85 p-1 backdrop-blur">
                  <StageToggle pressed={state.spin} onClick={() => setState(current => ({ ...current, spin: !current.spin }))} icon={<Orbit className="h-3.5 w-3.5" />} label={text.orbit} />
                  <button type="button" onClick={() => sceneRef.current?.resetView()} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#8995b0] transition hover:text-[#e6ebf6] sm:text-[13px]">
                    <RotateCcw className="h-3.5 w-3.5" /> {text.resetView}
                  </button>
                </div>
              </div>

              {hint && (
                <p className="pointer-events-none absolute right-4 top-16 hidden items-center gap-1.5 font-mono text-[11.5px] [[data-lang=lo]_&]:font-lao text-[#8995b0] md:flex">
                  <Crosshair className="h-3.5 w-3.5" /> {hint}
                </p>
              )}

              <InfoCard state={state} active={active} included={included} drawnCount={drawn.length} text={text} />

              {hover && (
                <div className="pointer-events-none absolute right-3 top-28 min-w-40 rounded-xl border border-[#243050] bg-[#0b101c]/90 px-3 py-2 font-mono text-xs leading-6 tabular-nums [[data-lang=lo]_&]:font-lao sm:right-4 md:bottom-4 md:top-auto">
                  {hover.kind === 'point' ? (() => {
                    const point = state.points.find(item => item.id === hover.pointId)
                    return point ? (
                      <>
                        <div className="flex justify-between gap-4"><span className="text-[#8995b0]">{point.name}</span><span>{fmt(reachPercent(point, included))}%</span></div>
                        <div className="text-[#ffc857]">{text.clickSelect}</div>
                      </>
                    ) : null
                  })() : (
                    <>
                      {drawn.map((axis, i) => (
                        <div key={axis.id} className="flex justify-between gap-4"><span style={{ color: axis.color }}>{axis.name}</span><span>{fmt(hover.vals[i] ?? 0)}</span></div>
                      ))}
                      <div className="flex justify-between gap-4">
                        <span className="text-[#8995b0]">{text.reach}</span>
                        <span>{fmt(reachPercent(probePoint(state, active, drawn, hover.vals), included))}%</span>
                      </div>
                      <div className="text-[#ffc857]">{text.clickAdd}</div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-3xl bg-white dark:bg-gray-900 p-4 shadow-card sm:p-5">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-primary-950 dark:text-primary-300">{text.title}</h2>
            <p className="mt-2 text-[13px] leading-6 text-slate-500 dark:text-slate-400">{text.intro}</p>
          </div>

          <SectionHead
            title={`${text.dimensions} · ${text.inUse(included.length)}`}
            action={text.addAxis}
            onAction={addAxis}
            disabled={state.axes.length >= MAX_AXES}
            disabledLabel={text.limitAxes}
          />
          <div className="flex flex-col gap-1.5">
            {state.axes.length === 0 && <Empty>{text.noAxes}</Empty>}
            {state.axes.map(axis => {
              const drawnIndex = drawn.indexOf(axis)
              const includedIndex = included.indexOf(axis)
              const badge = !axis.on ? text.notInVector : drawnIndex >= 0 ? text.drawnAs(SLOTS[drawnIndex]) : text.notDrawn(includedIndex + 1)
              return (
                <div key={axis.id} className={cn('flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5', !axis.on && 'opacity-50')}>
                  <label className="relative h-[18px] w-[18px] flex-none cursor-pointer overflow-hidden rounded-full" style={{ background: axis.color, boxShadow: `0 0 10px ${axis.color}88` }}>
                    <input type="color" value={axis.color} onChange={event => updateAxis(axis.id, { color: event.target.value })} aria-label={text.axisColor(axis.name)} className="absolute -inset-1.5 h-[30px] w-[30px] cursor-pointer opacity-0" />
                  </label>
                  <input
                    value={axis.name}
                    maxLength={16}
                    aria-label={text.axisName}
                    onChange={event => updateAxis(axis.id, { name: event.target.value || 'axis' })}
                    className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[13.5px] font-semibold outline-none hover:border-slate-200 focus:border-primary-400 focus:bg-white dark:hover:border-slate-700 dark:focus:bg-gray-900"
                  />
                  <span className="whitespace-nowrap font-mono text-[11px] text-slate-500 [[data-lang=lo]_&]:font-lao [[data-lang=lo]_&]:text-xs dark:text-slate-400" style={drawnIndex >= 0 ? { color: axis.color } : undefined}>{badge}</span>
                  <button
                    type="button"
                    aria-pressed={axis.on}
                    title={axis.on ? text.removeFromVector : text.addToVector}
                    onClick={() => updateAxis(axis.id, { on: !axis.on })}
                    className="flex-none rounded-full border px-2 py-0.5 font-mono text-[11.5px] font-semibold [[data-lang=lo]_&]:font-lao [[data-lang=lo]_&]:text-xs"
                    style={axis.on ? { background: axis.color, borderColor: axis.color, color: '#0b101c' } : undefined}
                  >
                    {axis.on ? text.on : text.off}
                  </button>
                  <IconButton label={text.deleteAxis(axis.name)} onClick={() => deleteAxis(axis.id)} />
                </div>
              )
            })}
          </div>

          <SectionHead
            title={`${text.points} · ${state.points.length}`}
            action={text.addPoint}
            onAction={() => {
              const vals: Record<number, number> = {}
              state.axes.forEach(axis => { vals[axis.id] = 50 })
              addPoint(vals, true)
            }}
            disabled={state.points.length >= MAX_POINTS}
            disabledLabel={text.limitPoints}
          />
          <div className="flex flex-col gap-1.5 pb-1">
            {state.points.length === 0 && <Empty>{text.noPoints}</Empty>}
            {state.points.map(point => {
              const isActive = active?.id === point.id
              return (
                <div
                  key={point.id}
                  className={cn('rounded-2xl border bg-slate-50 dark:bg-slate-800/50', isActive ? 'border-transparent' : 'border-slate-200 dark:border-slate-700')}
                  style={isActive ? { boxShadow: `0 0 0 1.5px ${point.color}` } : undefined}
                >
                  <div
                    className="flex cursor-pointer items-center gap-2 px-2 py-1.5"
                    onClick={event => {
                      if ((event.target as HTMLElement).closest('input,button')) return
                      setState(current => ({ ...current, activeId: point.id }))
                    }}
                  >
                    <span className="h-[18px] w-[18px] flex-none rounded-full" style={{ background: point.color, boxShadow: `0 0 10px ${point.color}88` }} />
                    <input
                      value={point.name}
                      maxLength={16}
                      aria-label={text.pointName}
                      onFocus={() => setState(current => ({ ...current, activeId: point.id }))}
                      onChange={event => updatePoint(point.id, { name: event.target.value || '?' })}
                      className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[13.5px] font-semibold outline-none hover:border-slate-200 focus:border-primary-400 focus:bg-white dark:hover:border-slate-700 dark:focus:bg-gray-900"
                    />
                    <span className="whitespace-nowrap font-mono text-[12.5px] tabular-nums">
                      {fmt(reachPercent(point, included))}%<small className="ml-1 text-[10.5px] [[data-lang=lo]_&]:font-lao text-slate-500 [[data-lang=lo]_&]:text-[11.5px] dark:text-slate-400">{text.reach}</small>
                    </span>
                    <IconButton label={text.deletePoint(point.name)} onClick={() => deletePoint(point.id)} />
                  </div>
                  {isActive && (
                    <div className="flex flex-col gap-0.5 px-3 pb-3 pt-0.5">
                      {included.length === 0 && <Empty>{text.turnOnAxis}</Empty>}
                      {included.map(axis => {
                        const value = axisValue(point, axis)
                        return (
                          <div key={axis.id} className="grid grid-cols-[64px_minmax(0,1fr)_40px] items-center gap-2">
                            <label htmlFor={`lab-v-${point.id}-${axis.id}`} className="truncate font-mono text-xs [[data-lang=lo]_&]:font-lao" style={{ color: axis.color }}>{axis.name}</label>
                            <input
                              id={`lab-v-${point.id}-${axis.id}`}
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={value}
                              onChange={event => updatePoint(point.id, { vals: { ...point.vals, [axis.id]: Number(event.target.value) } })}
                              className="h-[22px] w-full cursor-pointer"
                              style={{ accentColor: axis.color }}
                            />
                            <output htmlFor={`lab-v-${point.id}-${axis.id}`} className="text-right font-mono text-xs tabular-nums">{fmtValue(value)}</output>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </aside>
      </main>
    </div>
  )
}

/** The point that would be added at the hovered position, for the readout's reach. */
function probePoint(state: LabState, active: LabPoint | null, drawn: LabAxis[], vals: number[]): LabPoint {
  const probe: Record<number, number> = {}
  state.axes.forEach(axis => { probe[axis.id] = active ? axisValue(active, axis) : 50 })
  drawn.forEach((axis, i) => { probe[axis.id] = vals[i] ?? 0 })
  return { id: -1, name: '', color: '#ffffff', vals: probe }
}

function InfoCard({ state, active, included, drawnCount, text }: {
  state: LabState
  active: LabPoint | null
  included: LabAxis[]
  drawnCount: number
  text: (typeof copy)['en'] | (typeof copy)['lo']
}) {
  // Compact on phones so the graph stays visible; full size from sm up.
  const boxClass = 'pointer-events-none absolute bottom-2 left-2 flex w-[min(260px,calc(100%-16px))] flex-col gap-1 rounded-xl border border-[#243050] bg-[#111828]/80 px-2.5 py-2 backdrop-blur sm:bottom-4 sm:left-4 sm:w-[min(400px,calc(100%-32px))] sm:gap-2 sm:rounded-2xl sm:px-3.5 sm:py-3'
  if (!active || included.length === 0 || state.points.length === 0) {
    return (
      <div className={boxClass}>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#ffc857] [[data-lang=lo]_&]:font-lao [[data-lang=lo]_&]:text-xs [[data-lang=lo]_&]:tracking-normal">{text.nothing}</p>
        <p className="text-[12.5px] leading-5 text-[#8995b0]">{included.length === 0 ? text.needAxis : text.needPoint}</p>
      </div>
    )
  }
  const reach = reachPercent(active, included)
  const gap = gapToTop(active, included)
  const maxGap = TOP * Math.sqrt(included.length)
  const hidden = included.length - drawnCount
  const maxed = included.filter(axis => axisValue(active, axis) >= TOP).map(axis => axis.name)
  const note = reach >= 99.95 ? text.onCorner(active.name)
    : maxed.length ? text.maxedSome(active.name, maxed.join(', '), maxed.length > 1, included.length, fmt(gap))
      : text.corner(included.map(() => '100').join(', '))
  return (
    <div className={boxClass}>
      <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] [[data-lang=lo]_&]:font-lao [[data-lang=lo]_&]:text-xs [[data-lang=lo]_&]:tracking-normal" style={{ color: active.color }}>{text.pointHeader(active.name, included.length, hidden)}</p>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 sm:gap-2.5">
        <b className="text-xl font-black tabular-nums leading-none tracking-tight sm:text-[34px]">{fmt(reach)}%</b>
        <span className="text-[11px] leading-4 text-[#8995b0] sm:text-[12.5px]">{text.ofTheWay(fmt(gap), fmt(maxGap))}</span>
      </div>
      <p className="break-words font-mono text-[11px] sm:text-[13px]">
        ({included.map((axis, i) => (
          <span key={axis.id}>{i > 0 && ', '}<span style={{ color: axis.color }}>{fmtValue(axisValue(active, axis))}</span></span>
        ))})
      </p>
      {/* How the reach changes as each dimension is added. */}
      <div className="hidden grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 font-mono text-[11.5px] tabular-nums [[data-lang=lo]_&]:font-lao sm:grid">
        {included.map((axis, i) => {
          const stepReach = reachPercent(active, included.slice(0, i + 1))
          return (
            <div key={axis.id} className="contents">
              <span className="text-[#8995b0]">{i + 1}D</span>
              <span className="max-w-[90px] truncate" style={{ color: axis.color }}>{i ? '+' : ''}{axis.name}</span>
              <span className="h-1.5 overflow-hidden rounded bg-[#243050]">
                <i className="block h-full rounded bg-gradient-to-r from-[#2b5fa8] via-[#2fb3a6] to-[#ffd27a]" style={{ width: `${Math.max(0, stepReach)}%` }} />
              </span>
              <span className="text-right">{fmt(stepReach)}%</span>
            </div>
          )
        })}
      </div>
      <p className="hidden text-[12.5px] leading-5 text-[#8995b0] sm:block">{note}</p>
    </div>
  )
}

function StageToggle({ pressed, onClick, icon, label }: { pressed: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition sm:text-[13px]', pressed ? 'bg-[#e6ebf6] text-[#0b101c]' : 'text-[#8995b0] hover:text-[#e6ebf6]')}
    >
      {icon} {label}
    </button>
  )
}

function SectionHead({ title, action, onAction, disabled, disabledLabel }: { title: string; action: string; onAction: () => void; disabled: boolean; disabledLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 [[data-lang=lo]_&]:font-lao [[data-lang=lo]_&]:text-xs [[data-lang=lo]_&]:tracking-normal dark:text-slate-400">{title}</h3>
      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        title={disabled ? disabledLabel : undefined}
        className="inline-flex items-center gap-1 rounded-full border border-emerald-300 dark:border-emerald-500/40 px-3 py-1 text-xs font-black text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" /> {action}
      </button>
    </div>
  )
}

function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="grid h-7 w-7 flex-none place-items-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-3 py-3 text-center text-[13px] leading-5 text-slate-500 dark:text-slate-400">{children}</p>
}

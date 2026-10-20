import { useEffect, useRef } from 'react'
import { AcademyHeroScene, type HeroOrb } from './academyHeroScene'

interface AcademyHero3DProps {
  /** Memoize it: labels are re-applied whenever this array changes. */
  orbs: HeroOrb[]
  /** Index of the picked path, or -1. */
  selected: number
  /** The page's colour mode; the scene restyles its glows and labels to suit. */
  dark: boolean
  /** Pixels at the bottom of the stage the page covers with its own UI. */
  insetBottom: number
  onSelect: (index: number) => void
  /** WebGL could not start; the page swaps in its static visual. */
  onUnavailable: () => void
}

// Default export so the landing page can React.lazy() it and keep three.js out of its first load.
export default function AcademyHero3D({ orbs, selected, dark, insetBottom, onSelect, onUnavailable }: AcademyHero3DProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<AcademyHeroScene | null>(null)
  const latest = useRef({ orbs, selected, dark, insetBottom, onSelect, onUnavailable })
  latest.current = { orbs, selected, dark, insetBottom, onSelect, onUnavailable }

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const first = latest.current
    let scene: AcademyHeroScene
    try {
      scene = new AcademyHeroScene(stage, first.orbs, index => latest.current.onSelect(index), first.dark)
    } catch (error) {
      console.error('Academy hero could not start WebGL', error)
      first.onUnavailable()
      return
    }
    scene.setInset(first.insetBottom)
    scene.setSelected(first.selected)
    sceneRef.current = scene
    const visibility = new IntersectionObserver(([entry]) => scene.setActive(entry.isIntersecting))
    visibility.observe(stage)
    return () => {
      visibility.disconnect()
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => { sceneRef.current?.setLabels(orbs.map(orb => orb.label)) }, [orbs])
  useEffect(() => { sceneRef.current?.setSelected(selected) }, [selected])
  useEffect(() => { sceneRef.current?.setDark(dark) }, [dark])
  useEffect(() => { sceneRef.current?.setInset(insetBottom) }, [insetBottom])

  return <div ref={stageRef} className="absolute inset-0" />
}

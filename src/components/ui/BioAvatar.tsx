import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { PersonProfile } from '@/data/biographyProfiles'

// ── Batched Wikipedia photo fetcher ────────────────────────────────────────
// All BioAvatar instances share one cache and one pending queue.
// After a 30 ms debounce, all pending titles are fetched in a single
// Wikipedia API call (up to 50 titles per request), avoiding rate-limit
// issues that occur when 15+ individual fetch calls fire simultaneously.

const photoCache = new Map<string, string | null>()
const pendingCbs = new Map<string, Array<(url: string | null) => void>>()
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function scheduleFlush() {
  if (debounceTimer !== null) return
  debounceTimer = setTimeout(flushPending, 30)
}

async function flushPending() {
  debounceTimer = null
  const titles = [...pendingCbs.keys()]
  if (titles.length === 0) return

  const snapshot = new Map(pendingCbs)
  pendingCbs.clear()

  try {
    const qs = titles.map(t => encodeURIComponent(t)).join('|')
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&pithumbsize=400&format=json&origin=*&titles=${qs}`
    )
    const data = res.ok ? await res.json() : null
    const pages: Record<string, { title?: string; thumbnail?: { source?: string } }> =
      data?.query?.pages ?? {}

    const byTitle = new Map<string, string | null>()
    for (const page of Object.values(pages)) {
      const key = (page.title ?? '').replace(/ /g, '_')
      byTitle.set(key, page.thumbnail?.source ?? null)
    }

    for (const t of titles) {
      const url = byTitle.get(t) ?? null
      photoCache.set(t, url)
      snapshot.get(t)?.forEach(cb => cb(url))
    }
  } catch {
    for (const t of titles) {
      photoCache.set(t, null)
      snapshot.get(t)?.forEach(cb => cb(null))
    }
  }
}

function requestPhoto(wikiTitle: string, callback: (url: string | null) => void) {
  if (photoCache.has(wikiTitle)) {
    callback(photoCache.get(wikiTitle) ?? null)
    return
  }
  if (!pendingCbs.has(wikiTitle)) pendingCbs.set(wikiTitle, [])
  pendingCbs.get(wikiTitle)!.push(callback)
  scheduleFlush()
}

interface BioAvatarProps {
  profile:    PersonProfile | undefined
  personName: string
  size?:      'sm' | 'md' | 'lg'
  className?: string
  ring?:      boolean
}

export function BioAvatar({ profile, personName, size = 'md', className, ring }: BioAvatarProps) {
  const [photoSrc, setPhotoSrc]     = useState<string | null>(null)
  const [imgFailed, setImgFailed]   = useState(false)

  useEffect(() => {
    if (!profile?.wikiTitle) return
    requestPhoto(profile.wikiTitle, url => setPhotoSrc(url))
  }, [profile?.wikiTitle])

  const sizeClass =
    size === 'lg' ? 'h-24 w-24 text-3xl' :
    size === 'md' ? 'h-12 w-12 text-base' :
    'h-10 w-10 text-sm'

  const initials = profile ? profile.initials : personName.slice(0, 2).toUpperCase()

  const gradStyle = profile
    ? { background: `linear-gradient(135deg, ${profile.gradient[0]} 0%, ${profile.gradient[1]} 100%)` }
    : { background: 'linear-gradient(135deg, #312e81 0%, #4338ca 100%)' }

  const ringClass = ring ? 'ring-4 ring-white/20' : ''

  if (photoSrc && !imgFailed) {
    return (
      <img
        src={photoSrc}
        alt={personName}
        className={cn(sizeClass, 'rounded-full object-cover object-top shadow-xl', ringClass, className)}
        onError={() => setImgFailed(true)}
      />
    )
  }

  return (
    <div
      className={cn(
        sizeClass,
        'flex flex-shrink-0 items-center justify-center rounded-full font-black text-white shadow-xl',
        ringClass,
        className,
      )}
      style={gradStyle}
    >
      {initials}
    </div>
  )
}

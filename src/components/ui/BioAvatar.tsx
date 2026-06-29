import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { PersonProfile } from '@/data/biographyProfiles'

// Module-level cache — avoids re-fetching the same title across card instances
const photoCache = new Map<string, string | null>()

async function fetchWikiPhoto(wikiTitle: string): Promise<string | null> {
  if (photoCache.has(wikiTitle)) return photoCache.get(wikiTitle) ?? null
  try {
    const r = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`
    )
    if (!r.ok) { photoCache.set(wikiTitle, null); return null }
    const d: { thumbnail?: { source?: string } } = await r.json()
    const src = d.thumbnail?.source
    // Scale Wikimedia thumbnail to 400px for crisp display
    const url = src ? src.replace(/\/\d+px-/, '/400px-') : null
    photoCache.set(wikiTitle, url)
    return url
  } catch {
    photoCache.set(wikiTitle, null)
    return null
  }
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
    const cached = photoCache.get(profile.wikiTitle)
    if (cached !== undefined) { setPhotoSrc(cached); return }
    fetchWikiPhoto(profile.wikiTitle).then(url => setPhotoSrc(url))
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

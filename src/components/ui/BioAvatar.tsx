import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { PersonProfile } from '@/data/biographyProfiles'

interface BioAvatarProps {
  profile:    PersonProfile | undefined
  personName: string
  size?:      'sm' | 'md' | 'lg'
  className?: string
  ring?:      boolean
}

export function BioAvatar({ profile, personName, size = 'md', className, ring }: BioAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false)

  const sizeClass =
    size === 'lg' ? 'h-24 w-24 text-3xl' :
    size === 'md' ? 'h-12 w-12 text-base' :
    'h-10 w-10 text-sm'

  const initials = profile ? profile.initials : personName.slice(0, 2).toUpperCase()

  const gradStyle = profile
    ? { background: `linear-gradient(135deg, ${profile.gradient[0]} 0%, ${profile.gradient[1]} 100%)` }
    : { background: 'linear-gradient(135deg, #312e81 0%, #4338ca 100%)' }

  const ringClass = ring ? 'ring-4 ring-white/20' : ''

  if (profile?.photoUrl && !imgFailed) {
    return (
      <img
        src={profile.photoUrl}
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

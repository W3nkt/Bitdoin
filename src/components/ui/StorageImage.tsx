import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface StorageImageProps {
  src: string
  alt: string
  className?: string
}

function extractStoragePath(url: string): { bucket: string; path: string } | null {
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/?]+)\/(.+?)(?:\?|$)/)
  if (!match) return null
  return { bucket: match[1], path: match[2] }
}

export function StorageImage({ src, alt, className }: StorageImageProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [broken, setBroken] = useState(false)
  const attempted = useRef(false)

  async function handleError() {
    if (attempted.current) { setBroken(true); return }
    attempted.current = true
    const info = extractStoragePath(src)
    if (!info) { setBroken(true); return }
    try {
      const { data } = await supabase.storage
        .from(info.bucket)
        .createSignedUrl(info.path, 3600)
      if (data?.signedUrl) {
        setImgSrc(data.signedUrl)
      } else {
        setBroken(true)
      }
    } catch {
      setBroken(true)
    }
  }

  if (broken) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-gray-400 text-xs ${className ?? ''}`}>
        {alt}
      </div>
    )
  }

  return <img src={imgSrc} alt={alt} className={className} onError={handleError} />
}

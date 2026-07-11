import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface StorageImageProps {
  src: string
  alt: string
  className?: string
  bucket?: string
}

function extractStoragePath(url: string): { bucket: string; path: string } | null {
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/?]+)\/(.+?)(?:\?|$)/)
  if (!match) return null
  return { bucket: decodeURIComponent(match[1]), path: decodeURIComponent(match[2]) }
}

function isRemoteUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith('blob:') || value.startsWith('data:')
}

export function StorageImage({ src, alt, className, bucket }: StorageImageProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [broken, setBroken] = useState(false)
  const attempted = useRef(false)

  useEffect(() => {
    attempted.current = false
    setBroken(false)

    if (!bucket || isRemoteUrl(src)) {
      setImgSrc(src)
      return
    }

    supabase.storage
      .from(bucket)
      .createSignedUrl(src, 3600)
      .then(({ data, error }) => {
        if (error || !data?.signedUrl) setBroken(true)
        else setImgSrc(data.signedUrl)
      })
      .catch(() => setBroken(true))
  }, [bucket, src])

  async function handleError() {
    if (attempted.current) { setBroken(true); return }
    attempted.current = true
    const info = extractStoragePath(src) ?? (bucket && !isRemoteUrl(src) ? { bucket, path: src } : null)
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

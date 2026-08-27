import { useEffect } from 'react'

interface SeoMetaOptions {
  title: string
  description: string
  canonicalPath?: string
}

function upsertMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Sets document.title, the meta description, and the canonical link.
 * Later calls (e.g. a specific page mounting after the route-level default)
 * simply overwrite the previous values — no restore-on-unmount is needed
 * because every route change re-runs the route-level default first.
 */
export function useSeoMeta({ title, description, canonicalPath }: SeoMetaOptions) {
  useEffect(() => {
    document.title = title
    upsertMeta('description', description)
    if (canonicalPath) upsertCanonical(`https://bitdoin.store${canonicalPath}`)
  }, [title, description, canonicalPath])
}

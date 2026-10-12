// Web Push handlers, loaded into the Workbox service worker via
// workbox.importScripts in vite.config.ts. Messages come from the send-push
// edge function as JSON: { title, body, url, tag, image? }.

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }

  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    // Same tag replaces the previous notification instead of stacking.
    tag: data.tag || 'bitdoin',
    renotify: Boolean(data.tag),
    data: { url: data.url || '/' },
  }
  if (data.image) options.image = data.image

  event.waitUntil(self.registration.showNotification(data.title || 'Bitdoin', options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  // Only open pages on this site.
  const target = new URL(event.notification.data?.url || '/', self.location.origin)
  const url = target.origin === self.location.origin ? target.href : self.location.origin + '/'

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        await client.focus()
        if ('navigate' in client) return client.navigate(url)
        return client
      }
    }
    return self.clients.openWindow(url)
  })())
})

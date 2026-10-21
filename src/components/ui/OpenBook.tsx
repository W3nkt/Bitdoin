import { createLucideIcon } from 'lucide-react'

/**
 * Bitdoin's open-book icon, used everywhere in place of lucide's BookOpen: a wide book seen from the front,
 * pages curling up at the outer corners, flared covers and a heavy curved base at the spine.
 * Built with createLucideIcon, so it takes the same props as any lucide icon (size, strokeWidth, className…).
 */
export const OpenBook = createLucideIcon('OpenBook', [
  ['path', { d: 'M12 7.6C10.2 5.7 7.6 4.9 5 5.2L3.8 15.2C7.1 15 10 15.8 12 17.4', key: 'left-page' }],
  ['path', { d: 'M12 7.6C13.8 5.7 16.4 4.9 19 5.2L20.2 15.2C16.9 15 14 15.8 12 17.4', key: 'right-page' }],
  ['path', { d: 'M12 7.6V17.4', key: 'spine' }],
  ['path', { d: 'M3.3 7.2 1.8 17.4C5.8 17.3 9.2 18 11 19.3Q12 20 13 19.3C14.8 18 18.2 17.3 22.2 17.4L20.7 7.2', key: 'cover' }],
  ['path', { d: 'M1.8 17.4C5.8 17.3 9.2 18 11 19.3Q12 20 13 19.3C14.8 18 18.2 17.3 22.2 17.4L22.4 18.7C18.5 18.6 15.1 19.3 13.3 20.5Q12 21.3 10.7 20.5C8.9 19.3 5.5 18.6 1.6 18.7Z', fill: 'currentColor', key: 'base' }],
])

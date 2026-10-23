// Offline drafts, the submission queue (SCORE-005) and the last loaded
// dashboard for offline viewing (DASH-006).
//
// Stored in IndexedDB, scoped to the signed-in account: every key starts
// with the user id, records of other accounts are purged when the module
// opens, and the whole database is deleted on sign-out (AuthContext) so a
// shared phone never shows someone else's scores. Without IndexedDB
// (private mode, old browsers) drafts live in memory and on the server.

import type { LineStatus } from './scoreInput'

export const DRAFT_DB_NAME = 'bitdoin-my-scores'
const VERSION = 2

export interface DraftLine {
  status: LineStatus | null
  text: string
}

export interface LocalDraft {
  key: string
  userId: string
  enrolmentId: string
  periodId: string
  lines: Record<string, DraftLine>
  /** True once the server holds the same values. */
  synced: boolean
  updatedAt: number
}

export interface QueuedSubmit {
  key: string
  userId: string
  enrolmentId: string
  periodId: string
  idempotencyKey: string
  lines: { subject_enrolment_id: string; status: LineStatus; value?: string }[]
  createdAt: number
}

export const draftKey = (userId: string, enrolmentId: string, periodId: string) => `${userId}:${enrolmentId}:${periodId}`

export interface CachedValue<T = unknown> {
  key: string
  userId: string
  value: T
  savedAt: number
}

const memory = { drafts: new Map<string, LocalDraft>(), queue: new Map<string, QueuedSubmit>(), cache: new Map<string, CachedValue>() }
let opening: Promise<IDBDatabase | null> | null = null

function open(): Promise<IDBDatabase | null> {
  if (opening) return opening
  opening = new Promise(resolve => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null)
      const request = indexedDB.open(DRAFT_DB_NAME, VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'key' })
        if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'key' })
        // v2: last loaded read models (dashboard) for offline viewing.
        if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache', { keyPath: 'key' })
      }
      request.onsuccess = () => {
        const db = request.result
        // Let a sign-out elsewhere delete the database.
        db.onversionchange = () => { db.close(); opening = null }
        resolve(db)
      }
      request.onerror = () => resolve(null)
      request.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return opening
}

type StoreName = 'drafts' | 'queue' | 'cache'

async function run<T>(store: StoreName, mode: IDBTransactionMode, action: (objects: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  const db = await open()
  if (!db) return undefined
  return new Promise(resolve => {
    try {
      const request = action(db.transaction(store, mode).objectStore(store))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(undefined)
    } catch {
      resolve(undefined)
    }
  })
}

async function all<T extends { userId: string }>(store: StoreName): Promise<T[]> {
  const rows = await run<T[]>(store, 'readonly', objects => objects.getAll() as IDBRequest<T[]>)
  return rows ?? ([...memory[store].values()] as unknown as T[])
}

export async function loadDraft(key: string): Promise<LocalDraft | undefined> {
  return (await run<LocalDraft>('drafts', 'readonly', objects => objects.get(key))) ?? memory.drafts.get(key)
}

export async function saveDraft(draft: LocalDraft) {
  memory.drafts.set(draft.key, draft)
  await run('drafts', 'readwrite', objects => objects.put(draft))
}

export async function deleteDraft(key: string) {
  memory.drafts.delete(key)
  await run('drafts', 'readwrite', objects => objects.delete(key))
}

export async function enqueueSubmit(item: QueuedSubmit) {
  memory.queue.set(item.key, item)
  await run('queue', 'readwrite', objects => objects.put(item))
}

export async function dequeueSubmit(key: string) {
  memory.queue.delete(key)
  await run('queue', 'readwrite', objects => objects.delete(key))
}

export async function queuedSubmits(userId: string) {
  return (await all<QueuedSubmit>('queue')).filter(item => item.userId === userId)
}

export async function saveCached<T>(entry: CachedValue<T>) {
  memory.cache.set(entry.key, entry)
  await run('cache', 'readwrite', objects => objects.put(entry))
}

export async function loadCached<T>(key: string, userId: string): Promise<CachedValue<T> | undefined> {
  const entry = (await run<CachedValue<T>>('cache', 'readonly', objects => objects.get(key))) ?? (memory.cache.get(key) as CachedValue<T> | undefined)
  return entry?.userId === userId ? entry : undefined
}

/** Removes anything that belongs to another account on this device. */
export async function purgeOtherAccounts(userId: string) {
  for (const store of ['drafts', 'queue', 'cache'] as const) {
    for (const row of await all<{ key: string; userId: string }>(store)) {
      if (row.userId !== userId) {
        memory[store].delete(row.key)
        await run(store, 'readwrite', objects => objects.delete(row.key))
      }
    }
  }
}

/** Called on sign-out: removes every local draft and queued submission. */
export function clearAllDrafts() {
  memory.drafts.clear()
  memory.queue.clear()
  memory.cache.clear()
  opening = null
  try {
    if (typeof indexedDB !== 'undefined') indexedDB.deleteDatabase(DRAFT_DB_NAME)
  } catch {
    // Nothing stored, or storage blocked.
  }
}

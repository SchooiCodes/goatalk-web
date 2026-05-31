import { openDB, type IDBPDatabase } from 'idb'
import type { LocalIdentity, Rant, Note } from '../types'

export interface GoatalkDB {
  identity: { key: string; value: unknown }
  rants: { key: string; value: Rant; indexes: { 'by-created': string } }
  pendingSync: { key: string; value: { id: string; createdAt: string; retries: number }; indexes: { 'by-created': string } }
  audio: { key: string; value: ArrayBuffer }
  notes: { key: string; value: Note }
}

let dbPromise: Promise<IDBPDatabase<GoatalkDB>> | null = null

export async function getDb(): Promise<IDBPDatabase<GoatalkDB>> {
  if (dbPromise) return dbPromise
  dbPromise = openDB<GoatalkDB>('goatalk', 4, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('identity')
        const store = db.createObjectStore('rants', { keyPath: 'id' })
        store.createIndex('by-created', 'createdAt')
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('pendingSync')) {
          const store = db.createObjectStore('pendingSync', { keyPath: 'id' })
          store.createIndex('by-created', 'createdAt')
        }
      }
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains('audio')) {
          db.createObjectStore('audio')
        }
      }
      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains('notes')) {
          db.createObjectStore('notes', { keyPath: 'id' })
        }
      }
    },
  })
  return dbPromise
}

export async function getLocalIdentity(): Promise<LocalIdentity | null> {
  const db = await getDb()
  return (await db.get('identity', 'user')) as LocalIdentity | null
}

export async function saveLocalIdentity(identity: LocalIdentity): Promise<void> {
  const db = await getDb()
  await db.put('identity', identity, 'user')
}

export async function clearIdentity(): Promise<void> {
  const db = await getDb()
  await db.delete('identity', 'user')
  await db.delete('identity', 'sharedKey')
}

export async function saveSharedKey(key: CryptoKey): Promise<void> {
  const db = await getDb()
  const raw = await crypto.subtle.exportKey('raw', key)
  await db.put('identity', raw, 'sharedKeyRaw')
}

export async function getSharedKey(): Promise<CryptoKey | null> {
  const db = await getDb()
  const raw = await db.get('identity', 'sharedKeyRaw') as ArrayBuffer | undefined
  if (!raw) {
    // Fallback: try old base64 format
    const old = await db.get('identity', 'sharedKey') as string | undefined
    if (old) {
      const binary = atob(old)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const key = await crypto.subtle.importKey('raw', bytes, 'AES-GCM', true, ['encrypt', 'decrypt'])
      await db.put('identity', bytes.buffer as ArrayBuffer, 'sharedKeyRaw')
      await db.delete('identity', 'sharedKey')
      return key
    }
    return null
  }
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt'])
}

export async function saveLastSyncedAt(): Promise<void> {
  const db = await getDb()
  await db.put('identity', new Date().toISOString(), 'lastSyncedAt')
}

export async function getLastSyncedAt(): Promise<string | null> {
  const db = await getDb()
  return (await db.get('identity', 'lastSyncedAt')) as string | null
}

export async function insertRant(rant: Rant): Promise<void> {
  const db = await getDb()
  await db.put('rants', rant)
}

export async function getRants(): Promise<Rant[]> {
  const db = await getDb()
  const rants = await db.getAllFromIndex('rants', 'by-created')
  return rants.reverse()
}

export async function getRantById(id: string): Promise<Rant | undefined> {
  const db = await getDb()
  return db.get('rants', id)
}

export async function updateRant(id: string, updates: Partial<Rant>): Promise<void> {
  const db = await getDb()
  const rant = await db.get('rants', id)
  if (!rant) return
  await db.put('rants', { ...rant, ...updates })
}

export async function deleteRant(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('rants', id)
}

export async function insertNote(note: Note): Promise<void> {
  const db = await getDb()
  await db.put('notes', note)
}

export async function getNotes(): Promise<Note[]> {
  const db = await getDb()
  return db.getAll('notes')
}

export async function getNoteById(id: string): Promise<Note | undefined> {
  const db = await getDb()
  return db.get('notes', id)
}

export async function deleteNoteFromDb(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('notes', id)
}

export async function markListened(rantId: string, progress: number): Promise<void> {
  await updateRant(rantId, { listenedAt: new Date().toISOString(), listenProgress: progress })
}

export async function editTranscript(rantId: string, transcript: string): Promise<void> {
  await updateRant(rantId, { editedTranscript: transcript })
}

export async function addReaction(rantId: string, emoji: string): Promise<void> {
  const rant = await getRantById(rantId)
  if (!rant) return
  await updateRant(rantId, {
    reactions: [...rant.reactions, { emoji, createdAt: new Date().toISOString() }],
  })
}

export async function removeReactionByEmoji(rantId: string, emoji: string): Promise<void> {
  const rant = await getRantById(rantId)
  if (!rant) return
  await updateRant(rantId, {
    reactions: rant.reactions.filter((r) => r.emoji !== emoji),
  })
}

export async function addTag(rantId: string, tag: string): Promise<void> {
  const rant = await getRantById(rantId)
  if (!rant || rant.tags.includes(tag)) return
  await updateRant(rantId, { tags: [...rant.tags, tag] })
}

export async function addPending(id: string): Promise<void> {
  const db = await getDb()
  const exists = await db.get('pendingSync', id)
  if (exists) return
  await db.put('pendingSync', { id, createdAt: new Date().toISOString(), retries: 0 })
}

export async function removePending(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('pendingSync', id)
}

export async function getPending(): Promise<string[]> {
  const db = await getDb()
  const items = await db.getAllFromIndex('pendingSync', 'by-created')
  return items.map((i) => i.id)
}

export async function incrementPendingRetry(id: string): Promise<void> {
  const db = await getDb()
  const item = await db.get('pendingSync', id)
  if (!item) return
  await db.put('pendingSync', { ...item, retries: item.retries + 1 })
}

export async function getPendingCount(): Promise<number> {
  const db = await getDb()
  const items = await db.getAllFromIndex('pendingSync', 'by-created')
  return items.length
}

export async function getAudioSize(): Promise<number> {
  const db = await getDb()
  const keys = await db.getAllKeys('audio')
  let total = 0
  for (const key of keys) {
    const blob = await db.get('audio', key)
    if (blob) total += (blob as ArrayBuffer).byteLength
  }
  return total
}

export async function clearAudioStore(): Promise<void> {
  const db = await getDb()
  await db.clear('audio')
}

export interface DeviceInfo {
  id: string
  name: string
  lastSeen: string
  createdAt: string
}

export async function getDeviceId(): Promise<string> {
  const db = await getDb()
  let id = await db.get('identity', 'deviceId') as string | undefined
  if (!id) {
    id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    await db.put('identity', id, 'deviceId')
  }
  return id
}

export async function saveDeviceName(name: string): Promise<void> {
  const db = await getDb()
  await db.put('identity', name, 'deviceName')
}

export async function getDeviceName(): Promise<string | null> {
  const db = await getDb()
  return (await db.get('identity', 'deviceName')) as string | null
}

export async function saveDevices(devices: DeviceInfo[]): Promise<void> {
  const db = await getDb()
  await db.put('identity', devices, 'devices')
}

export async function getDevices(): Promise<DeviceInfo[]> {
  const db = await getDb()
  return (await db.get('identity', 'devices')) as DeviceInfo[] || []
}
export async function saveProfileEmoji(emoji: string): Promise<void> {
  const db = await getDb()
  await db.put('identity', emoji, 'profileEmoji')
}

export async function getProfileEmoji(): Promise<string | null> {
  const db = await getDb()
  return (await db.get('identity', 'profileEmoji')) as string | null
}

export async function savePartnerProfileEmoji(emoji: string): Promise<void> {
  const db = await getDb()
  await db.put('identity', emoji, 'partnerProfileEmoji')
}

export async function getPartnerProfileEmoji(): Promise<string | null> {
  const db = await getDb()
  return (await db.get('identity', 'partnerProfileEmoji')) as string | null
}

export function isImageDataUri(value: string): boolean {
  return value.startsWith('data:image/')
}

export async function resizeImage(file: File, maxSize = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > height) { if (width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize } }
      else { if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize } }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#FFF5F5'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

export async function resetAllData(): Promise<void> {
  dbPromise = null
  indexedDB.deleteDatabase('goatalk')
}

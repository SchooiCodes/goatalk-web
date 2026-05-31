import { getRantById, removePending, getPending, incrementPendingRetry, getPendingCount as dbGetPendingCount } from './database'
import type { DeviceInfo } from './database'
import { saveAudioFromBase64, loadAudio } from './audio'
import { encryptRantPackage, decryptRantPackage } from './crypto'
import type { Rant, RantPackage, NotePackage } from '../types'

const API_BASE = '/api'
const CONCURRENCY = 5

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function buildRantPackage(rant: Rant, audioBase64: string): RantPackage {
  return {
    version: 1,
    transcript: rant.transcript,
    editedTranscript: rant.editedTranscript,
    durationSec: rant.durationSec,
    senderName: rant.senderName || '',
    tags: rant.tags,
    reactions: rant.reactions,
    createdAt: rant.createdAt,
    audioBase64,
    listenedAt: rant.listenedAt,
    listenProgress: rant.listenProgress,
  }
}

async function pullRantBatch<T>(
  ids: { id: string }[],
  fetcher: (id: string) => Promise<T | null>,
): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(batch.map((item) => fetcher(item.id)))
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value) results.push(r.value)
    }
  }
  return results
}

export async function pushRant(rant: Rant, pairingCodeHash: string, sharedKey: CryptoKey): Promise<void> {
  const audioBlob = await loadAudio(rant.audioKey)
  const audioBase64 = await blobToBase64(audioBlob)
  const pkg = buildRantPackage(rant, audioBase64)
  const encrypted = await encryptRantPackage(JSON.stringify(pkg), sharedKey)

  const res = await fetch(`${API_BASE}/rants?id=${rant.id}`, {
    method: 'POST',
    body: encrypted,
    headers: { 'X-Pairing-Hash': pairingCodeHash },
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
}

export async function pullRants(pairingCodeHash: string, sharedKey: CryptoKey, existingIds: Set<string>, myDisplayName: string): Promise<Rant[]> {
  let list: Array<{ id: string }> = []
  try {
    const res = await fetch(`${API_BASE}/rants`, {
      headers: { 'X-Pairing-Hash': pairingCodeHash },
    })
    if (!res.ok) return []
    list = await res.json()
  } catch {
    return []
  }
  const toFetch = list.filter((item) => !existingIds.has(item.id))

  return pullRantBatch(toFetch, async (id) => {
    try {
      const blobRes = await fetch(`${API_BASE}/rants/${id}`, {
        headers: { 'X-Pairing-Hash': pairingCodeHash },
      })
      if (!blobRes.ok) return null
      const encrypted = await blobRes.arrayBuffer()
      const json = await decryptRantPackage(encrypted, sharedKey)
      const pkg: RantPackage = JSON.parse(json)
      const audioKey = await saveAudioFromBase64(pkg.audioBase64)
      const isMine = pkg.senderName === myDisplayName
      // Fetch read status
      let listenedAt = null
      let listenProgress = 0
      try {
        const readRes = await fetch(`${API_BASE}/rants/${id}/read`, {
          headers: { 'X-Pairing-Hash': pairingCodeHash },
        })
        if (readRes.ok) {
          const data = await readRes.json()
          if (data.read) { listenedAt = data.timestamp; listenProgress = 1 }
        }
      } catch {}
      return {
        id,
        direction: (isMine ? 'sent' : 'received') as 'sent' | 'received',
        senderName: pkg.senderName,
        audioKey,
        transcript: pkg.transcript,
        editedTranscript: pkg.editedTranscript,
        durationSec: pkg.durationSec,
        listenedAt,
        listenProgress,
        tags: pkg.tags,
        reactions: pkg.reactions,
        createdAt: pkg.createdAt,
      }
    } catch {
      return null
    }
  })
}

export async function syncAllPending(pairingCodeHash: string, sharedKey: CryptoKey): Promise<void> {
  const pendingIds = await getPending()
  for (const id of pendingIds) {
    const rant = await getRantById(id)
    if (!rant) { await removePending(id); continue }
    try {
      await pushRant(rant, pairingCodeHash, sharedKey)
      await removePending(id)
    } catch {
      await incrementPendingRetry(id)
    }
  }
}

export async function getPendingCount(): Promise<number> {
  return dbGetPendingCount()
}

export async function pushProfile(pairingCodeHash: string, sharedKey: CryptoKey, displayName: string, emoji: string): Promise<void> {
  const pkg = JSON.stringify({ emoji })
  const encrypted = await encryptRantPackage(pkg, sharedKey)
  const res = await fetch(`${API_BASE}/profile?name=${encodeURIComponent(displayName)}`, {
    method: 'POST',
    body: encrypted,
    headers: { 'X-Pairing-Hash': pairingCodeHash },
  })
  if (!res.ok) throw new Error(`Profile upload failed: ${res.status}`)
}

export async function deleteRantFromServer(pairingCodeHash: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/rants/${id}`, {
    method: 'DELETE',
    headers: { 'X-Pairing-Hash': pairingCodeHash },
  })
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
}

export async function pushNote(note: { id: string; text: string; color: string; createdAt: string }, pairingCodeHash: string, sharedKey: CryptoKey): Promise<void> {
  const pkg: NotePackage = { text: note.text, color: note.color, createdAt: note.createdAt }
  const encrypted = await encryptRantPackage(JSON.stringify(pkg), sharedKey)
  const res = await fetch(`${API_BASE}/notes?id=${note.id}`, {
    method: 'POST',
    body: encrypted,
    headers: { 'X-Pairing-Hash': pairingCodeHash },
  })
  if (!res.ok) throw new Error(`Note upload failed: ${res.status}`)
}

export async function pullNotes(pairingCodeHash: string, sharedKey: CryptoKey, existingIds: Set<string>): Promise<Array<{ id: string } & NotePackage>> {
  let list: Array<{ id: string }> = []
  try {
    const res = await fetch(`${API_BASE}/notes`, {
      headers: { 'X-Pairing-Hash': pairingCodeHash },
    })
    if (!res.ok) return []
    list = await res.json()
  } catch {
    return []
  }
  const toFetch = list.filter((item) => !existingIds.has(item.id))
  const results: Array<{ id: string } & NotePackage> = []
  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const batch = toFetch.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(batch.map(async (item) => {
      try {
        const blobRes = await fetch(`${API_BASE}/notes/${item.id}`, {
          headers: { 'X-Pairing-Hash': pairingCodeHash },
        })
        if (!blobRes.ok) return null
        const encrypted = await blobRes.arrayBuffer()
        const json = await decryptRantPackage(encrypted, sharedKey)
        return { id: item.id, ...JSON.parse(json) }
      } catch {
        return null
      }
    }))
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value) results.push(r.value)
    }
  }
  return results
}

export async function pullReadStatuses(
  pairingCodeHash: string,
): Promise<Array<{ id: string; listenedAt: string }>> {
  let list: Array<{ id: string }> = []
  try {
    const res = await fetch(`${API_BASE}/rants`, {
      headers: { 'X-Pairing-Hash': pairingCodeHash },
    })
    if (!res.ok) return []
    list = await res.json()
  } catch {
    return []
  }
  const results = await pullRantBatch(list, async (id) => {
    try {
      const rs = await fetch(`${API_BASE}/rants/${id}/read`, {
        headers: { 'X-Pairing-Hash': pairingCodeHash },
      })
      if (rs.ok) {
        const data = await rs.json()
        if (data.read) return { id, listenedAt: data.timestamp }
      }
    } catch {}
    return null
  })
  return results.filter(Boolean) as Array<{ id: string; listenedAt: string }>
}

export async function pushReadStatus(pairingCodeHash: string, id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/rants/${id}/read`, {
      method: 'POST',
      headers: { 'X-Pairing-Hash': pairingCodeHash },
    })
  } catch {}
}

export async function registerDevice(pairingCodeHash: string, deviceId: string, deviceName: string): Promise<void> {
  const res = await fetch(`${API_BASE}/devices`, {
    method: 'POST',
    body: JSON.stringify({ id: deviceId, name: deviceName }),
    headers: { 'X-Pairing-Hash': pairingCodeHash, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Device registration failed: ${res.status}`)
}

export async function deviceHeartbeat(pairingCodeHash: string, deviceId: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/devices/${deviceId}/heartbeat`, {
      method: 'POST',
      headers: { 'X-Pairing-Hash': pairingCodeHash },
    })
  } catch {}
}

export async function pullDeviceInfos(pairingCodeHash: string): Promise<DeviceInfo[]> {
  try {
    const res = await fetch(`${API_BASE}/devices`, {
      headers: { 'X-Pairing-Hash': pairingCodeHash },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function renameDeviceOnServer(pairingCodeHash: string, deviceId: string, name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
    headers: { 'X-Pairing-Hash': pairingCodeHash, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Rename device failed: ${res.status}`)
}

export async function unregisterDeviceOnServer(pairingCodeHash: string, deviceId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}`, {
    method: 'DELETE',
    headers: { 'X-Pairing-Hash': pairingCodeHash },
  })
  if (!res.ok) throw new Error(`Unregister device failed: ${res.status}`)
}

export async function pullProfile(pairingCodeHash: string, sharedKey: CryptoKey, displayName: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/profile?name=${encodeURIComponent(displayName)}`, {
      headers: { 'X-Pairing-Hash': pairingCodeHash },
    })
    if (!res.ok) return null
    const encrypted = await res.arrayBuffer()
    const json = await decryptRantPackage(encrypted, sharedKey)
    const data = JSON.parse(json)
    return data.emoji || null
  } catch {
    return null
  }
}

import { encryptRantPackage, decryptRantPackage, deriveTransferKey, hashString, exportKeyBase64, importKeyFromBase64 } from './crypto'
import { importSessionBundle } from './database'
import type { LocalIdentity } from '../types'

const API_BASE = '/api'

export interface SessionBundle {
  identity: LocalIdentity
  sharedKeyBase64: string
  profileEmoji: string
  partnerProfileEmoji: string
}

export async function exportSession(identity: LocalIdentity, sharedKey: CryptoKey, profileEmoji: string, partnerProfileEmoji: string, transferCode: string): Promise<string> {
  try {
    const transferHash = await hashString(transferCode)
    const key = await deriveTransferKey(transferCode)
    const sharedKeyBase64 = await exportKeyBase64(sharedKey)
    const bundle: SessionBundle = { identity, sharedKeyBase64, profileEmoji, partnerProfileEmoji }
    const encrypted = await encryptRantPackage(JSON.stringify(bundle), key)

    const res = await fetch(`${API_BASE}/migrate`, {
      method: 'POST',
      body: encrypted,
      headers: { 'X-Transfer-Hash': transferHash },
    })
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText)
      console.error('Export failed:', { status: res.status, error: errorText })
      throw new Error(`Export failed: ${res.status} ${errorText}`)
    }
    return transferCode
  } catch (err) {
    console.error('Export error:', err)
    throw err
  }
}

export async function importSession(transferCode: string): Promise<void> {
  const transferHash = await hashString(transferCode)
  const res = await fetch(`${API_BASE}/migrate`, {
    headers: { 'X-Transfer-Hash': transferHash },
  })
  if (!res.ok) {
    if (res.status === 404) throw new Error('Transfer code not found or already used')
    throw new Error(`Import failed: ${res.status}`)
  }
  const encrypted = await res.arrayBuffer()
  const key = await deriveTransferKey(transferCode)
  const json = await decryptRantPackage(encrypted, key)
  const bundle: SessionBundle = JSON.parse(json)

  const sharedKey = await importKeyFromBase64(bundle.sharedKeyBase64)
  await importSessionBundle({
    identity: bundle.identity,
    sharedKey,
    profileEmoji: bundle.profileEmoji,
    partnerProfileEmoji: bundle.partnerProfileEmoji,
  })
}

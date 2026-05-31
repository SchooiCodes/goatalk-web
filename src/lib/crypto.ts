const encoder = new TextEncoder()
const decoder = new TextDecoder()
const PBKDF2_ITERATIONS = 100000

async function importKey(raw: Uint8Array) {
  return crypto.subtle.importKey('raw', raw as BufferSource, 'PBKDF2', false, ['deriveKey'])
}

async function pbkdf2DeriveKey(keyMaterial: CryptoKey, salt: string, keyUsages: KeyUsage[], extractable = false): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    extractable,
    keyUsages,
  )
}

async function aesEncrypt(key: CryptoKey, data: BufferSource): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)
  return combined.buffer as ArrayBuffer
}

async function aesDecrypt(key: CryptoKey, combined: BufferSource): Promise<ArrayBuffer> {
  const buf = combined instanceof ArrayBuffer ? combined : (combined as ArrayBufferView).buffer as ArrayBuffer
  const bytes = new Uint8Array(buf)
  const iv = bytes.slice(0, 12)
  const data = bytes.slice(12)
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data) as Promise<ArrayBuffer>
}

export async function deriveSharedKey(pairingCode: string): Promise<CryptoKey> {
  const keyMaterial = await importKey(encoder.encode(pairingCode))
  return pbkdf2DeriveKey(keyMaterial, 'goatalk_share', ['encrypt', 'decrypt'], true)
}

export async function deriveTransferKey(transferCode: string): Promise<CryptoKey> {
  const keyMaterial = await importKey(encoder.encode(transferCode))
  return pbkdf2DeriveKey(keyMaterial, 'goatalk_transfer', ['encrypt', 'decrypt'], true)
}

export async function encryptRantPackage(json: string, key: CryptoKey): Promise<ArrayBuffer> {
  return aesEncrypt(key, encoder.encode(json))
}

export async function decryptRantPackage(encrypted: BufferSource, key: CryptoKey): Promise<string> {
  const decrypted = await aesDecrypt(key, encrypted)
  return decoder.decode(decrypted)
}

export async function exportKeyBase64(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key)
  let binary = ''
  for (let i = 0; i < raw.byteLength; i++) binary += String.fromCharCode(new Uint8Array(raw)[i])
  return btoa(binary)
}

export async function importKeyFromBase64(base64: string, extractable = true): Promise<CryptoKey> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return crypto.subtle.importKey('raw', bytes as BufferSource, 'AES-GCM', extractable, ['encrypt', 'decrypt'])
}

export async function hashString(input: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(input))
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

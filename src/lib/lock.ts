const PIN_HASH_KEY = 'goatalk_pin_hash'
const PIN_TIMEOUT_KEY = 'goatalk_pin_timeout'
const HIDE_SENSITIVE_KEY = 'goatalk_hide_sensitive'
const LOCKED_KEY = 'goatalk_locked'

export function getPinHash(): string | null {
  try { return localStorage.getItem(PIN_HASH_KEY) } catch { return null }
}

export function setPinHash(hash: string) {
  localStorage.setItem(PIN_HASH_KEY, hash)
}

export function clearPinHash() {
  localStorage.removeItem(PIN_HASH_KEY)
}

export function hasPin(): boolean {
  return !!getPinHash()
}

export function getPinTimeoutMinutes(): number {
  try { return parseInt(localStorage.getItem(PIN_TIMEOUT_KEY) || '5') } catch { return 5 }
}

export function setPinTimeoutMinutes(minutes: number) {
  localStorage.setItem(PIN_TIMEOUT_KEY, String(minutes))
}

export function isLocked(): boolean {
  return localStorage.getItem(LOCKED_KEY) === 'true'
}

export function setLocked(locked: boolean) {
  if (locked) localStorage.setItem(LOCKED_KEY, 'true')
  else localStorage.removeItem(LOCKED_KEY)
}

export function getHideSensitive(): boolean {
  try { return localStorage.getItem(HIDE_SENSITIVE_KEY) === 'true' } catch { return false }
}

export function setHideSensitive(enabled: boolean) {
  localStorage.setItem(HIDE_SENSITIVE_KEY, enabled ? 'true' : 'false')
}

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import {
  getLocalIdentity, saveLocalIdentity, clearIdentity,
  saveSharedKey, getSharedKey,
  saveProfileEmoji, getProfileEmoji,
  savePartnerProfileEmoji, getPartnerProfileEmoji,
  getDeviceId, getDeviceName, saveDeviceName, saveDevices, getDevices,
  type DeviceInfo,
} from '../lib/database'
import { deriveSharedKey, hashString } from '../lib/crypto'
import { pushProfile, pullProfile, registerDevice, deviceHeartbeat, pullDeviceInfos, renameDeviceOnServer, unregisterDeviceOnServer } from '../lib/sync'
import { exportSession as migrateExport, importSession as migrateImport } from '../lib/migrate'
import type { LocalIdentity } from '../types'
import { PROFILE_EMOJIS } from '../types'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generatePairCode(): string {
  let code = ''
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  for (const b of bytes) code += CODE_CHARS[b % CODE_CHARS.length]
  return code
}

function randomEmoji(): string {
  return PROFILE_EMOJIS[Math.floor(Math.random() * PROFILE_EMOJIS.length)]
}

interface AuthContextType {
  user: LocalIdentity | null
  isPaired: boolean
  isLoading: boolean
  isOnline: boolean
  partnerName: string | null
  sharedKey: CryptoKey | null
  pairingCodeHash: string | null
  profileEmoji: string
  partnerProfileEmoji: string
  generateCode: () => string
  setupPairing: (code: string, displayName: string, partnerName: string) => Promise<void>
  setProfileEmoji: (emoji: string) => Promise<void>
  updateDisplayName: (name: string) => Promise<void>
  updatePartnerName: (name: string) => Promise<void>
  syncPartnerProfile: () => Promise<void>
  exportSession: (transferCode: string) => Promise<string>
  importSession: (transferCode: string) => Promise<void>
  reset: () => Promise<void>
  devices: DeviceInfo[]
  deviceId: string
  deviceName: string
  renameDevice: (id: string, name: string) => Promise<void>
  removeDevice: (id: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalIdentity | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [sharedKey, setSharedKeyState] = useState<CryptoKey | null>(null)
  const [profileEmoji, setProfileEmojiState] = useState('🌸')
  const [partnerProfileEmoji, setPartnerProfileEmojiState] = useState('🦋')
  const [devices, setDevicesState] = useState<DeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState('')
  const [deviceName, setDeviceNameState] = useState('')
  const syncProfileRef = useRef(false)
  const heartbeatRef = useRef(false)

  useEffect(() => {
    getDeviceId().then(setDeviceId)
    getDeviceName().then((n) => setDeviceNameState(n || 'My Device'))
    getDevices().then(setDevicesState)
  }, [])

  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const identity = await getLocalIdentity()
        if (!cancelled && identity && identity.pairingCodeHash) {
          const key = await getSharedKey()
          if (key) {
            if (!cancelled) {
              setSharedKeyState(key)
              setUser(identity)
              const pe = await getProfileEmoji()
              if (pe) setProfileEmojiState(pe)
              else if (identity.profileEmoji) setProfileEmojiState(identity.profileEmoji)
              const ppe = await getPartnerProfileEmoji()
              if (ppe) setPartnerProfileEmojiState(ppe)
              else if (identity.partnerProfileEmoji) setPartnerProfileEmojiState(identity.partnerProfileEmoji)
            }
          }
        }
      } catch {
        // corrupt data — user will see pair page
      }
      if (!cancelled) setIsLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  // Auto-register device on every visit and sync device list
  useEffect(() => {
    if (!user?.pairingCodeHash || !isOnline) return
    let cancelled = false
    ;(async () => {
      try {
        const did = await getDeviceId()
        const dname = await getDeviceName()
        await registerDevice(user.pairingCodeHash, did, dname || 'My Device')
        if (cancelled) return
        const d = await pullDeviceInfos(user.pairingCodeHash)
        if (!cancelled) {
          setDevicesState(d)
          await saveDevices(d)
        }
      } catch {}
    })()
    return () => { cancelled = true }
  }, [user?.pairingCodeHash, isOnline])

  const setupPairing = useCallback(async (code: string, displayName: string, partnerName: string) => {
    const pairingCodeHash = await hashString(code)
    const key = await deriveSharedKey(code)
    const emoji = randomEmoji()
    const identity: LocalIdentity = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      displayName,
      language: navigator.language.startsWith('el') ? 'el' : 'en',
      pairingCodeHash,
      partnerName,
      createdAt: new Date().toISOString(),
      profileEmoji: emoji,
    }
    await saveLocalIdentity(identity)
    await saveProfileEmoji(emoji)
    await saveSharedKey(key)
    setSharedKeyState(key)
    setUser(identity)
    setProfileEmojiState(emoji)
    // Upload profile emoji to KV
    if (isOnline) {
      try { await pushProfile(pairingCodeHash, key, displayName, emoji) } catch {}
    }
    // Auto-register device, then sync list
    try {
      const did = await getDeviceId()
      const dname = await getDeviceName()
      await registerDevice(pairingCodeHash, did, dname || 'My Device')
    } catch {}
    // Re-sync device list so current device shows up immediately
    if (isOnline) {
      try {
        const d = await pullDeviceInfos(pairingCodeHash)
        setDevicesState(d)
        await saveDevices(d)
      } catch {}
    }
  }, [isOnline])

  const setProfileEmoji = useCallback(async (emoji: string) => {
    if (!user || !sharedKey || !user.pairingCodeHash) return
    setProfileEmojiState(emoji)
    await saveProfileEmoji(emoji)
    const updated = { ...user, profileEmoji: emoji }
    await saveLocalIdentity(updated)
    setUser(updated)
    if (isOnline) {
      try { await pushProfile(user.pairingCodeHash, sharedKey, user.displayName, emoji) } catch {}
    }
  }, [user, sharedKey, isOnline])

  const updateDisplayName = useCallback(async (name: string) => {
    if (!user || !sharedKey || !user.pairingCodeHash) return
    const updated = { ...user, displayName: name }
    await saveLocalIdentity(updated)
    setUser(updated)
    if (isOnline) {
      try { await pushProfile(user.pairingCodeHash, sharedKey, name, profileEmoji) } catch {}
    }
  }, [user, sharedKey, isOnline, profileEmoji])

  const updatePartnerName = useCallback(async (name: string) => {
    if (!user) return
    const updated = { ...user, partnerName: name }
    await saveLocalIdentity(updated)
    setUser(updated)
  }, [user])

  const syncDevices = useCallback(async () => {
    if (!user?.pairingCodeHash || !isOnline) return
    try {
      const d = await pullDeviceInfos(user.pairingCodeHash)
      // Self-heal: re-register if current device is missing
      const did = await getDeviceId()
      if (!d.find(dev => dev.id === did)) {
        const dname = await getDeviceName()
        await registerDevice(user.pairingCodeHash, did, dname || 'My Device')
        const refreshed = await pullDeviceInfos(user.pairingCodeHash)
        setDevicesState(refreshed)
        await saveDevices(refreshed)
      } else {
        setDevicesState(d)
        await saveDevices(d)
      }
    } catch {}
  }, [user?.pairingCodeHash, isOnline, deviceId])

  const renameDevice = useCallback(async (id: string, name: string) => {
    if (!user?.pairingCodeHash) return
    const did = await getDeviceId()
    if (id === did) {
      await saveDeviceName(name)
      setDeviceNameState(name)
    }
    try {
      await renameDeviceOnServer(user.pairingCodeHash, id, name)
      await syncDevices()
    } catch {} // silent
  }, [user?.pairingCodeHash, syncDevices])

  const removeDevice = useCallback(async (id: string) => {
    if (!user?.pairingCodeHash) return
    try {
      await unregisterDeviceOnServer(user.pairingCodeHash, id)
      await syncDevices()
    } catch {} // silent
  }, [user?.pairingCodeHash, syncDevices])

  const doHeartbeat = useCallback(async () => {
    if (!user?.pairingCodeHash || !isOnline) return
    if (heartbeatRef.current) return
    heartbeatRef.current = true
    try {
      const did = await getDeviceId()
      await deviceHeartbeat(user.pairingCodeHash, did)
    } catch {} finally {
      heartbeatRef.current = false
    }
  }, [user?.pairingCodeHash, isOnline])

  // Heartbeat every 5 minutes + periodic device list refresh
  useEffect(() => {
    if (!user?.pairingCodeHash || !isOnline) return
    doHeartbeat()
    const heartbeatInterval = setInterval(doHeartbeat, 5 * 60 * 1000)
    const syncInterval = setInterval(syncDevices, 5 * 60 * 1000)
    return () => { clearInterval(heartbeatInterval); clearInterval(syncInterval) }
  }, [user?.pairingCodeHash, isOnline, doHeartbeat, syncDevices])

  // Sync devices on mount
  useEffect(() => {
    if (user?.pairingCodeHash && isOnline) syncDevices()
  }, [user?.pairingCodeHash, isOnline, syncDevices])

  // Re-sync devices when tab becomes visible (another device may have registered)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && user?.pairingCodeHash && isOnline) {
        syncDevices()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [user?.pairingCodeHash, isOnline, syncDevices])

  const syncPartnerProfile = useCallback(async () => {
    if (!user || !sharedKey || !user.pairingCodeHash || !user.partnerName || !isOnline) return
    if (syncProfileRef.current) return
    syncProfileRef.current = true
    try {
      const emoji = await pullProfile(user.pairingCodeHash, sharedKey, user.partnerName)
      if (emoji) {
        setPartnerProfileEmojiState(emoji)
        await savePartnerProfileEmoji(emoji)
        const updated = { ...user, partnerProfileEmoji: emoji }
        await saveLocalIdentity(updated)
        setUser(updated)
      }
    } catch {
      // retry next sync
    } finally {
      syncProfileRef.current = false
    }
    await syncDevices()
  }, [user, sharedKey, isOnline, syncDevices])

  const exportSession = useCallback(async (transferCode: string): Promise<string> => {
    if (!user) throw new Error('Not paired')
    const key = await getSharedKey()
    if (!key) throw new Error('Not paired')
    return migrateExport(user, key, profileEmoji, partnerProfileEmoji, transferCode)
  }, [user, profileEmoji, partnerProfileEmoji])

  const importSession = useCallback(async (transferCode: string): Promise<void> => {
    await migrateImport(transferCode)
  }, [])

  const reset = useCallback(async () => {
    await clearIdentity()
    setSharedKeyState(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isPaired: !!user && !!sharedKey,
        isLoading,
        isOnline,
        partnerName: user?.partnerName ?? null,
        sharedKey,
        pairingCodeHash: user?.pairingCodeHash ?? null,
        profileEmoji,
        partnerProfileEmoji,
        generateCode: generatePairCode,
        setupPairing,
        setProfileEmoji,
        updateDisplayName,
        updatePartnerName,
        syncPartnerProfile,
        exportSession,
        importSession,
        reset,
        devices,
        deviceId,
        deviceName,
        renameDevice,
        removeDevice,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

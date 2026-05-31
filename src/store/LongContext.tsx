import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { getLongs, insertLong, deleteLongFromDb } from '../lib/database'
import { pushLong, pullLongs } from '../lib/sync'
import { useAuth } from './AuthContext'
import type { LongEntry } from '../types'

interface LongContextType {
  longs: LongEntry[]
  loadLongs: () => Promise<void>
  addLong: (title: string, body: string) => Promise<void>
  updateLong: (id: string, title: string, body: string) => Promise<void>
  deleteLong: (id: string) => Promise<void>
}

const LongContext = createContext<LongContextType>(null!)

export function LongProvider({ children }: { children: ReactNode }) {
  const [longs, setLongs] = useState<LongEntry[]>([])
  const longsRef = useRef(longs)
  longsRef.current = longs
  const doSyncRef = useRef(false)
  const { user, sharedKey, pairingCodeHash, isOnline } = useAuth()

  const doSync = useCallback(async () => {
    if (!pairingCodeHash || !sharedKey || !isOnline || !user) return
    if (doSyncRef.current) return
    doSyncRef.current = true
    try {
      const existing = new Set(longsRef.current.map((n) => n.id))
      const fetched = await pullLongs(pairingCodeHash, sharedKey, existing)
      for (const n of fetched) {
        const entry: LongEntry = {
          id: n.id,
          title: n.title,
          body: n.body,
          createdAt: n.createdAt,
          updatedAt: n.createdAt,
        }
        await insertLong(entry)
      }
      if (fetched.length) {
        const all = await getLongs()
        setLongs(all)
      }
    } catch {
    } finally {
      doSyncRef.current = false
    }
  }, [pairingCodeHash, sharedKey, isOnline, user])

  useEffect(() => {
    if (isOnline) doSync()
  }, [isOnline, doSync])

  useEffect(() => {
    const handleVisibility = () => { if (document.visibilityState === 'visible') doSync() }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [doSync])

  const loadLongs = useCallback(async () => {
    const n = await getLongs()
    setLongs(n)
    if (pairingCodeHash && sharedKey && isOnline) await doSync()
  }, [pairingCodeHash, sharedKey, isOnline, doSync])

  const addLong = useCallback(async (title: string, body: string) => {
    if (!user) return
    const now = new Date().toISOString()
    const entry: LongEntry = {
      id: `long_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      title,
      body,
      createdAt: now,
      updatedAt: now,
    }
    await insertLong(entry)
    setLongs((prev) => [entry, ...prev])
    if (sharedKey && pairingCodeHash && isOnline) {
      try { await pushLong(entry, pairingCodeHash, sharedKey) } catch {}
    }
  }, [user, sharedKey, pairingCodeHash, isOnline])

  const updateLong = useCallback(async (id: string, title: string, body: string) => {
    const now = new Date().toISOString()
    const updated: LongEntry = { id, title, body, createdAt: now, updatedAt: now }
    await insertLong(updated)
    setLongs((prev) => prev.map((n) => n.id === id ? updated : n))
    if (sharedKey && pairingCodeHash && isOnline) {
      try { await pushLong(updated, pairingCodeHash, sharedKey) } catch {}
    }
  }, [sharedKey, pairingCodeHash, isOnline])

  const deleteLong = useCallback(async (id: string) => {
    await deleteLongFromDb(id)
    setLongs((prev) => prev.filter((n) => n.id !== id))
    if (pairingCodeHash && isOnline) {
      try {
        await fetch(`/api/longs/${id}`, {
          method: 'DELETE',
          headers: { 'X-Pairing-Hash': pairingCodeHash },
        })
      } catch {}
    }
  }, [pairingCodeHash, isOnline])

  return (
    <LongContext.Provider value={{ longs, loadLongs, addLong, updateLong, deleteLong }}>
      {children}
    </LongContext.Provider>
  )
}

export const useLongs = () => useContext(LongContext)

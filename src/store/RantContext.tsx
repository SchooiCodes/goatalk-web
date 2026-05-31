import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import {
  getRants, getRantById, insertRant, addPending, updateRant,
  editTranscript as editTranscriptDb, markListened as markListenedDb,
  addReaction as dbAddReaction, removeReactionByEmoji as dbRemoveReaction,
  addTag as dbAddTag, deleteRant as deleteRantDb,
} from '../lib/database'
import { saveAudio, deleteAudio } from '../lib/audio'
import { pushRant, pullRants, syncAllPending, pullProfile, pullReadStatuses, deleteRantFromServer } from '../lib/sync'
import { savePartnerProfileEmoji, getPartnerProfileEmoji } from '../lib/database'
import { useAuth } from './AuthContext'
import type { Rant, Reaction } from '../types'

interface RantContextType {
  rants: Rant[]
  selectedRant: Rant | null
  isLoading: boolean
  isSyncing: boolean
  loadRants: () => Promise<void>
  sendRant: (params: { blob: Blob; transcript: string; durationSec: number; tags?: string[] }) => Promise<string | null>
  selectRant: (id: string) => Promise<void>
  editTranscript: (id: string, text: string) => Promise<void>
  markListened: (id: string, progress: number) => Promise<void>
  addReaction: (id: string, emoji: string) => Promise<void>
  removeReaction: (id: string, emoji: string) => Promise<void>
  addTag: (id: string, tag: string) => Promise<void>
  deleteRant: (id: string) => Promise<void>
}

const RantContext = createContext<RantContextType>(null!)

export function RantProvider({ children }: { children: ReactNode }) {
  const [rants, setRants] = useState<Rant[]>([])
  const [selectedRant, setSelectedRant] = useState<Rant | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const isSyncingRef = useRef(false)
  const rantsRef = useRef(rants)
  rantsRef.current = rants
  const { user, sharedKey, pairingCodeHash, isOnline } = useAuth()

  const doSync = useCallback(async () => {
    if (!pairingCodeHash || !sharedKey || !isOnline || !user) return
    if (isSyncingRef.current) return
    isSyncingRef.current = true
    setIsSyncing(true)
    try {
      await syncAllPending(pairingCodeHash, sharedKey)
      // Sync partner profile emoji
      if (user.partnerName) {
        const existing = await getPartnerProfileEmoji()
        const emoji = await pullProfile(pairingCodeHash, sharedKey, user.partnerName)
        if (emoji && emoji !== existing) await savePartnerProfileEmoji(emoji)
      }
      const existing = new Set(rantsRef.current.map((r) => r.id))
      const fetched = await pullRants(pairingCodeHash, sharedKey, existing, user.displayName)
      for (const r of fetched) { await insertRant(r) }
      if (fetched.length) {
        const all = await getRants()
        setRants(all)
      }
      // Sync read statuses for all rants
      const readUpdates = await pullReadStatuses(pairingCodeHash)
      if (readUpdates.length) {
        for (const u of readUpdates) {
          await updateRant(u.id, { listenedAt: u.listenedAt, listenProgress: 1 })
        }
        const all = await getRants()
        setRants(all)
      }
    } catch {
      // retry on next sync
    } finally {
      isSyncingRef.current = false
      setIsSyncing(false)
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

  const loadRants = useCallback(async () => {
    setIsLoading(true)
    try {
      const r = await getRants()
      setRants(r)
      if (pairingCodeHash && sharedKey && isOnline) await doSync()
    } finally {
      setIsLoading(false)
    }
  }, [pairingCodeHash, sharedKey, isOnline, doSync])

  useEffect(() => { loadRants() }, [loadRants])

  const sendRant = useCallback(async ({ blob, transcript, durationSec, tags = [] }: { blob: Blob; transcript: string; durationSec: number; tags?: string[] }) => {
    if (!user) return null
    const id = `rant_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const audioKey = await saveAudio(blob)
    const rant: Rant = {
      id, direction: 'sent', senderName: user.displayName, audioKey,
      transcript, editedTranscript: null, durationSec,
      listenedAt: null, listenProgress: 0, tags, reactions: [],
      createdAt: new Date().toISOString(),
    }
    await insertRant(rant)
    setRants((prev) => [rant, ...prev])

    if (sharedKey && pairingCodeHash && isOnline) {
      try { await pushRant(rant, pairingCodeHash, sharedKey) }
      catch { await addPending(id) }
    } else {
      await addPending(id)
    }
    return id
  }, [user, sharedKey, pairingCodeHash, isOnline])

  const selectRant = useCallback(async (id: string) => {
    const rant = await getRantById(id)
    setSelectedRant(rant ?? null)
  }, [])

  const editTranscript = useCallback(async (id: string, text: string) => {
    await editTranscriptDb(id, text)
    setRants((prev) => prev.map((r) => r.id === id ? { ...r, editedTranscript: text } : r))
    setSelectedRant((prev) => prev?.id === id ? { ...prev, editedTranscript: text } : prev)
  }, [])

  const markListened = useCallback(async (id: string, progress: number) => {
    await markListenedDb(id, progress)
    const now = new Date().toISOString()
    setRants((prev) => prev.map((r) => r.id === id ? { ...r, listenedAt: now, listenProgress: progress } : r))
    setSelectedRant((prev) => prev?.id === id ? { ...prev, listenedAt: now, listenProgress: progress } : prev)
    if (pairingCodeHash && isOnline) {
      try { await fetch(`/api/rants/${id}/read`, { method: 'POST', headers: { 'X-Pairing-Hash': pairingCodeHash } }) } catch {}
    }
  }, [pairingCodeHash, isOnline])

  const addReaction = useCallback(async (id: string, emoji: string) => {
    await dbAddReaction(id, emoji)
    const reaction: Reaction = { emoji, createdAt: new Date().toISOString() }
    setRants((prev) => prev.map((r) => r.id === id ? { ...r, reactions: [...r.reactions, reaction] } : r))
    setSelectedRant((prev) => prev?.id === id ? { ...prev, reactions: [...prev.reactions, reaction] } : prev)
  }, [])

  const removeReaction = useCallback(async (id: string, emoji: string) => {
    await dbRemoveReaction(id, emoji)
    setRants((prev) => prev.map((r) => r.id === id ? { ...r, reactions: r.reactions.filter((e) => e.emoji !== emoji) } : r))
    setSelectedRant((prev) => prev?.id === id ? { ...prev, reactions: prev.reactions.filter((e) => e.emoji !== emoji) } : prev)
  }, [])

  const addTag = useCallback(async (id: string, tag: string) => {
    await dbAddTag(id, tag)
    setRants((prev) => prev.map((r) => r.id === id ? { ...r, tags: [...(r.tags || []), tag] } : r))
    setSelectedRant((prev) => prev?.id === id ? { ...prev, tags: [...(prev.tags || []), tag] } : prev)
  }, [])

const deleteRant = useCallback(async (id: string) => {
    const rant = rants.find((r) => r.id === id)
    if (!rant) return
    await deleteRantDb(id)
    try { await deleteAudio(rant.audioKey) } catch {}
    setRants((prev) => prev.filter((r) => r.id !== id))
    setSelectedRant(null)
    if (pairingCodeHash && isOnline) {
      try { await deleteRantFromServer(pairingCodeHash, id) } catch {}
    }
  }, [rants, pairingCodeHash, isOnline])

  return (
    <RantContext.Provider value={{
      rants, selectedRant, isLoading, isSyncing, loadRants,
      sendRant, selectRant, editTranscript, markListened,
      addReaction, removeReaction, addTag, deleteRant,
    }}>
      {children}
    </RantContext.Provider>
  )
}

export const useRants = () => useContext(RantContext)

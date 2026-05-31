import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { getNotes, insertNote, deleteNoteFromDb } from '../lib/database'
import { pushNote, pullNotes } from '../lib/sync'
import { useAuth } from './AuthContext'
import type { Note } from '../types'

interface NoteContextType {
  notes: Note[]
  loadNotes: () => Promise<void>
  addNote: (text: string, color: string) => Promise<void>
  updateNote: (id: string, text: string, color: string) => Promise<void>
  deleteNote: (id: string) => Promise<void>
}

const NoteContext = createContext<NoteContextType>(null!)

export function NoteProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([])
  const notesRef = useRef(notes)
  notesRef.current = notes
  const doSyncRef = useRef(false)
  const { user, sharedKey, pairingCodeHash, isOnline } = useAuth()

  const doSync = useCallback(async () => {
    if (!pairingCodeHash || !sharedKey || !isOnline || !user) return
    if (doSyncRef.current) return
    doSyncRef.current = true
    try {
      const existing = new Set(notesRef.current.map((n) => n.id))
      const fetched = await pullNotes(pairingCodeHash, sharedKey, existing)
      for (const n of fetched) {
        const note: Note = {
          id: n.id,
          text: n.text,
          color: n.color,
          createdAt: n.createdAt,
          updatedAt: n.createdAt,
        }
        await insertNote(note)
      }
      if (fetched.length) {
        const all = await getNotes()
        setNotes(all)
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

  const loadNotes = useCallback(async () => {
    const n = await getNotes()
    setNotes(n)
    if (pairingCodeHash && sharedKey && isOnline) await doSync()
  }, [pairingCodeHash, sharedKey, isOnline, doSync])

  const addNote = useCallback(async (text: string, color: string) => {
    if (!user) return
    const now = new Date().toISOString()
    const note: Note = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      text,
      color,
      createdAt: now,
      updatedAt: now,
    }
    await insertNote(note)
    setNotes((prev) => [note, ...prev])
    if (sharedKey && pairingCodeHash && isOnline) {
      try { await pushNote(note, pairingCodeHash, sharedKey) } catch {}
    }
  }, [user, sharedKey, pairingCodeHash, isOnline])

  const updateNote = useCallback(async (id: string, text: string, color: string) => {
    const now = new Date().toISOString()
    const updated: Note = { id, text, color, createdAt: now, updatedAt: now }
    await insertNote(updated)
    setNotes((prev) => prev.map((n) => n.id === id ? updated : n))
    if (sharedKey && pairingCodeHash && isOnline) {
      try { await pushNote(updated, pairingCodeHash, sharedKey) } catch {}
    }
  }, [sharedKey, pairingCodeHash, isOnline])

  const deleteNote = useCallback(async (id: string) => {
    await deleteNoteFromDb(id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
    if (pairingCodeHash && isOnline) {
      try {
        await fetch(`/api/notes/${id}`, {
          method: 'DELETE',
          headers: { 'X-Pairing-Hash': pairingCodeHash },
        })
      } catch {}
    }
  }, [pairingCodeHash, isOnline])

  return (
    <NoteContext.Provider value={{ notes, loadNotes, addNote, updateNote, deleteNote }}>
      {children}
    </NoteContext.Provider>
  )
}

export const useNotes = () => useContext(NoteContext)

export interface LocalIdentity {
  id: string
  displayName: string
  language: string
  pairingCodeHash: string | null
  partnerName: string | null
  createdAt: string
  profileEmoji?: string
  partnerProfileEmoji?: string
}

export const PROFILE_EMOJIS = ['🌸', '🎀', '💖', '✨', '🦋', '🌙', '🍡', '🎵', '🌷', '🍰', '🧸', '🌺', '🍭', '💫', '🕊️', '🎧', '🌈', '🍀', '⭐', '💐', '🐱', '🦄', '🍬', '🎶', '💌']

export interface Rant {
  id: string
  direction: 'sent' | 'received'
  senderName: string | null
  audioKey: string
  transcript: string
  editedTranscript: string | null
  durationSec: number
  listenedAt: string | null
  listenProgress: number
  tags: string[]
  reactions: Reaction[]
  createdAt: string
}

export interface Reaction {
  emoji: string
  createdAt: string
}

export interface Note {
  id: string
  text: string
  color: string
  createdAt: string
  updatedAt: string
}

export interface NotePackage {
  text: string
  color: string
  createdAt: string
}

export interface RantPackage {
  version: number
  transcript: string
  editedTranscript: string | null
  durationSec: number
  senderName: string
  tags: string[]
  reactions: Reaction[]
  createdAt: string
  audioBase64: string
  listenedAt: string | null
  listenProgress: number
}

import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../store/AuthContext'
import { useNotes } from '../store/NoteContext'
import Icon from '../components/Icon'
import { getHideSensitive } from '../lib/lock'

const NOTE_COLORS = ['#FFD6DE', '#FF9AA2', '#FF6B6B', '#C3AED6', '#B39DDB', '#9B59B6', '#B5EAD7', '#81ECEC', '#00CEC9', '#FFF5CC', '#FDCB6E', '#F39C12', '#B5D8EB', '#74B9FF', '#0984E3', '#FFDAB9', '#FAB1A0', '#E17055', '#FFB5A0', '#FDA7DF', '#E84393', '#DDA0EE', '#A29BFE', '#6C5CE7', '#B2D8D8', '#00B894', '#00A381', '#FFE4E8', '#F8C8DC', '#D63031', '#C9E68E', '#BADB58', '#7CB342', '#F8BBD0', '#F0A0C0', '#4834D4']

function getTextColor(bg: string): string {
  const hex = bg.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.55 ? '#3D2C2E' : '#FFFFFF'
}

function hashId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

const PREVIEW_LIMIT = 80

export default function BoardPage() {
  const { t } = useTranslation()
  const { isOnline } = useAuth()
  const { notes, loadNotes, addNote, updateNote, deleteNote } = useNotes()
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [color, setColor] = useState(NOTE_COLORS[0])
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hideSensitive = getHideSensitive()

  useEffect(() => { document.title = `${t('board.title')} — GoaTalk`; loadNotes() }, [t, loadNotes])

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, window.innerHeight * 0.5) + 'px'
  }

  const handleOpenAdd = () => {
    setEditId(null)
    setText('')
    setColor(NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)])
    setShowModal(true)
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  const handleOpenEdit = (note: typeof notes[number]) => {
    setEditId(note.id)
    setText(note.text)
    setColor(note.color)
    setShowModal(true)
    setTimeout(() => {
      if (textareaRef.current) {
        autoResize(textareaRef.current)
        textareaRef.current.focus()
      }
    }, 100)
  }

  const handleSave = async () => {
    if (!text.trim()) return
    if (editId) {
      await updateNote(editId, text.trim(), color)
    } else {
      await addNote(text.trim(), color)
    }
    setShowModal(false)
    setText('')
  }

  const handleDelete = async () => {
    if (editId) {
      await deleteNote(editId)
      setShowModal(false)
      setText('')
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    autoResize(e.target)
  }

  return (
    <div className="px-4 md:px-6 pt-4 pb-24 animate-fade-in relative min-h-dvh">
      {/* Floating decorations */}
      <div className="fixed top-40 right-2 text-3xl opacity-10 animate-float pointer-events-none" style={{ animationDelay: '0.3s' }}><Icon emoji="📌" size={28} /></div>
      <div className="fixed top-72 left-1 text-2xl opacity-10 animate-float pointer-events-none" style={{ animationDelay: '1s' }}><Icon emoji="✨" size={24} /></div>
      <div className="fixed bottom-60 right-3 text-3xl opacity-10 animate-float pointer-events-none" style={{ animationDelay: '0.7s' }}><Icon emoji="🎨" size={28} /></div>

      <div className="relative z-10">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">{t('board.title')}</h1>
        {!isOnline && (
          <span className="text-xs font-bold text-[var(--coral)]"><Icon emoji="📡" size={14} /> {t('feed.offline')}</span>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-16">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--pink-light)] to-[var(--lavender-light)] flex items-center justify-center mb-6 shadow-lg">
            <Icon emoji="📋" size={24} />
          </div>
          <p className="text-lg font-extrabold text-[var(--text-primary)] mb-1">{t('board.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {notes.map((note) => {
            const h = hashId(note.id)
            const rot = ((h % 11) - 5) * 0.5
            return (
            <button
              key={note.id}
              onClick={() => { if (hideSensitive && revealedId !== note.id) { setRevealedId(note.id); return }; handleOpenEdit(note) }}
              className="rounded-2xl p-3 text-left min-h-[100px] shadow-md active:scale-[0.97] transition-all hover:shadow-lg flex flex-col"
              style={{
                backgroundColor: note.color,
                transform: `rotate(${rot}deg)`,
                color: getTextColor(note.color),
              }}
            >
              <div className="relative flex-1">
                <p className={`text-sm font-semibold leading-relaxed whitespace-pre-wrap break-words transition-all ${
                  hideSensitive && revealedId !== note.id ? 'blur-sm select-none' : ''
                }`}>
                  {note.text.length > PREVIEW_LIMIT ? note.text.slice(0, PREVIEW_LIMIT) + '…' : note.text}
                </p>
                {hideSensitive && revealedId !== note.id && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--card-glass)]"><Icon emoji="🔍" size={10} /> Reveal</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] font-medium mt-2 opacity-70">
                {new Date(note.createdAt).toLocaleDateString()}
              </p>
            </button>
          )})}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={handleOpenAdd}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-[var(--pink)] to-[var(--pink-dark)] text-white shadow-lg flex items-center justify-center text-3xl active:scale-90 transition-transform z-10 hover:shadow-xl"
        style={{ boxShadow: '0 4px 16px var(--pink-glow)' }}
      >
        +
      </button>

      {/* Modal overlay */}
      {showModal && (
        <div
          className="fixed inset-0 z-20 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="glass rounded-3xl p-6 w-full max-w-lg mx-4 mb-4 sm:mb-0 animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-4">
              {editId ? t('board.edit') || 'Edit Note' : t('board.add')}
            </h2>

            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              placeholder={t('board.placeholder')}
              className="w-full glass rounded-2xl p-4 text-sm font-semibold text-[var(--text-primary)] resize-none outline-none border-2 border-transparent focus:border-[var(--pink)] transition-all mb-4 min-h-[100px]"
              rows={4}
            />

            <div className="flex flex-wrap gap-1.5 mb-3">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all active:scale-90 ${
                    color === c ? 'ring-2 ring-[var(--pink)] ring-offset-2 ring-offset-[var(--card-glass)] scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <label className="w-8 h-8 rounded-full bg-[var(--cream)] flex items-center justify-center cursor-pointer border-2 border-dashed border-[var(--border)] hover:border-[var(--pink)] transition-colors">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute opacity-0 w-0 h-0"
                />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 glass rounded-2xl py-3 font-bold text-sm text-[var(--text-secondary)] active:scale-[0.98] transition-all"
              >
                {t('board.cancel')}
              </button>
              {editId && (
                <button
                  onClick={handleDelete}
                  className="px-4 rounded-2xl py-3 font-bold text-sm bg-[var(--error)] text-white active:scale-[0.98] transition-all"
                >
                  {t('board.delete')}
                </button>
              )}
              <button
                onClick={handleSave}
                className="flex-1 rounded-2xl py-3 font-bold text-sm bg-gradient-to-r from-[var(--pink)] to-[var(--pink-dark)] text-white active:scale-[0.98] transition-all"
              >
                {t('board.save')}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLongs } from '../store/LongContext'
import { useAuth } from '../store/AuthContext'
import Icon from '../components/Icon'
import { getHideSensitive } from '../lib/lock'

export default function LongsPage() {
  const { t } = useTranslation()
  const { isOnline } = useAuth()
  const { longs, loadLongs, addLong, updateLong, deleteLong } = useLongs()
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const hideSensitive = getHideSensitive()

  useEffect(() => { document.title = `${t('longs.title')} — GoaTalk`; loadLongs() }, [t, loadLongs])

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, window.innerHeight * 0.6) + 'px'
  }

  const handleOpenAdd = () => {
    setEditId(null)
    setTitle('')
    setBody('')
    setShowModal(true)
    setTimeout(() => bodyRef.current?.focus(), 100)
  }

  const handleOpenEdit = (entry: typeof longs[number]) => {
    setEditId(entry.id)
    setTitle(entry.title)
    setBody(entry.body)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!body.trim()) return
    if (editId) {
      await updateLong(editId, title.trim(), body.trim())
    } else {
      await addLong(title.trim(), body.trim())
    }
    setShowModal(false)
    setTitle('')
    setBody('')
  }

  const handleDelete = async () => {
    if (editId) {
      await deleteLong(editId)
      setShowModal(false)
      setTitle('')
      setBody('')
    }
  }

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBody(e.target.value)
    autoResize(e.target)
  }

  return (
    <div className="px-4 md:px-6 pt-4 pb-24 animate-fade-in">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">{t('longs.title')}</h1>
        {!isOnline && (
          <span className="text-xs font-bold text-[var(--coral)]"><Icon emoji="📡" size={14} /> {t('feed.offline')}</span>
        )}
      </div>

      {longs.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-16">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--pink-light)] to-[var(--lavender-light)] flex items-center justify-center mb-6 shadow-lg">
            <Icon emoji="📝" size={24} />
          </div>
          <p className="text-lg font-extrabold text-[var(--text-primary)] mb-1">{t('longs.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {longs.map((entry) => {
            const isExpanded = expandedId === entry.id
            const preview = entry.body.length > 200 ? entry.body.slice(0, 200) + '...' : entry.body
            return (
              <div
                key={entry.id}
                className="glass rounded-2xl p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <button
                    onClick={() => {
                      if (hideSensitive && revealedId !== entry.id) { setRevealedId(entry.id); return }
                      setExpandedId(isExpanded ? null : entry.id)
                    }}
                    className="flex-1 text-left"
                  >
                    <div className="relative">
                      <h2 className={`text-base font-extrabold text-[var(--text-primary)] leading-tight transition-all ${
                        hideSensitive && revealedId !== entry.id ? 'blur-sm select-none' : ''
                      }`}>
                        {entry.title || t('longs.untitled')}
                      </h2>
                      {hideSensitive && revealedId !== entry.id && (
                        <span className="absolute inset-0 flex items-center justify-start">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--card-glass)]"><Icon emoji="🔍" size={10} /> Reveal</span>
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-[var(--text-muted)] font-medium whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleOpenEdit(entry)}
                      className="w-7 h-7 rounded-full bg-[var(--card-glass)] flex items-center justify-center hover:bg-[var(--border)] transition-colors"
                      aria-label="Edit"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (hideSensitive && revealedId !== entry.id) { setRevealedId(entry.id); return }
                    setExpandedId(isExpanded ? null : entry.id)
                  }}
                  className="w-full text-left"
                >
                  <p className={`text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap break-words transition-all ${
                    isExpanded ? '' : 'line-clamp-3'
                  } ${hideSensitive && revealedId !== entry.id ? 'blur-sm select-none' : ''}`}>
                    {isExpanded ? entry.body : preview}
                  </p>
                  {entry.body.length > 200 && (
                    <span className="text-xs font-semibold text-[var(--pink)] mt-1.5 inline-block">
                      {isExpanded ? t('longs.showLess') : t('longs.showMore')}
                    </span>
                  )}
                </button>
              </div>
            )
          })}
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
            className="glass rounded-3xl p-6 w-full max-w-lg mx-4 mb-4 sm:mb-0 animate-fade-in-up max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-4">
              {editId ? t('longs.edit') : t('longs.new')}
            </h2>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('longs.titlePlaceholder')}
              className="w-full glass rounded-2xl px-4 py-3 text-sm font-bold text-[var(--text-primary)] outline-none border-2 border-transparent focus:border-[var(--pink)] transition-all mb-3"
            />

            <textarea
              ref={bodyRef}
              value={body}
              onChange={handleBodyChange}
              placeholder={t('longs.bodyPlaceholder')}
              className="w-full glass rounded-2xl p-4 text-sm font-semibold text-[var(--text-primary)] resize-none outline-none border-2 border-transparent focus:border-[var(--pink)] transition-all mb-4 flex-1 min-h-[200px]"
              rows={8}
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 glass rounded-2xl py-3 font-bold text-sm text-[var(--text-secondary)] active:scale-[0.98] transition-all"
              >
                {t('longs.cancel')}
              </button>
              {editId && (
                <button
                  onClick={handleDelete}
                  className="px-4 rounded-2xl py-3 font-bold text-sm bg-[var(--error)] text-white active:scale-[0.98] transition-all"
                >
                  {t('longs.delete')}
                </button>
              )}
              <button
                onClick={handleSave}
                className="flex-1 rounded-2xl py-3 font-bold text-sm bg-gradient-to-r from-[var(--pink)] to-[var(--pink-dark)] text-white active:scale-[0.98] transition-all"
              >
                {t('longs.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

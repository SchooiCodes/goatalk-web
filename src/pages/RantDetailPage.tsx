import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../store/AuthContext'
import { useRants } from '../store/RantContext'
import Avatar from '../components/Avatar'
import AudioPlayer from '../components/AudioPlayer'
import TranscriptEditor from '../components/TranscriptEditor'
import ReactionPicker from '../components/ReactionPicker'
import Icon from '../components/Icon'
import { TAG_COLORS } from '../theme'
import { format } from 'date-fns'
import { enUS, el } from 'date-fns/locale'
import type { Locale } from 'date-fns'

const LOCALE_MAP: Record<string, Locale> = { en: enUS, el }

export default function RantDetailPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { selectedRant, selectRant, editTranscript, markListened, addReaction, removeReaction, deleteRant } = useRants()
  const hasMarkedListened = useRef(false)

  useEffect(() => {
    if (id) selectRant(id)
  }, [id, selectRant])

  useEffect(() => {
    document.title = `${t('rant.title')} — GoaTalk`
  }, [t])

  if (!selectedRant) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[var(--bg)]">
        <span className="w-6 h-6 border-2 border-[var(--pink)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const rant = selectedRant
  const { profileEmoji, partnerProfileEmoji } = useAuth()
  const isSentByMe = rant.direction === 'sent'
  const isListened = !!rant.listenedAt
  const senderName = rant.senderName ?? (isSentByMe ? 'You' : 'Partner')
  const locale = LOCALE_MAP[i18n.language] || enUS
  const date = format(new Date(rant.createdAt), 'MMM d, yyyy, HH:mm', { locale })

  const handleListenProgress = (progress: number) => {
    const threshold = parseInt(localStorage.getItem('goatalk_listen_threshold') || '80') / 100
    if (!isListened && progress > threshold && !hasMarkedListened.current) {
      hasMarkedListened.current = true
      markListened(rant.id, progress)
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--bg)] bg-gradient-to-b from-[var(--bg)] via-[var(--cream)] to-[var(--bg)] px-4 pt-6 pb-8 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => navigate('/feed')}
          className="text-sm font-bold text-[var(--text-muted)] hover:text-[var(--pink)] transition-colors inline-flex items-center gap-1"
        >
          ← {t('common.back')}
        </button>
      </div>

      {/* Header */}
      <div className="glass rounded-3xl p-5 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Avatar
                emoji={isSentByMe ? profileEmoji : partnerProfileEmoji}
                size={48}
                className={`shadow-md ${
                  isSentByMe
                    ? 'bg-gradient-to-br from-[var(--pink-light)] to-[var(--pink)]'
                    : 'bg-gradient-to-br from-[var(--lavender-light)] to-[var(--lavender)]'
                }`}
              />
              <div>
                <p className="font-extrabold text-lg text-[var(--text-primary)]">{senderName}</p>
                <p className="text-xs text-[var(--text-muted)] font-medium">{date}</p>
              </div>
            </div>
            {/* Read/Listen status */}
            {isSentByMe ? (
              <span className={`rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
                isListened
                  ? 'bg-[var(--success-light)] text-[var(--success)]'
                  : 'bg-[var(--coral-light)] text-[var(--coral)] animate-pulse-glow'
              }`}>
                {isListened ? <><Icon emoji="👂" size={12} /> {t('rant.listened')}</> : <><Icon emoji="💝" size={12} /> {t('rant.notListened')}</>}
              </span>
            ) : (
              <span className={`rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
                isListened
                  ? 'bg-[var(--success-light)] text-[var(--success)]'
                  : 'bg-[var(--coral-light)] text-[var(--coral)] animate-pulse-glow'
              }`}>
                {isListened ? <><Icon emoji="👂" size={12} /> {t('rant.listened')}</> : <><Icon emoji="💝" size={12} /> {t('rant.notListened')}</>}
              </span>
            )}
          </div>
      </div>

      {/* Audio player */}
      <div className="mb-4">
        <AudioPlayer
          audioKey={rant.audioKey}
          onListenProgress={handleListenProgress}
        />
        <p className="text-xs text-[var(--text-muted)] text-center mt-2 font-medium">
          <Icon emoji="🎵" size={14} /> {Math.floor(rant.durationSec / 60)}m {rant.durationSec % 60}s
        </p>
      </div>

      {/* Transcript */}
      <div className="mb-4">
        <TranscriptEditor
          transcript={rant.transcript}
          initialEdit={rant.editedTranscript}
          onSave={(text) => editTranscript(rant.id, text)}
          editable={isSentByMe}
        />
      </div>

      {/* Reactions */}
      <div className="mb-4">
        <ReactionPicker
          rant={rant}
          onToggle={(emoji) => {
            const exists = rant.reactions.find((r) => r.emoji === emoji)
            if (exists) removeReaction(rant.id, emoji)
            else addReaction(rant.id, emoji)
          }}
        />
      </div>

      {/* Tags */}
      {rant.tags.length > 0 && (
        <div className="glass rounded-2xl p-4 mb-4 animate-fade-in-up">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">{t('rant.tags')}</p>
          <div className="flex flex-wrap gap-1.5">
            {rant.tags.map((tag, i) => (
              <span
                key={tag}
                className="rounded-full px-3 py-1 text-xs font-bold shadow-sm"
                style={{ backgroundColor: TAG_COLORS[i % TAG_COLORS.length], color: '#3D2C2E' }}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Delete */}
      <button
        onClick={() => {
          if (window.confirm(t('rant.deleteConfirm', 'Delete this rant permanently?'))) {
            deleteRant(rant.id)
            navigate('/feed')
          }
        }}
        className="glass rounded-2xl p-4 w-full text-center font-bold text-[var(--error)] hover:bg-[var(--error-light)] transition-all active:scale-95"
      >
        <Icon emoji="🗑️" size={16} /> {t('rant.delete', 'Delete')}
      </button>
    </div>
  )
}

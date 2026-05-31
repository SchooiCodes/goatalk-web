import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../store/AuthContext'
import Avatar from './Avatar'
import Icon from './Icon'
import { getHideSensitive } from '../lib/lock'
import type { Rant } from '../types'

interface Props {
  rant: Rant
  isSentByMe: boolean
  partnerName: string
  onClick: () => void
}

export default function RantCard({ rant, isSentByMe, partnerName, onClick }: Props) {
  const { t } = useTranslation()
  const { profileEmoji, partnerProfileEmoji } = useAuth()
  const [revealed, setRevealed] = useState(false)
  const isListened = !!rant.listenedAt
  const duration = `${Math.floor(rant.durationSec / 60)}m ${rant.durationSec % 60}s`
  const hasReactions = rant.reactions.length > 0
  const hideSensitive = getHideSensitive()

  return (
    <button
      onClick={onClick}
      className={`w-full glass rounded-2xl p-4 mb-2 text-left active:scale-[0.98] transition-all hover:shadow-lg animate-fade-in-up ${
        isListened ? 'opacity-85' : 'border-l-4 border-l-[var(--unread)]'
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <Avatar
            emoji={isSentByMe ? profileEmoji : partnerProfileEmoji}
            size={32}
            className={isSentByMe ? 'bg-[var(--pink-light)]' : 'bg-[var(--lavender-light)]'}
          />
          <div>
            <span className="text-sm font-bold text-[var(--text-primary)]">
              {isSentByMe ? t('rant.sent') : partnerName}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] ml-2">
              {formatDistance(rant.createdAt, t)}
            </span>
          </div>
        </div>
        {!isSentByMe && (
           <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
            isListened
              ? 'bg-[var(--success-light)] text-[var(--success)]'
              : 'bg-[var(--coral-light)] text-[var(--coral)] animate-pulse-glow'
          }`}>
            {isListened ? <><Icon emoji="👂" size={12} /> {t('rant.heard')}</> : <><Icon emoji="💝" size={12} /> {t('rant.new')}</>}
          </span>
        )}
      </div>

      <div className="ml-10 mb-2">
        {rant.editedTranscript || rant.transcript ? (
          <div className="relative">
            <p className={`text-sm text-[var(--text-primary)] leading-relaxed line-clamp-2 transition-all ${
              hideSensitive && !revealed ? 'blur-sm select-none' : ''
            }`}>
              {rant.editedTranscript || rant.transcript}
            </p>
            {hideSensitive && !revealed && (
              <button
                onClick={(e) => { e.stopPropagation(); setRevealed(true) }}
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
              >
                <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--card-glass)] px-2 py-0.5 rounded-full">
                  <Icon emoji="🔍" size={10} /> Reveal
                </span>
              </button>
            )}
          </div>
         ) : (
          <p className="text-sm text-[var(--text-muted)]"><Icon emoji="🎤" size={14} /> {duration}</p>
        )}
      </div>

      <div className="ml-10 flex justify-between items-center">
        <span className="text-xs text-[var(--text-muted)] font-medium">{duration}</span>
        {hasReactions && (
          <div className="flex items-center gap-0.5">
            {[...new Map(rant.reactions.map((r) => [r.emoji, r])).values()].slice(0, 4).map((r) => (
              <span key={r.emoji} className="text-sm">{r.emoji}</span>
            ))}
            {rant.reactions.length > 4 && (
              <span className="text-[10px] text-[var(--text-muted)] font-bold ml-0.5">
                +{rant.reactions.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

function formatDistance(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMin = Math.floor((now - then) / 60000)
  if (diffMin < 1) return t('rant.justNow')
  if (diffMin < 60) return t('rant.minAgo', { n: diffMin })
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return t('rant.hourAgo', { n: diffHours })
  const diffDays = Math.floor(diffHours / 24)
  return t('rant.dayAgo', { n: diffDays })
}

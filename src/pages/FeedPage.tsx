import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../store/AuthContext'
import { useRants } from '../store/RantContext'
import RantCard from '../components/RantCard'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import { getLastSyncedAt } from '../lib/database'
import type { Rant } from '../types'

export default function FeedPage() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = `${t('feed.title')} — GoaTalk`
  }, [t])

  const navigate = useNavigate()
  const { partnerName, isOnline, user, profileEmoji, partnerProfileEmoji } = useAuth()
  const { rants, isLoading, isSyncing, loadRants } = useRants()
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getLastSyncedAt().then(setLastSynced)
  }, [isSyncing])

  useEffect(() => {
    const el = feedRef.current?.parentElement
    if (!el) return
    const onScroll = () => setShowScrollTop(el.scrollTop > 400)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const handleRantPress = useCallback((rant: Rant) => {
    navigate(`/rant/${rant.id}`)
  }, [navigate])

  return (
    <div className="px-4 pt-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-5 animate-fade-in">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">{t('feed.title')}</h1>
          <p className="flex items-center gap-1 text-xs text-[var(--text-muted)] font-medium mt-0.5">
            <Avatar emoji={profileEmoji} size={16} /> {user?.displayName}
            <Icon emoji="💕" size={14} />
            <Avatar emoji={partnerProfileEmoji} size={16} /> {partnerName || 'Partner'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSyncing && (
            <div className="w-8 h-8 rounded-full bg-[var(--pink-light)] flex items-center justify-center" title="Syncing...">
              <span className="w-4 h-4 border-2 border-[var(--pink)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <button
            onClick={loadRants}
            disabled={isSyncing}
            className="w-8 h-8 rounded-full bg-[var(--lavender-light)] flex items-center justify-center hover:brightness-95 transition-all active:scale-90 disabled:opacity-50"
            title={t('common.refresh')}
            aria-label={t('common.refresh')}
          >
            <Icon emoji="🔄" size={14} />
          </button>
          <div className="bg-gradient-to-r from-[var(--pink-light)] to-[var(--lavender-light)] rounded-full px-4 py-2 shadow-sm">
            <span className="text-sm font-bold text-[var(--pink-dark)]">
              <Icon emoji="💕" size={14} /> {partnerName || 'Partner'}
            </span>
          </div>
        </div>
      </div>

      {/* Offline banner */}
      {!isOnline ? (
        <div className="glass rounded-2xl px-4 py-3 mb-4 text-sm font-semibold text-[var(--coral)] text-center animate-fade-in border border-[var(--coral-light)]">
          <Icon emoji="📡" size={14} /> {t('feed.offline')}
        </div>
      ) : lastSynced && (
        <div className="text-[10px] text-[var(--text-muted)] text-center mb-3 animate-fade-in">
          {t('settings.lastSynced')}: {new Date(lastSynced).toLocaleTimeString()}
        </div>
      )}

      {showScrollTop && (
        <button
          onClick={() => feedRef.current?.parentElement?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-28 right-5 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-[var(--pink)] to-[var(--pink-dark)] text-white shadow-xl flex items-center justify-center active:scale-90 transition-all animate-fade-in"
          aria-label="Scroll to top"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
        </button>
      )}

      {/* Rants */}
      <div ref={feedRef}>
      {rants.length === 0 && !isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center mt-16 animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--pink-light)] to-[var(--lavender-light)] flex items-center justify-center mb-6 shadow-lg">
            <Icon emoji="🐱" size={24} />
          </div>
          <p className="text-lg font-extrabold text-[var(--text-primary)] mb-1">{t('feed.empty')}</p>
          <p className="text-sm text-[var(--text-secondary)]">{t('feed.emptyHint')}</p>
        </div>
      ) : (
        <div className="stagger">
          {rants.map((rant) => (
            <RantCard
              key={rant.id}
              rant={rant}
              isSentByMe={rant.direction === 'sent'}
              partnerName={partnerName || 'Partner'}
              onClick={() => handleRantPress(rant)}
            />
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-3 border-[var(--pink)] border-t-transparent animate-spin" />
            <span className="text-sm font-semibold text-[var(--text-muted)]">{t('common.loading')}</span>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

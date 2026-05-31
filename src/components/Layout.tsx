import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../store/ThemeContext'
import Icon from './Icon'
import type { ReactNode } from 'react'

const ALL_TABS = [
  { path: '/feed', emoji: '🏠', activeEmoji: '🌸', labelKey: 'feed.title' },
  { path: '/record', emoji: '🎤', activeEmoji: '🎙️', labelKey: 'record.title' },
  { path: '/board', emoji: '📋', activeEmoji: '📌', labelKey: 'board.title' },
  { path: '/longs', emoji: '📝', activeEmoji: '✍️', labelKey: 'longs.title' },
  { path: '/calendar', emoji: '📅', activeEmoji: '🗓️', labelKey: 'calendar.title' },
  { path: '/stats', emoji: '📊', activeEmoji: '📈', labelKey: 'stats.title' },
  { path: '/badges', emoji: '🏅', activeEmoji: '🥇', labelKey: 'badges.title' },
  { path: '/settings', emoji: '⚙️', activeEmoji: '💖', labelKey: 'settings.title' },
]

const PRIMARY_TABS = ALL_TABS.slice(0, 4)
const MORE_TABS = ALL_TABS.slice(4)

function TabIcon({ emoji, size = 18 }: { emoji: string; size?: number }) {
  return <Icon emoji={emoji} size={size} />
}

export default function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const location = useLocation()
  const [showMore, setShowMore] = useState(false)
  useTheme()
  const isRantDetail = location.pathname.startsWith('/rant/')

  if (isRantDetail) {
    return <div className="min-h-dvh">{children}</div>
  }

  return (
    <div className="desktop-frame">
      {/* Sidebar — desktop only */}
      <aside className="app-sidebar hidden md:flex flex-col">
        <div className="px-3 pb-4 mb-3 border-b border-[var(--border)]">
          <span className="text-lg font-bold bg-gradient-to-r from-[var(--pink)] to-[var(--lavender)] bg-clip-text text-transparent">
            GoaTalk
          </span>
        </div>
        <nav className="flex-1 flex flex-col gap-0.5">
          {ALL_TABS.map((tab) => {
            const isActive = location.pathname === tab.path
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[var(--pink-light)] to-[var(--lavender-light)] text-[var(--pink-dark)] font-bold shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--cream)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="text-lg flex items-center justify-center w-6">
                  <TabIcon emoji={isActive ? tab.activeEmoji : tab.emoji} size={18} />
                </span>
                <span className="text-sm font-semibold">{t(tab.labelKey)}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="app-content flex flex-col">
        <div className="flex-1">
          {children}
        </div>

        {/* Bottom nav — mobile only */}
        <nav className="sticky bottom-0 md:hidden bg-[var(--card-glass)] backdrop-blur-xl border-t border-[var(--border)] shadow-lg z-40">
          <div className="flex justify-around items-center px-2 py-1">
            {PRIMARY_TABS.map((tab) => {
              const isActive = location.pathname === tab.path
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all shrink-0 ${
                    isActive ? '' : 'opacity-50 hover:opacity-75'
                  }`}
                >
                  {isActive && (
                    <span className="absolute -top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-[var(--pink)] to-[var(--pink-dark)] rounded-full" />
                  )}
                  <span className="inline-flex items-center text-lg transition-transform duration-200" style={{ transform: isActive ? 'scale(1.1)' : 'scale(1)' }}>
                    <TabIcon emoji={isActive ? tab.activeEmoji : tab.emoji} />
                  </span>
                  <span className={`text-[9px] font-bold leading-tight ${isActive ? 'text-[var(--pink)]' : 'text-[var(--text-muted)]'}`}>
                    {t(tab.labelKey)}
                  </span>
                </Link>
              )
            })}

            {/* More button */}
            <button
              onClick={() => setShowMore(!showMore)}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all shrink-0 ${
                showMore || MORE_TABS.some(t => location.pathname === t.path) ? '' : 'opacity-50 hover:opacity-75'
              }`}
            >
              {(showMore || MORE_TABS.some(t => location.pathname === t.path)) && (
                <span className="absolute -top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-[var(--pink)] to-[var(--pink-dark)] rounded-full" />
              )}
              <span className="inline-flex items-center text-lg transition-transform duration-200" style={{ transform: showMore ? 'scale(1.1)' : 'scale(1)' }}>
                <TabIcon emoji={showMore ? '✨' : '•••'} />
              </span>
              <span className={`text-[9px] font-bold leading-tight ${showMore ? 'text-[var(--pink)]' : 'text-[var(--text-muted)]'}`}>
                More
              </span>
            </button>
          </div>

          {/* More popup */}
          {showMore && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowMore(false)}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-40 w-56 glass rounded-2xl p-2 shadow-xl animate-fade-in-up">
                {MORE_TABS.map((tab) => {
                  const isActive = location.pathname === tab.path
                  return (
                    <Link
                      key={tab.path}
                      to={tab.path}
                      onClick={() => setShowMore(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-[var(--pink-light)] to-[var(--lavender-light)] text-[var(--pink-dark)] font-bold'
                          : 'text-[var(--text-primary)] hover:bg-[var(--cream)]'
                      }`}
                    >
                      <span className="text-lg"><TabIcon emoji={isActive ? tab.activeEmoji : tab.emoji} /></span>
                      <span className="text-sm font-semibold">{t(tab.labelKey)}</span>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </nav>
      </main>
    </div>
  )
}

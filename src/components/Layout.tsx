import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../store/ThemeContext'
import Icon from './Icon'
import type { ReactNode } from 'react'

const TABS = [
  { path: '/feed', emoji: '🏠', activeEmoji: '🌸', labelKey: 'feed.title' },
  { path: '/record', emoji: '🎤', activeEmoji: '🎙️', labelKey: 'record.title' },
  { path: '/board', emoji: '📋', activeEmoji: '📌', labelKey: 'board.title' },
  { path: '/calendar', emoji: '📅', activeEmoji: '🗓️', labelKey: 'calendar.title' },
  { path: '/stats', emoji: '📊', activeEmoji: '📈', labelKey: 'stats.title' },
  { path: '/badges', emoji: '🏅', activeEmoji: '🥇', labelKey: 'badges.title' },
  { path: '/settings', emoji: '⚙️', activeEmoji: '💖', labelKey: 'settings.title' },
]

function TabIcon({ tab, isActive }: { tab: typeof TABS[number]; isActive: boolean }) {
  return (
    <span className="inline-flex items-center text-xl transition-transform duration-200" style={{ transform: isActive ? 'scale(1.15)' : 'scale(1)' }}>
      <Icon emoji={isActive ? tab.activeEmoji : tab.emoji} size={20} />
    </span>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const location = useLocation()
  useTheme()
  const isRantDetail = location.pathname.startsWith('/rant/')

  return (
    <div className="flex flex-col min-h-dvh">
      <main className="flex-1 overflow-y-auto pb-4">
        {children}
      </main>
      {!isRantDetail && (
        <nav className="sticky bottom-0 bg-[var(--card-glass)] backdrop-blur-xl border-t border-[var(--border)] px-2 pt-2 pb-[env(safe-area-inset-bottom,8px)] shadow-lg">
          <div className="flex justify-around items-center max-w-lg mx-auto">
            {TABS.map((tab) => {
              const isActive = location.pathname === tab.path
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`relative flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${
                    isActive ? '' : 'opacity-50 hover:opacity-75'
                  }`}
                >
                  {isActive && (
                    <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-[var(--pink)] to-[var(--pink-dark)] rounded-full" />
                  )}
                  <TabIcon tab={tab} isActive={isActive} />
                  <span className={`text-[10px] font-bold ${isActive ? 'text-[var(--pink)]' : 'text-[var(--text-muted)]'}`}>
                    {t(tab.labelKey)}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}

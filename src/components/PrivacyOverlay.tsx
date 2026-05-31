import { useEffect, useState } from 'react'

const STORAGE_KEY = 'goatalk_privacy_mode'

export function getPrivacyMode(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true' } catch { return false }
}

export function setPrivacyMode(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false')
}

export default function PrivacyOverlay() {
  const [showOverlay, setShowOverlay] = useState(false)

  useEffect(() => {
    if (!getPrivacyMode()) {
      setShowOverlay(false)
      return
    }

    const handleVisibility = () => {
      setShowOverlay(document.hidden)
    }

    const handlePageHide = () => setShowOverlay(true)
    const handlePageShow = () => setShowOverlay(false)

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [])

  if (!showOverlay) return null

  return (
    <div
      className="fixed inset-0 z-[9999] bg-[var(--bg)] flex items-center justify-center"
      style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
    >
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--pink)] to-[var(--pink-dark)] flex items-center justify-center shadow-lg">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <p className="text-sm font-bold text-[var(--text-muted)]">GoaTalk</p>
      </div>
    </div>
  )
}

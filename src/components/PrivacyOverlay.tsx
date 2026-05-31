import { useEffect, useRef } from 'react'

const STORAGE_KEY = 'goatalk_privacy_mode'

export function getPrivacyMode(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true' } catch { return false }
}

export function setPrivacyMode(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false')
}

export default function PrivacyOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const show = () => {
      if (overlayRef.current) overlayRef.current.style.display = 'flex'
    }
    const hide = () => {
      if (overlayRef.current) overlayRef.current.style.display = 'none'
    }

    const handleBlur = () => {
      if (getPrivacyMode()) show()
    }
    const handleFocus = () => {
      if (getPrivacyMode()) hide()
    }
    const handleVisibility = () => {
      if (!getPrivacyMode()) return
      if (document.hidden) show()
      else hide()
    }

    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', show)
    window.addEventListener('pageshow', hide)

    if (!getPrivacyMode()) hide()

    return () => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', show)
      window.removeEventListener('pageshow', hide)
    }
  }, [])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] bg-[var(--bg)] flex items-center justify-center"
      style={{ display: 'none' }}
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

import { useEffect, useState, useRef, useCallback, type ReactNode } from 'react'
import { hasPin, isLocked, setLocked, getPinTimeoutMinutes } from '../lib/lock'
import LockScreen from './LockScreen'
import PrivacyOverlay from './PrivacyOverlay'

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'touchstart', 'touchmove', 'keydown', 'scroll', 'wheel'] as const

export default function AppLockManager({ children }: { children: ReactNode }) {
  const [locked, setLockedState] = useState(isLocked)
  const lastActivityRef = useRef(Date.now())
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const checkIdle = useCallback(() => {
    if (!hasPin()) return
    const timeout = getPinTimeoutMinutes() * 60 * 1000
    const elapsed = Date.now() - lastActivityRef.current
    if (elapsed >= timeout) {
      setLocked(true)
      setLockedState(true)
    }
  }, [])

  useEffect(() => {
    const resetActivity = () => {
      lastActivityRef.current = Date.now()
    }

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, resetActivity, { passive: true })
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'l' && hasPin()) {
        e.preventDefault()
        setLocked(true)
        setLockedState(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    intervalRef.current = setInterval(checkIdle, 10000)

    return () => {
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, resetActivity)
      }
      window.removeEventListener('keydown', handleKeyDown)
      clearInterval(intervalRef.current)
    }
  }, [checkIdle])

  const handleUnlock = () => {
    setLockedState(false)
    lastActivityRef.current = Date.now()
  }

  return (
    <>
      {locked && hasPin() ? (
        <LockScreen onUnlock={handleUnlock} />
      ) : (
        children
      )}
      <PrivacyOverlay />
    </>
  )
}

import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { hashString } from '../lib/crypto'
import { getPinHash, setLocked } from '../lib/lock'

const PIN_LENGTH = 4

interface Props {
  onUnlock: () => void
}

export default function LockScreen({ onUnlock }: Props) {
  const { t } = useTranslation()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [shaking, setShaking] = useState(false)
  const verifyingRef = useRef(false)

  const handleDigit = useCallback(async (digit: string) => {
    if (verifyingRef.current) return
    const next = pin + digit
    if (next.length > PIN_LENGTH) return
    setPin(next)
    setError(false)

    if (next.length === PIN_LENGTH) {
      verifyingRef.current = true
      const hash = await hashString(next)
      const stored = getPinHash()
      if (hash === stored) {
        setLocked(false)
        onUnlock()
      } else {
        setShaking(true)
        setError(true)
        setTimeout(() => {
          setPin('')
          setShaking(false)
          verifyingRef.current = false
        }, 600)
      }
    }
  }, [pin, onUnlock])

  const handleDelete = useCallback(() => {
    if (pin.length === 0) return
    setPin((p) => p.slice(0, -1))
    setError(false)
  }, [pin])

  return (
    <div className="fixed inset-0 z-[9998] bg-[var(--bg)] flex flex-col items-center justify-center px-6 animate-fade-in">
      <div className="flex flex-col items-center gap-8 max-w-xs w-full">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--pink)] to-[var(--pink-dark)] flex items-center justify-center shadow-lg">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>

        <p className="text-lg font-extrabold text-[var(--text-primary)]">GoaTalk</p>

        {/* PIN Dots */}
        <div className={`flex gap-4 ${shaking ? 'animate-shake' : ''}`}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                i < pin.length
                  ? 'border-[var(--pink)] bg-[var(--pink)]'
                  : error
                    ? 'border-[var(--error)] bg-[var(--error-light)]'
                    : 'border-[var(--border)]'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs font-bold text-[var(--error)] animate-fade-in">{t('lock.incorrect')}</p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-[240px] mt-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
            <button
              key={d}
              onClick={() => handleDigit(String(d))}
              className="w-full aspect-square rounded-2xl bg-[var(--card-glass)] backdrop-blur-sm text-2xl font-extrabold text-[var(--text-primary)] active:scale-90 transition-all hover:brightness-95 shadow-sm"
            >
              {d}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleDigit('0')}
            className="w-full aspect-square rounded-2xl bg-[var(--card-glass)] backdrop-blur-sm text-2xl font-extrabold text-[var(--text-primary)] active:scale-90 transition-all hover:brightness-95 shadow-sm"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="w-full aspect-square rounded-2xl bg-[var(--cream)] text-sm font-bold text-[var(--text-muted)] active:scale-90 transition-all hover:brightness-95 shadow-sm flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

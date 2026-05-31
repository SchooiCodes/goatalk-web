import { useState, useEffect, useRef } from 'react'
import { startRecording, stopRecording, pauseRecording, resumeRecording, cancelRecording } from '../lib/audio'
import { useTranslation } from 'react-i18next'

interface Props {
  onRecordingComplete: (blob: Blob, durationSec: number) => void
  onError: (error: string) => void
  onCancel?: () => void
  onStart?: () => void
}

type RecState = 'idle' | 'recording' | 'paused'

const MIN_DURATION = 3
const WAVE_BARS = 5

export default function RecordingButton({ onRecordingComplete, onError, onCancel, onStart }: Props) {
  const { t } = useTranslation()
  const [state, setState] = useState<RecState>('idle')
  const [duration, setDuration] = useState(0)
  const [showWarning, setShowWarning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const startTimeRef = useRef(0)

  const clearTimer = () => { clearInterval(timerRef.current); timerRef.current = undefined }

  const handleStart = () => {
    setDuration(0)
    setShowWarning(false)
    setState('recording')
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
    onStart?.()

    startRecording({
      onData: () => {},
      onStop: (blob) => {
        clearTimer()
        const sec = Math.floor((Date.now() - startTimeRef.current) / 1000)
        if (sec < MIN_DURATION) {
          onError(t('record.tooShort', { n: MIN_DURATION }))
          setState('idle')
          setDuration(0)
          return
        }
        setState('idle')
        setDuration(0)
        onRecordingComplete(blob, sec)
      },
      onError: (err) => {
        clearTimer()
        setState('idle')
        setDuration(0)
        onError(err.message)
      },
    })
  }

  useEffect(() => {
    if (state === 'recording' && duration >= MIN_DURATION && !showWarning) {
      setShowWarning(true)
    }
  }, [state, duration, showWarning])

  const handleStop = () => {
    clearTimer()
    stopRecording()
  }

  const handlePause = () => {
    clearTimer()
    pauseRecording()
    setState('paused')
  }

  const handleResume = () => {
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
    resumeRecording()
    setState('recording')
  }

  const handleCancel = () => {
    clearTimer()
    cancelRecording()
    setState('idle')
    setDuration(0)
    setShowWarning(false)
    onCancel?.()
  }

  useEffect(() => {
    return () => { clearTimer(); stopRecording() }
  }, [])

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const isActive = state === 'recording' || state === 'paused'

  return (
    <div className="flex flex-col items-center gap-4">
      {isActive && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${state === 'paused' ? 'bg-[var(--warning)]' : 'bg-[var(--coral)] animate-pulse'}`} />
            <span className="text-4xl font-extrabold text-[var(--coral)] tabular-nums animate-fade-in">
              {formatTime(duration)}
            </span>
          </div>
          {!showWarning && state === 'recording' && (
            <span className="text-xs text-[var(--text-muted)] font-medium animate-fade-in">
              {t('record.minDuration', { n: MIN_DURATION })}
            </span>
          )}
          {showWarning && (
            <span className="text-xs text-[var(--coral)] font-semibold">
              {t('record.releaseStop')}
            </span>
          )}
        </div>
      )}

      <div className="relative pb-8">
        <div className={`absolute inset-0 rounded-full ${isActive ? 'animate-pulse-glow' : ''}`} />

        {isActive && state === 'recording' && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-2 items-end h-4">
            {Array.from({ length: WAVE_BARS }).map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-[var(--coral)] animate-wave"
                style={{
                  animationDelay: `${i * 0.12}s`,
                  height: '100%',
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
        )}

        <button
          onClick={isActive ? handleStop : handleStart}
          className={`relative w-28 h-28 rounded-full flex items-center justify-center text-4xl transition-all active:scale-90 shadow-xl ${
            isActive
              ? 'bg-gradient-to-br from-[var(--coral)] to-[var(--error)] text-white animate-pulse-record'
              : 'bg-gradient-to-br from-[var(--pink)] to-[var(--pink-dark)] text-white hover:shadow-2xl hover:shadow-[var(--pink-dark)]/40 hover:scale-105'
          }`}
          aria-label={isActive ? t('record.stop') : t('record.start')}
        >
          {isActive ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          )}
        </button>
      </div>

      {isActive && (
        <div className="flex gap-3 animate-fade-in">
          <button
            onClick={state === 'paused' ? handleResume : handlePause}
            className="px-5 py-2.5 rounded-xl bg-[var(--card-glass)] backdrop-blur-sm font-bold text-sm text-[var(--text-primary)] active:scale-90 transition-all hover:brightness-95 hover:shadow-md flex items-center gap-2"
            aria-label={state === 'paused' ? 'Resume recording' : 'Pause recording'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-primary)">
              {state === 'paused' ? (
                <polygon points="6,4 20,12 6,20" />
              ) : (
                <>
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </>
              )}
            </svg>
            {state === 'paused' ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-xl bg-[var(--error-light)] font-bold text-sm text-[var(--error)] active:scale-90 transition-all hover:brightness-95 hover:shadow-md flex items-center gap-2"
            aria-label="Cancel recording"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            {t('common.cancel')}
          </button>
        </div>
      )}

      {!isActive && (
        <p className="text-sm font-bold text-[var(--text-secondary)] animate-fade-in">
          {t('record.start')}
        </p>
      )}
    </div>
  )
}

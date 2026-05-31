import { useState, useEffect, useRef, useCallback } from 'react'
import { loadAudio } from '../lib/audio'

interface Props {
  audioKey: string
  onListenProgress?: (progress: number) => void
  onComplete?: () => void
}

const SPEEDS = [0.5, 1, 1.2, 1.5, 2]
const STORAGE_KEY = 'goatalk_playback_speed'

function loadSavedSpeed(): number {
  const v = localStorage.getItem(STORAGE_KEY)
  if (v) { const n = parseFloat(v); if (SPEEDS.includes(n)) return n }
  return 1
}

export default function AudioPlayer({ audioKey, onListenProgress, onComplete }: Props) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(loadSavedSpeed)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [volume, setVolume] = useState(1)

  const audVol = Math.min(1, volume)
  const [showVolume, setShowVolume] = useState(false)
  const [seekTooltip, setSeekTooltip] = useState<{ text: string; left: number } | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressRef = useRef(onListenProgress)
  const completeRef = useRef(onComplete)
  const urlRef = useRef<string | null>(null)
  const seekRef = useRef<HTMLDivElement | null>(null)
  progressRef.current = onListenProgress
  completeRef.current = onComplete

  const loadAudioUrl = useCallback(() => {
    setError(false)
    let cancelled = false
    loadAudio(audioKey).then((blob) => {
      if (cancelled) return
      const url = URL.createObjectURL(blob)
      urlRef.current = url
      setAudioUrl(url)
    }).catch(() => {
      if (!cancelled) setError(true)
    })
    return () => { cancelled = true }
  }, [audioKey])

  useEffect(loadAudioUrl, [loadAudioUrl])

  useEffect(() => {
    if (!audioUrl) return
    const audio = new Audio(audioUrl)
    audioRef.current = audio
    audio.preload = 'auto'
    audio.playbackRate = speed
    audio.volume = Math.min(1, volume)

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      if (audio.duration) progressRef.current?.(audio.currentTime / audio.duration)
    }
    const onLoaded = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration)
      }
    }
    const onDurationChange = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration)
      }
    }
    const onEnded = () => { setIsPlaying(false); completeRef.current?.() }
    const onError = () => { setIsPlaying(false); setError(true) }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audioRef.current = null
    }
  }, [audioUrl, speed])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = Math.min(1, volume)
  }, [volume])

  // Error retry
  const retry = () => {
    if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null }
    setAudioUrl(null)
    setError(false)
    loadAudioUrl()
  }

  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    } else {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  const seekTo = useCallback((percent: number) => {
    if (!audioRef.current || !duration || !Number.isFinite(duration)) return
    audioRef.current.currentTime = duration * Math.max(0, Math.min(1, percent))
  }, [duration])

  const skip = useCallback((delta: number) => {
    if (!audioRef.current || !duration || !Number.isFinite(duration)) return
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + delta))
  }, [duration])

  const cycleSpeed = useCallback(() => {
    setSpeed((s) => {
      const idx = SPEEDS.indexOf(s)
      const next = SPEEDS[(idx + 1) % SPEEDS.length]
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  const formatTime = (sec: number) => {
    if (!Number.isFinite(sec) || sec < 0) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleSeekHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const t = Number.isFinite(duration) ? duration * pct : 0
    setSeekTooltip({ text: formatTime(t), left: pct * 100 })
  }

  const handleSeekLeave = () => setSeekTooltip(null)

  const handleDownload = () => {
    if (!audioUrl) return
    const a = document.createElement('a')
    a.href = audioUrl
    a.download = `goatalk-rant-${audioKey.slice(0, 8)}.webm`
    a.click()
  }

  const progress = duration > 0 ? currentTime / duration : 0

  if (error) {
    return (
      <div className="glass rounded-2xl p-4 text-center animate-fade-in">
        <p className="text-sm font-semibold text-[var(--error)] mb-2">Failed to load audio</p>
        <button
          onClick={retry}
          className="text-sm font-bold text-[var(--pink)] hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!audioUrl) {
    return (
      <div className="glass rounded-2xl p-4 text-center text-sm text-[var(--text-muted)] animate-pulse">
        Loading audio...
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-4 w-full animate-fade-in">
      {/* Seek bar with time tooltip */}
      <div className="relative mb-3">
        {seekTooltip && (
          <div
            className="absolute -top-6 text-[11px] font-bold text-[var(--pink)] bg-[var(--white)] px-1.5 py-0.5 rounded-md shadow-md pointer-events-none z-10"
            style={{ left: `${seekTooltip.left}%`, transform: 'translateX(-50%)' }}
          >
            {seekTooltip.text}
          </div>
        )}
        <div
          ref={seekRef}
          role="slider"
          aria-label="Seek"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
          className="h-2 bg-[var(--border)] rounded-full cursor-pointer overflow-hidden group relative"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            seekTo((e.clientX - rect.left) / rect.width)
          }}
          onMouseMove={handleSeekHover}
          onMouseLeave={handleSeekLeave}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') skip(5)
            else if (e.key === 'ArrowLeft') skip(-5)
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-[var(--pink)] to-[var(--pink-dark)] rounded-full transition-all duration-75 relative"
            style={{ width: `${progress * 100}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      {/* Time row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[var(--text-muted)] tabular-nums font-medium">{formatTime(currentTime)}</span>
        <span className="text-xs text-[var(--text-muted)] tabular-nums font-medium">{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => skip(-10)}
          className="w-9 h-9 rounded-full bg-[var(--lavender-light)] flex items-center justify-center text-xs font-bold text-[var(--lavender)] active:scale-90 transition-transform hover:brightness-95"
          aria-label="Rewind 10 seconds"
        >
          -10s
        </button>

        <button
          onClick={() => skip(-5)}
          className="w-7 h-7 rounded-full bg-[var(--lavender-light)]/60 flex items-center justify-center text-[10px] font-bold text-[var(--lavender)] active:scale-90 transition-transform hover:brightness-95"
          aria-label="Rewind 5 seconds"
        >
          -5
        </button>

        <button
          onClick={togglePlayback}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--pink)] to-[var(--pink-dark)] flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-[var(--pink-dark)]/30 hover:shadow-xl"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="6,4 20,12 6,20" /></svg>
          )}
        </button>

        <button
          onClick={() => skip(5)}
          className="w-7 h-7 rounded-full bg-[var(--lavender-light)]/60 flex items-center justify-center text-[10px] font-bold text-[var(--lavender)] active:scale-90 transition-transform hover:brightness-95"
          aria-label="Forward 5 seconds"
        >
          +5
        </button>

        <button
          onClick={() => skip(30)}
          className="w-9 h-9 rounded-full bg-[var(--lavender-light)] flex items-center justify-center text-xs font-bold text-[var(--lavender)] active:scale-90 transition-transform hover:brightness-95"
          aria-label="Forward 30 seconds"
        >
          +30s
        </button>

        {/* Speed */}
        <button
          onClick={cycleSpeed}
          className="px-3 py-1 bg-[var(--lavender-light)] rounded-lg text-sm font-bold text-[var(--lavender)] active:scale-90 transition-transform hover:brightness-95"
          aria-label={`Playback speed ${speed}x`}
        >
          {speed}x
        </button>

        {/* Volume */}
        <div className="relative">
          <button
            onClick={() => setShowVolume(!showVolume)}
            className="w-8 h-8 rounded-full bg-[var(--lavender-light)]/60 flex items-center justify-center active:scale-90 transition-transform hover:brightness-95"
            aria-label="Volume"
          >
            {volume === 0 ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lavender)" strokeWidth="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
            ) : volume <= 1 ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lavender)" strokeWidth="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M18.5 8.5c1 1.5 1 3.5 0 5"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lavender)" strokeWidth="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M15.5 7.5c2 2.5 2 6.5 0 9"/></svg>
            )}
          </button>
          {showVolume && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[var(--white)] border-2 border-[var(--border)] rounded-xl p-2 shadow-lg z-20 animate-fade-in">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20 h-1.5 accent-[var(--pink)]"
                  aria-label="Volume slider"
                />
                <span className="text-xs font-bold text-[var(--lavender)] min-w-[3ch]">{Math.round(volume * 100)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Download */}
        <button
          onClick={handleDownload}
          className="w-8 h-8 rounded-full bg-[var(--lavender-light)]/60 flex items-center justify-center active:scale-90 transition-transform hover:brightness-95"
          aria-label="Download audio"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lavender)" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
      </div>
    </div>
  )
}

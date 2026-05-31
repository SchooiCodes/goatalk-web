import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRants } from '../store/RantContext'
import { useTranscription } from '../hooks/useTranscription'
import { showToast } from '../components/Toast'
import RecordingButton from '../components/RecordingButton'
import TranscriptEditor from '../components/TranscriptEditor'
import AudioPlayer from '../components/AudioPlayer'
import KawaiiButton from '../components/KawaiiButton'
import Icon from '../components/Icon'
import { saveAudio } from '../lib/audio'

export default function RecordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { sendRant } = useRants()
  const { startListening, stopListening, isTranscribing, interimText, modelReady, modelError } = useTranscription()

  const [stage, setStage] = useState<'idle' | 'preview'>('idle')
  const [isSending, setIsSending] = useState(false)
  const [audioKey, setAudioKey] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    document.title = `${t('record.title')} — GoaTalk`
  }, [t])

  const handleRecordingStart = () => {
    startListening()
  }

  const handleRecordingComplete = async (blob: Blob, sec: number) => {
    const result = stopListening()
    if (result) setTranscript(result)
    const key = await saveAudio(blob)
    setAudioKey(key)
    setDuration(sec)
    setStage('preview')
  }

  const handleImportAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const blob = file
    const audio = new Audio()
    audio.src = URL.createObjectURL(blob)
    await new Promise((resolve) => { audio.onloadedmetadata = resolve })
    const sec = Number.isFinite(audio.duration) && audio.duration > 0 ? Math.round(audio.duration) : 0
    URL.revokeObjectURL(audio.src)
    await handleRecordingComplete(blob, sec)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleError = (error: string) => {
    showToast(error, 'error')
    setStage('idle')
  }

  const handleSend = async () => {
    if (!audioKey) return
    setIsSending(true)
    try {
      const { loadAudio } = await import('../lib/audio')
      const blob = await loadAudio(audioKey)
      const id = await sendRant({ blob, transcript, durationSec: duration, tags })
      if (id) {
        showToast(t('record.sent'), 'success')
        resetState()
        navigate('/feed')
      } else {
        showToast(t('common.error'), 'error')
      }
    } catch {
      showToast(t('common.error'), 'error')
    }
    setIsSending(false)
  }

  const resetState = () => {
    setStage('idle')
    setAudioKey(null)
    setTranscript('')
    setTags([])
    setTagInput('')
  }

  return (
    <div className="px-4 pt-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-8">
        {stage === 'idle' && (
          <button
            onClick={() => navigate('/feed')}
            className="text-sm font-bold text-[var(--text-muted)] hover:text-[var(--pink)] transition-colors"
            aria-label={t('common.back')}
          >
            ← {t('common.back')}
          </button>
        )}
        <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">{t('record.title')}</h1>
      </div>

      {stage === 'idle' && (
        <div className="flex flex-col items-center justify-center mt-8 gap-4 animate-fade-in">
          {modelReady && (
            <div className="text-center mb-2">
              <p className="text-xs font-semibold text-[var(--mint)]"><Icon emoji="✨" size={12} /> StefaniaGPT ready</p>
            </div>
          )}
          {modelError && (
            <div className="glass rounded-2xl px-4 py-2 text-xs text-[var(--text-muted)] text-center mb-2">
              {modelError}
            </div>
          )}
          <RecordingButton onStart={handleRecordingStart} onRecordingComplete={handleRecordingComplete} onError={handleError} />
          {interimText && (
            <div className="glass rounded-2xl p-3 w-full max-w-sm text-center animate-fade-in">
              <p className="text-xs text-[var(--text-muted)] italic">{interimText}</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleImportAudio}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-3 rounded-2xl bg-[var(--lavender-light)] text-sm font-bold text-[var(--lavender)] active:scale-90 transition-transform hover:brightness-95 hover:shadow-md"
          >
            <Icon emoji="📂" size={16} /> {t('record.importAudio')}
          </button>
        </div>
      )}

      {stage === 'preview' && audioKey && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="text-center">
            <p className="text-sm font-semibold text-[var(--text-muted)]">
              <Icon emoji="🎵" size={14} /> {t('record.duration', { m: Math.floor(duration / 60), s: duration % 60 })}
            </p>
          </div>

          {/* Audio playback in preview */}
          <AudioPlayer audioKey={audioKey} />

          {/* Transcription status */}
          {isTranscribing && (
            <div className="glass rounded-2xl p-3 flex items-center gap-2 justify-center animate-fade-in">
              <Icon emoji="🧠" size={16} />
              <span className="text-sm font-bold text-[var(--lavender)]">StefaniaGPT is listening</span>
              <div className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--lavender)] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          <TranscriptEditor
            transcript={transcript}
            onSave={setTranscript}
          />

          {/* Tags */}
          <div className="glass rounded-2xl p-4">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">{t('record.tags')}</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTags(tags.filter((t) => t !== tag))}
                  className="bg-gradient-to-r from-[var(--lavender-light)] to-[var(--pink-light)] rounded-full px-3 py-1 text-xs font-bold text-[var(--warm-charcoal)] hover:opacity-80 transition-opacity"
                >
                  <Icon emoji="#" size={10} />{tag} <Icon emoji="❌" size={10} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    setTags([...tags, tagInput.trim().toLowerCase()])
                    setTagInput('')
                  }
                }}
                placeholder={t('record.addTag')}
                className="flex-1 bg-[var(--white)] border-2 border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--pink)] transition-colors placeholder:text-[var(--text-muted)]"
              />
              <KawaiiButton
                onClick={() => { if (tagInput.trim()) { setTags([...tags, tagInput.trim().toLowerCase()]); setTagInput('') } }}
                size="sm"
                variant="outline"
                disabled={!tagInput.trim()}
              >
                {t('common.add')}
              </KawaiiButton>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 pt-4">
            <KawaiiButton onClick={handleSend} loading={isSending} size="lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/></svg>
              {t('record.send')}
            </KawaiiButton>
            <div className="flex gap-4">
              <button
                onClick={resetState}
                className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--pink)] transition-colors"
              >
                ↺ Re-record
              </button>
              <button
                onClick={resetState}
                className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--pink)] transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

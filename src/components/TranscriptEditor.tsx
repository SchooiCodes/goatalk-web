import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from './Icon'
import { getHideSensitive } from '../lib/lock'

interface Props {
  transcript: string
  initialEdit?: string | null
  onSave: (text: string) => void
  editable?: boolean
}

export default function TranscriptEditor({ transcript, initialEdit, onSave, editable = true }: Props) {
  const { t } = useTranslation()
  const [text, setText] = useState(initialEdit ?? transcript)
  const [isEditing, setIsEditing] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const hideSensitive = getHideSensitive()

  useEffect(() => {
    setText(initialEdit ?? transcript)
  }, [transcript, initialEdit])

  const displayText = text || initialEdit || transcript

  if (!editable) {
    return (
      <div className="glass rounded-2xl p-4 animate-fade-in">
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">{t('rant.transcript')}</p>
        {displayText ? (
          <div className="relative">
            <p className={`text-[15px] text-[var(--text-primary)] leading-relaxed transition-all ${hideSensitive && !revealed ? 'blur-sm select-none' : ''}`}>
              {displayText}
            </p>
            {hideSensitive && !revealed && (
              <button onClick={() => setRevealed(true)} className="absolute inset-0 flex items-center justify-center cursor-pointer">
                <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--card-glass)] px-3 py-1.5 rounded-full backdrop-blur-sm">
                  <Icon emoji="🔍" size={12} /> {t('privacy.reveal')}
                </span>
              </button>
            )}
          </div>
        ) : (
          <p className="text-[15px] text-[var(--text-muted)] italic">{t('rant.noTranscript')}</p>
        )}
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-4 animate-fade-in">
      <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">{t('rant.transcript')}</p>
      {isEditing ? (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-[var(--white)] border-2 border-[var(--pink)] rounded-xl p-3 text-[15px] text-[var(--text-primary)] leading-relaxed min-h-[100px] resize-none outline-none focus:shadow-lg transition-shadow"
            autoFocus
          />
          <div className="flex justify-end gap-3 mt-2">
            <button onClick={() => { setText(initialEdit ?? transcript); setIsEditing(false) }}
              className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors px-3 py-1">
              {t('common.cancel')}
            </button>
            <button onClick={() => { onSave(text); setIsEditing(false) }}
              className="text-sm font-bold text-white bg-gradient-to-r from-[var(--pink)] to-[var(--pink-dark)] px-4 py-1.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95">
              {t('common.save')}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="relative w-full text-left">
            <p className={`text-[15px] text-[var(--text-primary)] leading-relaxed transition-all ${hideSensitive && !revealed ? 'blur-sm select-none' : ''}`}>
              {text || <><Icon emoji="🎤" size={14} /> No transcript</>}
            </p>
            {hideSensitive && !revealed && (
              <button onClick={() => setRevealed(true)} className="absolute inset-0 flex items-center justify-center cursor-pointer">
                <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--card-glass)] px-3 py-1.5 rounded-full backdrop-blur-sm">
                  <Icon emoji="🔍" size={12} /> {t('privacy.reveal')}
                </span>
              </button>
            )}
          </div>
          <button onClick={() => setIsEditing(true)} className="w-full text-left group mt-1">
            <p className="text-xs font-semibold text-[var(--pink)] group-hover:translate-x-1 transition-transform">
              {t('record.editHint')} <Icon emoji="✏️" size={12} />
            </p>
          </button>
        </div>
      )}
    </div>
  )
}

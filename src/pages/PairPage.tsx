import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../store/AuthContext'
import KawaiiButton from '../components/KawaiiButton'
import Icon from '../components/Icon'
import { resetAllData } from '../lib/database'

export default function PairPage() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = `${t('pair.title')} — GoaTalk`
  }, [t])

  const navigate = useNavigate()
  const { isPaired, generateCode, setupPairing, importSession } = useAuth()
  const [mode, setMode] = useState<'choose' | 'created' | 'join' | 'migrate'>('choose')
  const [displayName, setDisplayName] = useState('')
  const [code, setCode] = useState('')
  const [myCode, setMyCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isPaired) {
    navigate('/feed', { replace: true })
    return null
  }

  const handleGenerate = () => {
    if (!displayName.trim()) return
    const newCode = generateCode()
    setMyCode(newCode)
    setMode('created')
  }

  const handleStart = async () => {
    if (!myCode || !displayName.trim()) return
    setLoading(true)
    setError(null)
    try {
      await setupPairing(myCode, displayName.trim(), 'Partner 💕')
      navigate('/feed', { replace: true })
    } catch (err: any) {
      setError(err.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    if (!displayName.trim() || code.trim().length < 6) return
    setLoading(true)
    setError(null)
    try {
      await setupPairing(code.trim().toUpperCase(), displayName.trim(), 'Partner 💕')
      navigate('/feed', { replace: true })
    } catch (err: any) {
      setError(err.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleMigrate = async () => {
    if (code.trim().length < 6) return
    setLoading(true)
    setError(null)
    try {
      await importSession(code.trim().toUpperCase())
      window.location.reload()
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('404') || msg.includes('not found') || msg.includes('already used')) {
        setError(t('migrate.expired'))
      } else {
        setError(t('migrate.error'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    await resetAllData()
    window.location.reload()
  }

  return (
    <div className="min-h-dvh flex flex-col justify-center px-6 bg-[var(--bg)] bg-gradient-to-b from-[var(--bg)] via-[var(--cream)] to-[var(--bg)]">
      {/* Floating decorations */}
      <div className="fixed top-20 left-10 text-4xl opacity-20 animate-float pointer-events-none" style={{ animationDelay: '0s' }}><Icon emoji="🌸" size={36} /></div>
      <div className="fixed top-40 right-8 text-3xl opacity-20 animate-float pointer-events-none" style={{ animationDelay: '1s' }}><Icon emoji="💕" size={30} /></div>
      <div className="fixed bottom-40 left-8 text-3xl opacity-20 animate-float pointer-events-none" style={{ animationDelay: '2s' }}><Icon emoji="✨" size={30} /></div>

      <div className="flex flex-col items-center max-w-sm mx-auto w-full relative z-10">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--pink)] to-[var(--pink-dark)] flex items-center justify-center mb-4 shadow-lg shadow-[var(--pink-dark)]/30 animate-float">
          <Icon emoji="💕" size={36} />
        </div>
        <h1 className="text-4xl font-extrabold text-[var(--text-primary)] text-center mb-1">GoaTalk</h1>
        <p className="text-sm text-[var(--text-secondary)] text-center mb-8">{t('pair.title')}</p>

        <div className="flex flex-col gap-4 w-full">
          <input
            type="text"
            placeholder={t('pair.displayNamePlaceholder')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-[var(--card-glass)] backdrop-blur-sm border-2 border-[var(--border)] rounded-2xl px-5 py-4 text-base text-[var(--text-primary)] outline-none focus:border-[var(--pink)] focus:shadow-lg transition-all placeholder:text-[var(--text-muted)]"
            autoFocus
            autoComplete="name"
          />

          {mode === 'choose' && displayName.trim() && (
            <div className="flex flex-col gap-3 animate-fade-in-up">
              <KawaiiButton onClick={handleGenerate} size="lg">
                <Icon emoji="✨" size={18} /> {t('pair.createRoom')}
              </KawaiiButton>
              <KawaiiButton onClick={() => setMode('join')} variant="outline" size="md">
                <Icon emoji="🔗" size={18} /> {t('pair.joinRoom')}
              </KawaiiButton>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--border)]" /></div>
                <div className="relative flex justify-center"><span className="px-3 text-xs text-[var(--text-muted)] bg-[var(--bg)]">{t('common.or')}</span></div>
              </div>
              <KawaiiButton onClick={() => { setMode('migrate'); setCode(''); setError(null) }} variant="ghost" size="sm">
                <Icon emoji="📤" size={16} /> {t('migrate.importTitle')}
              </KawaiiButton>
            </div>
          )}

          {mode === 'created' && myCode && (
            <div className="flex flex-col items-center gap-4 animate-fade-in-up">
              <div className="w-full glass rounded-3xl p-6 flex flex-col items-center">
                <p className="text-sm font-semibold text-[var(--text-secondary)] mb-2">{t('pair.yourCode')}</p>
                <p className="text-4xl font-extrabold text-transparent bg-gradient-to-r from-[var(--pink)] to-[var(--pink-dark)] bg-clip-text tracking-[0.3em]">
                  {myCode}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-3">{t('pair.shareHint')}</p>
              </div>
              <KawaiiButton onClick={handleStart} loading={loading} size="lg">
                <Icon emoji="🚀" size={18} /> {t('common.continue')}
              </KawaiiButton>
              <button
                onClick={() => { setMode('choose'); setMyCode(null) }}
                className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--pink)] transition-colors"
                type="button"
              >
                ← {t('common.back')}
              </button>
            </div>
          )}

          {mode === 'join' && (
            <div className="flex flex-col gap-4 animate-fade-in-up">
              <input
                type="text"
                placeholder={t('pair.placeholder')}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full bg-[var(--card-glass)] backdrop-blur-sm border-2 border-[var(--border)] rounded-2xl px-5 py-4 text-2xl text-center tracking-[0.3em] font-extrabold text-[var(--text-primary)] outline-none focus:border-[var(--pink)] focus:shadow-lg transition-all placeholder:text-[var(--text-muted)] placeholder:tracking-normal placeholder:font-normal"
                autoCapitalize="characters"
              />
              {error && (
                <div className="bg-[var(--error-light)] rounded-xl px-4 py-3 text-sm font-semibold text-[var(--error)] text-center animate-fade-in">
                  <Icon emoji="💔" size={14} /> {error}
                </div>
              )}
              <KawaiiButton
                onClick={handleConnect}
                loading={loading}
                disabled={code.trim().length < 6}
                size="lg"
              >
                <Icon emoji="💕" size={18} /> {t('pair.claim')}
              </KawaiiButton>
              <button
                onClick={() => { setMode('choose'); setCode(''); setError(null) }}
                className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--pink)] transition-colors text-center"
                type="button"
              >
                ← {t('common.back')}
              </button>
            </div>
          )}

          {mode === 'migrate' && (
            <div className="flex flex-col gap-4 animate-fade-in-up">
              <p className="text-sm font-semibold text-[var(--text-secondary)] text-center">{t('migrate.importHint')}</p>
              <input
                type="text"
                placeholder={t('migrate.placeholder')}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full bg-[var(--card-glass)] backdrop-blur-sm border-2 border-[var(--border)] rounded-2xl px-5 py-4 text-2xl text-center tracking-[0.3em] font-extrabold text-[var(--text-primary)] outline-none focus:border-[var(--pink)] focus:shadow-lg transition-all placeholder:text-[var(--text-muted)] placeholder:tracking-normal placeholder:font-normal"
                autoCapitalize="characters"
              />
              {error && (
                <div className="bg-[var(--error-light)] rounded-xl px-4 py-3 text-sm font-semibold text-[var(--error)] text-center animate-fade-in">
                  <Icon emoji="💔" size={14} /> {error}
                </div>
              )}
              <KawaiiButton
                onClick={handleMigrate}
                loading={loading}
                disabled={code.trim().length < 6}
                size="lg"
              >
                <Icon emoji="📤" size={18} /> {t('migrate.connect')}
              </KawaiiButton>
              <button
                onClick={() => { setMode('choose'); setCode(''); setError(null) }}
                className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--pink)] transition-colors text-center"
                type="button"
              >
                ← {t('common.back')}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleReset}
          className="text-xs text-[var(--text-muted)] underline text-center mt-8 hover:text-[var(--pink)] transition-colors"
          type="button"
        >
          <Icon emoji="🔄" size={12} /> {t('common.reset')}
        </button>
      </div>
    </div>
  )
}
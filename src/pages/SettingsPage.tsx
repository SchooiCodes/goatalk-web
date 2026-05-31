import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../store/AuthContext'
import { useTheme, THEMES } from '../store/ThemeContext'
import i18n from '../i18n'
import KawaiiButton from '../components/KawaiiButton'
import { showToast } from '../components/Toast'
import Icon from '../components/Icon'
import { getPendingCount } from '../lib/sync'
import { getLastSyncedAt, resetAllData } from '../lib/database'
import { PROFILE_EMOJIS } from '../types'
import { getPrivacyMode, setPrivacyMode } from '../components/PrivacyOverlay'
import { hasPin, setPinHash, clearPinHash, getPinTimeoutMinutes, setPinTimeoutMinutes, getHideSensitive, setHideSensitive, setLocked } from '../lib/lock'
import { hashString } from '../lib/crypto'

const LANGUAGES = [
  { code: 'en', label: 'English', emoji: '🇬🇧' },
  { code: 'el', label: 'Ελληνικά', emoji: '🇬🇷' },
]

const SPEEDS = [0.5, 1, 1.2, 1.5, 2]
const STORAGE_KEY = 'goatalk_playback_speed'

export default function SettingsPage() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = `${t('settings.title')} — GoaTalk`
  }, [t])

  const { user, partnerName, reset, isOnline, profileEmoji, partnerProfileEmoji, setProfileEmoji, exportSession, updateDisplayName, updatePartnerName, devices, deviceId, removeDevice } = useAuth()
  const { scheme, theme, toggle, setTheme } = useTheme()
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [exportCode, setExportCode] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(user?.displayName || '')
  const [editingPartner, setEditingPartner] = useState(false)
  const [partnerInput, setPartnerInput] = useState(partnerName || '')
  const [listenThreshold, setListenThreshold] = useState(() => {
    try { return parseInt(localStorage.getItem('goatalk_listen_threshold') || '80') } catch { return 80 }
  })
  const [privacyMode, setLocalPrivacy] = useState(getPrivacyMode())
  const [hideSensitive, setLocalHideSensitive] = useState(getHideSensitive())
  const [hasLocalPin, setHasLocalPin] = useState(hasPin())
  const [pinTimeout, setLocalPinTimeout] = useState(getPinTimeoutMinutes())
  const [showPinSetup, setShowPinSetup] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter')
  const [pinError, setPinError] = useState<string | null>(null)

  useEffect(() => {
    getPendingCount().then(setPendingCount)
    getLastSyncedAt().then(setLastSynced)
  }, [])

  useEffect(() => {
    if (user) setNameInput(user.displayName)
  }, [user])

  useEffect(() => {
    if (partnerName) setPartnerInput(partnerName)
  }, [partnerName])

  const handleLanguageChange = (code: string) => i18n.changeLanguage(code)

  const handleReset = () => {
    if (confirm(t('settings.resetConfirm'))) {
      reset().then(() => resetAllData().then(() => window.location.reload()))
    }
  }

  const handleSaveName = async () => {
    if (nameInput.trim() && user) {
      await updateDisplayName(nameInput.trim())
      setEditingName(false)
      showToast('Name updated!', 'success')
    }
  }

  const handleSavePartner = async () => {
    await updatePartnerName(partnerInput.trim() || '💕 Partner')
    setEditingPartner(false)
    showToast('Partner name updated!', 'success')
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { resizeImage } = await import('../lib/database')
      const dataUri = await resizeImage(file)
      await setProfileEmoji(dataUri)
      showToast('Profile picture updated!', 'success')
    } catch {
      showToast('Failed to upload image', 'error')
    }
    e.target.value = ''
  }

  const isImage = profileEmoji.startsWith('data:')

  const handleExport = async () => {
    setExporting(true)
    setExportCode(null)
    try {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      let code = ''
      const bytes = new Uint8Array(6)
      crypto.getRandomValues(bytes)
      for (const b of bytes) code += chars[b % chars.length]
      await exportSession(code)
      setExportCode(code)
      showToast(t('settings.exportSuccess'), 'success')
      setTimeout(() => setExportCode(null), 300000)
    } catch {
      showToast(t('common.error'), 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="px-4 pt-4 max-w-lg mx-auto pb-8 animate-fade-in">
      <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mb-6">{t('settings.title')}</h1>

      {/* Profile Card */}
      <div className="glass rounded-3xl p-6 mb-6 text-center">
        <label className="block cursor-pointer">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--pink-light)] to-[var(--pink)] flex items-center justify-center mb-3 mx-auto shadow-lg hover:shadow-xl transition-all active:scale-90 overflow-hidden relative group">
            {isImage ? (
              <img src={profileEmoji} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">{profileEmoji}</span>
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Icon emoji="📷" size={18} className="text-white" />
            </div>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>
        <div className="flex gap-2 justify-center mb-3">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="text-[11px] font-semibold text-[var(--pink)] hover:text-[var(--pink-dark)] transition-colors"
          >
            {isImage ? 'Pick emoji' : 'Upload photo'}
          </button>
        </div>
        {showPicker && (
          <div className="glass rounded-2xl p-3 mb-4 animate-fade-in-up">
            <div className="flex flex-wrap gap-1.5 justify-center max-w-xs mx-auto">
              {PROFILE_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { setProfileEmoji(emoji); setShowPicker(false) }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-lg transition-all active:scale-90 ${
                    emoji === profileEmoji
                      ? 'bg-gradient-to-br from-[var(--pink-light)] to-[var(--pink)] shadow-md scale-110'
                      : 'hover:bg-[var(--cream)]'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Editable display name */}
        {editingName ? (
          <div className="flex gap-2 items-center justify-center mb-1">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName() }}
              className="bg-[var(--white)] border-2 border-[var(--border)] rounded-xl px-3 py-1.5 text-base font-extrabold text-center text-[var(--text-primary)] outline-none focus:border-[var(--pink)] w-40"
              autoFocus
            />
            <button onClick={handleSaveName} className="text-lg"><Icon emoji="✅" size={18} /></button>
            <button onClick={() => setEditingName(false)} className="text-lg"><Icon emoji="❌" size={18} /></button>
          </div>
        ) : (
          <button onClick={() => setEditingName(true)} className="text-xl font-extrabold text-[var(--text-primary)] hover:text-[var(--pink)] transition-colors">
            {user?.displayName} <Icon emoji="✏️" size={16} />
          </button>
        )}

        {editingPartner ? (
          <div className="flex gap-2 items-center justify-center mt-1">
            <span className="text-sm">{partnerProfileEmoji}</span>
            <input
              type="text"
              value={partnerInput}
              onChange={(e) => setPartnerInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSavePartner() }}
              className="bg-[var(--white)] border-2 border-[var(--border)] rounded-xl px-3 py-1 text-sm font-semibold text-center text-[var(--text-primary)] outline-none focus:border-[var(--pink)] w-36"
              autoFocus
            />
            <button onClick={handleSavePartner} className="text-sm"><Icon emoji="✅" size={14} /></button>
            <button onClick={() => setEditingPartner(false)} className="text-sm"><Icon emoji="❌" size={14} /></button>
          </div>
        ) : (
          partnerName && (
            <button onClick={() => setEditingPartner(true)} className="text-sm font-semibold text-[var(--text-muted)] mt-1 hover:text-[var(--pink)] transition-colors">
              {partnerProfileEmoji} {partnerName} <Icon emoji="✏️" size={14} />
            </button>
          )
        )}
      </div>

      {/* Sections */}
      <div className="space-y-4 stagger">
        {/* Sync */}
        <div className="glass rounded-2xl p-4">
          <h2 className="font-bold text-base text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Icon emoji="📡" /> {t('settings.sync')}
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">{t('settings.status')}</span>
              <span className={`font-bold ${isOnline ? 'text-[var(--success)]' : 'text-[var(--coral)]'}`}>
                {isOnline ? <><Icon emoji="🟢" size={14} /> {t('settings.online')}</> : <><Icon emoji="🔴" size={14} /> {t('settings.offline')}</>}
              </span>
            </div>
            {lastSynced && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">{t('settings.lastSynced')}</span>
                <span className="font-semibold text-[var(--text-primary)]">{new Date(lastSynced).toLocaleString()}</span>
              </div>
            )}
            {pendingCount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">{t('settings.pending')}</span>
                <span className="font-bold text-[var(--coral)]">{pendingCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Language */}
        <div className="glass rounded-2xl p-4">
          <h2 className="font-bold text-base text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Icon emoji="🌐" /> {t('settings.language')}
          </h2>
          <div className="flex gap-2">
            {LANGUAGES.map((lang) => {
              const isActive = i18n.language === lang.code
              return (
                <KawaiiButton
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  variant={isActive ? 'primary' : 'outline'}
                  size="sm"
                >
                  <Icon emoji={lang.emoji} /> {lang.label}
                </KawaiiButton>
              )
            })}
          </div>
        </div>

        {/* Theme */}
        <div className="glass rounded-2xl p-4">
          <h2 className="font-bold text-base text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Icon emoji="🎨" /> {t('settings.theme')}
          </h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-90 ${
                  t.id === theme
                    ? 'bg-gradient-to-r from-[var(--pink)] to-[var(--pink-dark)] text-white shadow-md'
                    : 'bg-[var(--cream)] text-[var(--text-primary)] hover:brightness-95'
                }`}
              >
                <Icon emoji={t.emoji} size={16} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 bg-[var(--cream)] rounded-2xl p-4 active:scale-[0.98] transition-all hover:brightness-95"
          >
            <span className="text-2xl">{scheme === 'light' ? <Icon emoji="☀️" size={24} /> : <Icon emoji="🌙" size={24} />}</span>
            <span className="font-bold text-[var(--text-primary)] flex-1 text-left">
              {scheme === 'light' ? t('settings.lightMode') : t('settings.darkMode')}
            </span>
            <span className="text-xs text-[var(--text-muted)]">{t('settings.tapToSwitch')}</span>
          </button>
        </div>

        {/* Playback Speed */}
        <div className="glass rounded-2xl p-4">
          <h2 className="font-bold text-base text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Icon emoji="⏩" /> {t('settings.playbackSpeed')}
          </h2>
          <div className="flex gap-2">
            {SPEEDS.map((s) => {
              const saved = parseFloat(localStorage.getItem(STORAGE_KEY) || '1')
              return (
                <button
                  key={s}
                  onClick={() => { localStorage.setItem(STORAGE_KEY, String(s)) }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-90 ${
                    saved === s
                      ? 'bg-gradient-to-r from-[var(--pink)] to-[var(--pink-dark)] text-white shadow-md'
                      : 'bg-[var(--cream)] text-[var(--text-primary)] hover:brightness-95'
                  }`}
                >
                  {s}x
                </button>
              )
            })}
          </div>
        </div>

        {/* Listen Threshold */}
        <div className="glass rounded-2xl p-4">
          <h2 className="font-bold text-base text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Icon emoji="🎧" /> {t('settings.listenThreshold')}
          </h2>
          <p className="text-xs text-[var(--text-muted)] mb-3">{t('settings.thresholdHint')}</p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={50}
              max={100}
              value={listenThreshold}
              onChange={(e) => {
                const v = parseInt(e.target.value)
                setListenThreshold(v)
                localStorage.setItem('goatalk_listen_threshold', String(v))
              }}
              className="flex-1 h-1.5 accent-[var(--pink)]"
            />
            <span className="text-sm font-bold text-[var(--pink)] min-w-[3ch] text-right">{listenThreshold}%</span>
          </div>
        </div>

        {/* Privacy */}
        <div className="glass rounded-2xl p-4">
          <h2 className="font-bold text-base text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> {t('settings.privacy')}
          </h2>

          {/* Privacy Screen */}
          <button
            onClick={() => {
              const next = !privacyMode
              setLocalPrivacy(next)
              setPrivacyMode(next)
              window.location.reload()
            }}
            className={`w-full flex items-center justify-between rounded-2xl p-4 transition-all active:scale-[0.98] mb-2 ${
              privacyMode ? 'bg-[var(--mint-light)]' : 'bg-[var(--cream)]'
            }`}
          >
            <span className="font-bold text-sm text-[var(--text-primary)]">{t('settings.privacyScreen')}</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              privacyMode
                ? 'bg-[var(--mint)] text-white'
                : 'bg-[var(--border)] text-[var(--text-muted)]'
            }`}>
              {privacyMode ? t('settings.privacyOn') : t('settings.privacyOff')}
            </span>
          </button>

          {/* Hide Sensitive Content */}
          <button
            onClick={() => {
              const next = !hideSensitive
              setLocalHideSensitive(next)
              setHideSensitive(next)
            }}
            className={`w-full flex items-center justify-between rounded-2xl p-4 transition-all active:scale-[0.98] mb-2 ${
              hideSensitive ? 'bg-[var(--mint-light)]' : 'bg-[var(--cream)]'
            }`}
          >
            <span className="font-bold text-sm text-[var(--text-primary)]">{t('settings.hideSensitive')}</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              hideSensitive
                ? 'bg-[var(--mint)] text-white'
                : 'bg-[var(--border)] text-[var(--text-muted)]'
            }`}>
              {hideSensitive ? t('settings.privacyOn') : t('settings.privacyOff')}
            </span>
          </button>

          {/* PIN Lock */}
          <div className="rounded-2xl p-4 bg-[var(--cream)] mb-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[var(--text-primary)]">{t('settings.pinLock')}</span>
              {hasLocalPin ? (
                <button
                  onClick={() => {
                    clearPinHash()
                    setHasLocalPin(false)
                    setShowPinSetup(false)
                    setPinInput('')
                    setPinConfirm('')
                    setPinStep('enter')
                  }}
                  className="text-xs font-bold text-[var(--error)] px-3 py-1 rounded-full bg-[var(--error-light)] active:scale-90 transition-all"
                >
                  {t('settings.removePin')}
                </button>
              ) : (
                <button
                  onClick={() => setShowPinSetup(!showPinSetup)}
                  className="text-xs font-bold text-[var(--pink)] px-3 py-1 rounded-full bg-[var(--pink-light)] active:scale-90 transition-all"
                >
                  {t('settings.setPin')}
                </button>
              )}
            </div>

            {showPinSetup && !hasLocalPin && (
              <div className="mt-3 animate-fade-in">
                {pinStep === 'enter' ? (
                  <>
                    <p className="text-xs text-[var(--text-muted)] mb-2">{t('lock.enterPin')}</p>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={pinInput}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                        setPinInput(v)
                        setPinError(null)
                      }}
                      className="w-full bg-[var(--white)] border-2 border-[var(--border)] rounded-xl px-4 py-2.5 text-lg text-center tracking-[0.3em] font-extrabold text-[var(--text-primary)] outline-none focus:border-[var(--pink)]"
                      placeholder="• • • •"
                      autoFocus
                    />
                    {pinInput.length === 4 && (
                      <button
                        onClick={() => { setPinStep('confirm'); setPinConfirm('') }}
                        className="mt-2 w-full py-2 rounded-xl bg-gradient-to-r from-[var(--pink)] to-[var(--pink-dark)] text-white text-sm font-bold active:scale-95 transition-all"
                      >
                        {t('common.continue')}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-xs text-[var(--text-muted)] mb-2">{t('lock.confirmPin')}</p>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={pinConfirm}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                        setPinConfirm(v)
                        setPinError(null)
                      }}
                      className="w-full bg-[var(--white)] border-2 border-[var(--border)] rounded-xl px-4 py-2.5 text-lg text-center tracking-[0.3em] font-extrabold text-[var(--text-primary)] outline-none focus:border-[var(--pink)]"
                      placeholder="• • • •"
                      autoFocus
                    />
                    {pinConfirm.length === 4 && (
                      <>
                        {pinInput !== pinConfirm ? (
                          <p className="text-xs font-bold text-[var(--error)] mt-2">{t('lock.pinMismatch')}</p>
                        ) : (
                          <button
                            onClick={async () => {
                              if (pinInput.length !== 4) return
                              const hash = await hashString(pinInput)
                              setPinHash(hash)
                              setHasLocalPin(true)
                              setShowPinSetup(false)
                              setPinInput('')
                              setPinConfirm('')
                              setPinStep('enter')
                            }}
                            className="mt-2 w-full py-2 rounded-xl bg-gradient-to-r from-[var(--pink)] to-[var(--pink-dark)] text-white text-sm font-bold active:scale-95 transition-all"
                          >
                            {t('common.save')}
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
                {pinError && <p className="text-xs font-bold text-[var(--error)] mt-2">{pinError}</p>}
              </div>
            )}

            {hasLocalPin && (
              <div className="mt-3">
                <p className="text-xs text-[var(--text-muted)] mb-2">{t('settings.autoLock')}</p>
                <div className="flex gap-2">
                  {[1, 5, 15].map((m) => (
                    <button
                      key={m}
                      onClick={() => { setPinTimeoutMinutes(m); setLocalPinTimeout(m) }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-90 ${
                        pinTimeout === m
                          ? 'bg-gradient-to-r from-[var(--pink)] to-[var(--pink-dark)] text-white shadow-md'
                          : 'bg-[var(--white)] text-[var(--text-primary)] border-2 border-[var(--border)]'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {hasLocalPin && (
            <button
              onClick={() => {
                setLocked(true)
                window.location.reload()
              }}
              className="mt-2 w-full py-3 rounded-xl bg-[var(--error-light)] text-sm font-bold text-[var(--error)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              {t('settings.lockNow')}
            </button>
          )}

          <p className="text-[10px] text-[var(--text-muted)] mt-2 leading-relaxed">
            {t('settings.privacyHint')}
          </p>
        </div>

        {/* Devices */}
        <div className="glass rounded-2xl p-4">
          <h2 className="font-bold text-base text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Icon emoji="📱" /> Devices
          </h2>
          <div className="space-y-2">
            {devices.map((d) => (
              <div key={d.id} className="flex items-center justify-between bg-[var(--cream)] rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{d.id === deviceId ? <Icon emoji="📱" size={18} /> : <Icon emoji="💻" size={18} />}</span>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      {d.name}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Last seen: {new Date(d.lastSeen).toLocaleDateString()} {new Date(d.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                {d.id !== deviceId ? (
                  <button
                    onClick={() => { if (confirm('Remove this device?')) removeDevice(d.id) }}
                    className="px-3 py-1 text-xs font-bold text-[var(--error)] bg-[var(--error-light)] rounded-xl hover:brightness-95 transition-all active:scale-90"
                  >
                    Remove
                  </button>
                ) : (
                  <span className="text-[10px] font-semibold text-[var(--mint)] px-2 py-1 bg-[var(--mint-light)] rounded-lg">
                    Current
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="glass rounded-2xl p-4">
          <h2 className="font-bold text-base text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Icon emoji="ℹ️" /> {t('settings.about')}
          </h2>
          <div className="text-sm text-[var(--text-secondary)] space-y-1">
            <p>{t('settings.version')}: 1.0.0</p>
            <p>GoaTalk — E2EE voice rants for two <Icon emoji="💕" size={14} /></p>
          </div>
        </div>

        {/* Export Session */}
        <div className="glass rounded-2xl p-4">
          <h2 className="font-bold text-base text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Icon emoji="📤" /> {t('settings.exportSession')}
          </h2>
          <p className="text-xs text-[var(--text-muted)] mb-3">{t('settings.exportHint')}</p>
          {exportCode ? (
            <div className="glass rounded-2xl p-4 text-center animate-fade-in-up">
              <p className="text-xs text-[var(--text-secondary)] mb-2">{t('settings.yourCode')}</p>
              <p className="text-3xl font-extrabold text-transparent bg-gradient-to-r from-[var(--pink)] to-[var(--pink-dark)] bg-clip-text tracking-[0.3em] mb-2">
                {exportCode}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">{t('settings.shareHint')}</p>
            </div>
          ) : (
            <KawaiiButton onClick={handleExport} loading={exporting} size="sm" className="w-full">
              <Icon emoji="🔑" /> {t('settings.generateCode')}
            </KawaiiButton>
          )}
        </div>

        {/* Reset */}
        <div className="pt-2">
          <KawaiiButton onClick={handleReset} variant="ghost" className="w-full">
            <Icon emoji="🔄" /> {t('settings.reset')}
          </KawaiiButton>
        </div>
      </div>
    </div>
  )
}

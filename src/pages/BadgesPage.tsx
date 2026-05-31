import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useRants } from '../store/RantContext'
import Icon from '../components/Icon'

interface Badge {
  id: string
  emoji: string
  label: string
  description: string
  earned: boolean
  progress?: { current: number; needed: number }
}

export default function BadgesPage() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = `${t('badges.title')} — GoaTalk`
  }, [t])

  const { rants } = useRants()

  const badges = useMemo(() => {
    const sent = rants.filter((r) => r.direction === 'sent')
    const received = rants.filter((r) => r.direction === 'received')
    const listened = received.filter((r) => r.listenedAt)
    const totalSent = sent.length
    const totalReceived = received.length
    const totalDurationSec = rants.reduce((s, r) => s + r.durationSec, 0)
    const totalMinutes = Math.floor(totalDurationSec / 60)
    const daysActive = new Set(rants.map((r) => r.createdAt.slice(0, 10))).size

    const badges: Badge[] = [
      { id: 'first-rant', emoji: '🎤', label: 'First Rant', description: 'Send your first voice rant', earned: totalSent >= 1, progress: { current: Math.min(totalSent, 1), needed: 1 } },
      { id: 'chatty', emoji: '💬', label: 'Chatty', description: 'Send 10 rants', earned: totalSent >= 10, progress: { current: Math.min(totalSent, 10), needed: 10 } },
      { id: 'vocal', emoji: '📢', label: 'Vocal', description: 'Send 25 rants', earned: totalSent >= 25, progress: { current: Math.min(totalSent, 25), needed: 25 } },
      { id: 'broadcaster', emoji: '📡', label: 'Broadcaster', description: 'Send 50 rants', earned: totalSent >= 50, progress: { current: Math.min(totalSent, 50), needed: 50 } },
      { id: 'legend', emoji: '👑', label: 'Rant Legend', description: 'Send 100 rants', earned: totalSent >= 100, progress: { current: Math.min(totalSent, 100), needed: 100 } },
      { id: 'first-heard', emoji: '👂', label: 'Heard', description: 'Have a rant listened to', earned: sent.some((r) => r.listenedAt), progress: { current: sent.filter((r) => r.listenedAt).length > 0 ? 1 : 0, needed: 1 } },
      { id: 'listener', emoji: '🎧', label: 'Listener', description: 'Listen to 10 rants', earned: listened.length >= 10, progress: { current: Math.min(listened.length, 10), needed: 10 } },
      { id: 'devoted', emoji: '💝', label: 'Devoted Listener', description: 'Listen to 50 rants', earned: listened.length >= 50, progress: { current: Math.min(listened.length, 50), needed: 50 } },
      { id: 'streak-3', emoji: '🔥', label: '3-Day Streak', description: 'Active for 3 days', earned: daysActive >= 3, progress: { current: Math.min(daysActive, 3), needed: 3 } },
      { id: 'streak-7', emoji: '⭐', label: 'Weekly Warrior', description: 'Active for 7 days', earned: daysActive >= 7, progress: { current: Math.min(daysActive, 7), needed: 7 } },
      { id: 'streak-30', emoji: '🌙', label: 'Monthly Master', description: 'Active for 30 days', earned: daysActive >= 30, progress: { current: Math.min(daysActive, 30), needed: 30 } },
      { id: 'hour-club', emoji: '⏱️', label: 'Hour Club', description: '1 hour total rant time', earned: totalMinutes >= 60, progress: { current: Math.min(totalMinutes, 60), needed: 60 } },
      { id: 'marathoner', emoji: '🏃', label: 'Marathoner', description: '5 hours total rant time', earned: totalMinutes >= 300, progress: { current: Math.min(totalMinutes, 300), needed: 300 } },
      { id: 'half-sent', emoji: '📨', label: 'Half & Half', description: '5 sent and 5 received', earned: totalSent >= 5 && totalReceived >= 5 },
      { id: 'reciprocal', emoji: '🤝', label: 'Reciprocal', description: '10 sent and 10 received', earned: totalSent >= 10 && totalReceived >= 10 },
      { id: 'night-owl', emoji: '🦉', label: 'Night Owl', description: 'Send a rant after midnight', earned: sent.some((r) => { const h = new Date(r.createdAt).getHours(); return h >= 0 && h < 5 }) },
      { id: 'early-bird', emoji: '🐦', label: 'Early Bird', description: 'Send a rant before 7 AM', earned: sent.some((r) => { const h = new Date(r.createdAt).getHours(); return h >= 5 && h < 7 }) },
      { id: 'weekend-warrior', emoji: '🎉', label: 'Weekend Warrior', description: 'Send rants on 3 different weekends', earned: new Set(sent.filter((r) => { const d = new Date(r.createdAt); return d.getDay() === 0 || d.getDay() === 6 }).map((r) => r.createdAt.slice(0, 10))).size >= 3 },
      { id: 'collector', emoji: '📝', label: 'Note Collector', description: 'Created 10 sticky notes', earned: false },
      { id: 'completionist', emoji: '🏆', label: 'Completionist', description: 'Unlock all other badges', earned: false },
    ]
    return badges
  }, [rants])

  const earned = badges.filter((b) => b.earned).length
  const total = badges.length

  return (
    <div className="min-h-dvh bg-[var(--bg)] bg-gradient-to-b from-[var(--bg)] via-[var(--cream)] to-[var(--bg)] p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2"><Icon emoji="🏅" size={32} /> Badges</h1>
        <span className="text-sm font-bold text-[var(--text-muted)] bg-[var(--card-glass)] px-3 py-1 rounded-full">
          {earned}/{total}
        </span>
      </div>
      <div className="grid gap-3 stagger">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`glass rounded-2xl p-4 flex items-center gap-3 transition-all ${
              b.earned ? 'opacity-100' : 'opacity-50 grayscale'
            }`}
          >
            <span className="text-3xl">{b.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[var(--text-primary)]">{b.label}</p>
              <p className="text-sm text-[var(--text-muted)]">{b.description}</p>
              {b.progress && !b.earned && (
                <div className="mt-1.5 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--pink)] to-[var(--pink-dark)] rounded-full transition-all duration-500"
                    style={{ width: `${(b.progress.current / b.progress.needed) * 100}%` }}
                  />
                </div>
              )}
            </div>
            <span className={`text-sm font-bold ${b.earned ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
              {b.earned ? <Icon emoji="✅" size={14} /> : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

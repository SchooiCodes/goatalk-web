import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useRants } from '../store/RantContext'
import Icon from '../components/Icon'
import { startOfWeek, endOfWeek, eachDayOfInterval, format, startOfMonth, endOfMonth } from 'date-fns'

export default function StatsPage() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = `${t('stats.title')} — GoaTalk`
  }, [t])

  const { rants } = useRants()

  const stats = useMemo(() => {
    const sent = rants.filter((r) => r.direction === 'sent')
    const received = rants.filter((r) => r.direction === 'received')
    const listened = received.filter((r) => r.listenedAt)
    const totalMinutes = sent.reduce((sum, r) => sum + r.durationSec, 0) / 60
    const listenedRate = received.length > 0 ? Math.round((listened.length / received.length) * 100) : 0

    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

    const weeklyActivity = weekDays.map((day: Date) => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const count = rants.filter(
        (r) => r.direction === 'sent' && format(new Date(r.createdAt), 'yyyy-MM-dd') === dayStr
      ).length
      return { day: format(day, 'EEE'), count }
    })

    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const monthRants = rants.filter((r) => {
      const d = new Date(r.createdAt)
      return d >= monthStart && d <= monthEnd
    })
    const monthSent = monthRants.filter((r) => r.direction === 'sent')
    const monthReceived = monthRants.filter((r) => r.direction === 'received')
    const monthMinutes = monthSent.reduce((sum, r) => sum + r.durationSec, 0) / 60
    const monthListened = monthReceived.filter((r) => r.listenedAt).length
    const monthListenRate = monthReceived.length > 0 ? Math.round((monthListened / monthReceived.length) * 100) : 0

    return {
      sent: sent.length, received: received.length, listenedRate, totalMinutes,
      weeklyActivity,
      monthSent: monthSent.length, monthReceived: monthReceived.length,
      monthMinutes, monthListenRate,
    }
  }, [rants])

  const maxWeeklyCount = Math.max(...stats.weeklyActivity.map((w: { day: string; count: number }) => w.count), 1)

  const badges = [
    { earned: stats.sent >= 1, emoji: '🎙️', label: t('stats.badgeFirst') },
    { earned: stats.sent >= 10, emoji: '💬', label: t('stats.badgeChatty') },
    { earned: stats.listenedRate >= 80, emoji: '👂', label: t('stats.badgeListener') },
    { earned: stats.sent >= 50, emoji: '🔥', label: t('stats.badgeMaster') },
    { earned: stats.totalMinutes >= 60, emoji: '⏰', label: t('stats.badgeHourClub') },
  ]

  return (
    <div className="px-4 pt-4 max-w-lg mx-auto pb-8 animate-fade-in">
      <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mb-6">{t('stats.title')}</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-6 stagger">
        {[
          { value: stats.sent, label: t('stats.totalSent'), gradient: 'from-[var(--pink-light)] to-[var(--pink)]', emoji: '🎤' },
          { value: stats.received, label: t('stats.totalReceived'), gradient: 'from-[var(--lavender-light)] to-[var(--lavender)]', emoji: '📥' },
          { value: `${stats.listenedRate}%`, label: t('stats.listenedRate'), gradient: 'from-[var(--mint-light)] to-[var(--mint)]', emoji: '👂' },
          { value: Math.round(stats.totalMinutes), label: t('stats.totalMinutes'), gradient: 'from-[var(--peach)] to-[var(--peach)]', emoji: '⏱️' },
        ].map((stat) => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.gradient} rounded-2xl p-5 text-center shadow-md`}>
            <p className="text-3xl font-extrabold text-[var(--text-primary)]">{stat.value}</p>
            <p className="text-xs font-bold text-[var(--text-secondary)] mt-1 flex items-center justify-center gap-1">
              <Icon emoji={stat.emoji} size={14} /> {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      <div className="glass rounded-2xl p-5 mb-6">
        <h2 className="font-extrabold text-lg text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Icon emoji="📊" size={20} /> {t('stats.thisWeek')}
        </h2>
        <div className="flex items-end justify-around h-28 gap-1">
          {stats.weeklyActivity.map((w: { day: string; count: number }) => (
            <div key={w.day} className="flex flex-col items-center flex-1">
              <div
                className="w-full max-w-[24px] rounded-full transition-all duration-500"
                style={{
                  height: Math.max(4, (w.count / maxWeeklyCount) * 96),
                  background: w.count > 0
                    ? 'linear-gradient(to top, var(--pink), var(--pink-dark))'
                    : 'var(--border)',
                  opacity: w.count > 0 ? 0.8 : 0.4,
                }}
              />
              <span className="text-[10px] font-bold text-[var(--text-muted)] mt-1.5">{w.day}</span>
              {w.count > 0 && (
                <span className="text-[10px] font-extrabold text-[var(--pink)]">{w.count}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Monthly wrap-up */}
      <div className="glass rounded-2xl p-5 mb-6">
        <h2 className="font-extrabold text-lg text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Icon emoji="🌙" size={20} /> {t('stats.thisMonth')}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: t('stats.totalSent'), value: stats.monthSent, emoji: '🎤' },
            { label: t('stats.totalReceived'), value: stats.monthReceived, emoji: '📥' },
            { label: t('stats.listenedRate'), value: `${stats.monthListenRate}%`, emoji: '👂' },
            { label: t('stats.totalMinutes'), value: Math.round(stats.monthMinutes), emoji: '⏱️' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[var(--cream)] rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-[var(--text-primary)]">{stat.value}</p>
              <p className="text-[11px] font-bold text-[var(--text-muted)] mt-1 flex items-center justify-center gap-1">
                <Icon emoji={stat.emoji} size={12} /> {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Badges */}
      <div className="glass rounded-2xl p-5">
        <h2 className="font-extrabold text-lg text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Icon emoji="🏆" size={20} /> {t('stats.badges')}
        </h2>
        <div className="flex flex-wrap gap-2 stagger">
          {badges.filter((b) => b.earned).length === 0 ? (
            <p className="text-sm italic text-[var(--text-muted)]">{t('stats.noData')}</p>
          ) : (
            badges.filter((b) => b.earned).map((badge) => (
              <span
                key={badge.label}
                className="bg-gradient-to-r from-[var(--pink-light)] to-[var(--lavender-light)] rounded-full px-4 py-2 text-sm font-bold text-[var(--text-primary)] shadow-sm flex items-center gap-1.5"
              >
                <Icon emoji={badge.emoji} size={16} /> {badge.label}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRants } from '../store/RantContext'
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, format } from 'date-fns'
import { enUS, el } from 'date-fns/locale'
import type { Locale } from 'date-fns'
import Icon from '../components/Icon'

const LOCALE_MAP: Record<string, Locale> = { en: enUS, el }
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarPage() {
  const { t, i18n } = useTranslation()

  useEffect(() => {
    document.title = `${t('calendar.title')} — GoaTalk`
  }, [t])

  const navigate = useNavigate()
  const { rants } = useRants()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const locale = LOCALE_MAP[i18n.language] || enUS

  const days = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  }, [currentMonth])

  const startPadding = getDay(startOfMonth(currentMonth))

  const rantsByDate = useMemo(() => {
    const map: Record<string, typeof rants> = {}
    for (const r of rants) {
      const key = format(new Date(r.createdAt), 'yyyy-MM-dd')
      if (!map[key]) map[key] = []
      map[key].push(r)
    }
    return map
  }, [rants])

  const selectedRants = rantsByDate[format(selectedDate, 'yyyy-MM-dd')] ?? []

  return (
    <div className="px-4 pt-4 max-w-lg mx-auto animate-fade-in">
      <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mb-4">{t('calendar.title')}</h1>

      {/* Month nav */}
      <div className="glass rounded-2xl p-3 mb-4">
        <div className="flex justify-between items-center px-2">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className="text-base text-[var(--pink)] font-bold w-10 h-10 rounded-full hover:bg-[var(--pink-light)] transition-colors flex items-center justify-center">
            ◀
          </button>
          <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
            {format(currentMonth, 'MMMM yyyy', { locale })}
          </h2>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            className="text-base text-[var(--pink)] font-bold w-10 h-10 rounded-full hover:bg-[var(--pink-light)] transition-colors flex items-center justify-center">
            ▶
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="flex mb-2 px-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="flex-1 text-center text-xs font-bold text-[var(--text-muted)]">{day}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="flex flex-wrap mb-6">
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} className="w-[calc(100%/7)] aspect-square" />
        ))}
        {days.map((day: Date) => {
          const key = format(day, 'yyyy-MM-dd')
          const hasRants = !!rantsByDate[key]
          const isSelectedDate = isSameDay(day, selectedDate)
          const isTodayDate = isToday(day)

          return (
            <button
              key={key}
              onClick={() => setSelectedDate(day)}
              className={`w-[calc(100%/7)] aspect-square flex flex-col items-center justify-center relative transition-all active:scale-90 ${
                isSelectedDate
                  ? 'bg-gradient-to-br from-[var(--pink-light)] to-[var(--pink)] rounded-full shadow-md'
                  : 'hover:bg-[var(--pink-light)]/30 rounded-full'
              }`}
            >
              <span className={`text-sm font-bold ${isSelectedDate ? 'text-[var(--pink-dark)]' : isTodayDate ? 'text-[var(--pink)]' : 'text-[var(--text-primary)]'}`}>
                {format(day, 'd')}
              </span>
              {hasRants && (
                <span className={`absolute bottom-1 ${isSelectedDate ? 'opacity-90' : ''}`}><Icon emoji="🌸" size={9} /></span>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day rants */}
      <div className="animate-fade-in-up">
        <h3 className="font-extrabold text-lg text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <Icon emoji="📅" />
          {isToday(selectedDate) ? t('calendar.today') : format(selectedDate, 'MMM d, yyyy', { locale })}
        </h3>
        {selectedRants.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-sm text-[var(--text-muted)] italic">{t('calendar.noRants')}</p>
          </div>
        ) : (
          <div className="space-y-2 stagger">
            {selectedRants.map((rant) => (
              <button
                key={rant.id}
                onClick={() => navigate(`/rant/${rant.id}`)}
                className="w-full flex items-center gap-3 glass rounded-2xl p-4 text-left active:scale-[0.98] transition-all hover:shadow-lg"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  rant.direction === 'sent' ? 'bg-[var(--pink-light)]' : 'bg-[var(--lavender-light)]'
                }`}>
                  {rant.direction === 'sent' ? <Icon emoji="📤" size={18} /> : <Icon emoji="📥" size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-muted)]">
                    <Icon emoji="🎵" size={12} /> {Math.floor(rant.durationSec / 60)}m {rant.durationSec % 60}s
                  </p>
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate mt-0.5">
                    {rant.editedTranscript || rant.transcript || <Icon emoji="🎤" size={14} />}
                  </p>
                </div>
                <span className="text-sm">{rant.direction === 'sent' ? <Icon emoji="🧑" size={14} /> : <Icon emoji="🌸" size={14} />}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

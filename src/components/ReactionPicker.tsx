import { EMOJI_PICKER } from '../theme'
import type { Rant } from '../types'

interface Props {
  rant: Rant
  onToggle: (emoji: string) => void
}

export default function ReactionPicker({ rant, onToggle }: Props) {
  const userReactions = rant.reactions.map((r) => r.emoji)

  return (
    <div className="glass rounded-2xl p-4 animate-fade-in">
      <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
        Reactions
      </p>

      {rant.reactions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {[...new Map(rant.reactions.map((r) => [r.emoji, r])).values()].map((r, i) => {
            const count = rant.reactions.filter((x) => x.emoji === r.emoji).length
            return (
              <button
                key={`${r.emoji}-${i}`}
                onClick={() => onToggle(r.emoji)}
                className="group bg-[var(--cream)] rounded-full px-3 py-1 text-lg active:scale-90 transition-all hover:bg-[var(--pink-light)] flex items-center gap-1"
              >
                <span>{r.emoji}</span>
                {count > 1 && (
                  <span className="text-xs font-bold text-[var(--text-muted)]">{count}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--border)]">
        {EMOJI_PICKER.map((emoji) => {
          const isActive = userReactions.includes(emoji)
          return (
            <button
              key={emoji}
              onClick={() => onToggle(emoji)}
              className={`p-1.5 rounded-full text-xl transition-all active:scale-90 hover:scale-110 ${
                isActive
                  ? 'bg-gradient-to-br from-[var(--pink-light)] to-[var(--pink)] border-2 border-[var(--pink-dark)] shadow-sm'
                  : 'bg-[var(--cream)] hover:bg-[var(--pink-light)]'
              }`}
            >
              {emoji}
            </button>
          )
        })}
      </div>
    </div>
  )
}

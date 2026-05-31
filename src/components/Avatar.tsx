interface Props {
  emoji: string
  size?: number
  className?: string
}

export default function Avatar({ emoji, size = 32, className = '' }: Props) {
  const isImage = emoji.startsWith('data:image/')
  const containerClass = `rounded-full flex items-center justify-center overflow-hidden ${className}`

  if (isImage) {
    return (
      <div
        className={containerClass}
        style={{ width: size, height: size }}
      >
        <img src={emoji} alt="" className="w-full h-full object-cover" />
      </div>
    )
  }

  return (
    <div
      className={containerClass}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
    >
      {emoji}
    </div>
  )
}

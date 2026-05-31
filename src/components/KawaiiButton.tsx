import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children?: ReactNode
}

export default function KawaiiButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: Props) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm rounded-xl',
    md: 'px-6 py-3 text-base rounded-2xl',
    lg: 'px-8 py-4 text-lg rounded-3xl',
  }

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-[var(--pink)] to-[var(--pink-dark)] text-white shadow-lg shadow-[var(--pink-dark)]/30 font-bold hover:shadow-xl hover:shadow-[var(--pink-dark)]/40 hover:scale-[1.02] active:scale-95 transition-all',
    secondary:
      'bg-[var(--lavender-light)] text-[var(--lavender)] font-bold hover:brightness-95 active:scale-95 transition-all',
    outline:
      'bg-transparent border-2 border-[var(--pink)] text-[var(--pink)] font-bold hover:bg-[var(--pink-light)]/30 active:scale-95 transition-all',
    ghost:
      'bg-transparent text-[var(--pink)] font-semibold hover:bg-[var(--pink-light)]/20 active:scale-95 transition-all',
  }

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:pointer-events-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  )
}

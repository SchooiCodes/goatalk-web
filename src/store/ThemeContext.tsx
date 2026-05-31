import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

type Scheme = 'light' | 'dark'

export const THEMES = [
  { id: 'kawaii', label: 'Kawaii', emoji: '🌸' },
  { id: 'pastel', label: 'Pastel', emoji: '🎀' },
  { id: 'midnight', label: 'Midnight', emoji: '🌙' },
  { id: 'ocean', label: 'Ocean', emoji: '🌊' },
  { id: 'forest', label: 'Forest', emoji: '🌿' },
] as const

type ThemeId = (typeof THEMES)[number]['id']

interface ThemeContextType {
  scheme: Scheme
  theme: ThemeId
  toggle: () => void
  setTheme: (id: ThemeId) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType>(null!)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [scheme, setScheme] = useState<Scheme>(() => {
    try {
      const stored = localStorage.getItem('goatalk_scheme')
      if (stored === 'dark' || stored === 'light') return stored
    } catch {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      const stored = localStorage.getItem('goatalk_theme')
      if (THEMES.some((t) => t.id === stored)) return stored as ThemeId
    } catch {}
    return 'kawaii'
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', scheme === 'dark')
    THEMES.forEach((t) => root.classList.toggle(`theme-${t.id}`, t.id === theme))
    localStorage.setItem('goatalk_scheme', scheme)
    localStorage.setItem('goatalk_theme', theme)
  }, [scheme, theme])

  const toggle = useCallback(() => {
    setScheme((s) => (s === 'light' ? 'dark' : 'light'))
  }, [])

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id)
  }, [])

  return (
    <ThemeContext.Provider value={{ scheme, theme, toggle, setTheme, isDark: scheme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

'use client'

import { createContext, useContext, useState, useEffect } from 'react'

export type Lang = 'uk' | 'en'

interface AppState {
  lang:        Lang
  dark:        boolean
  toggleLang:  () => void
  toggleTheme: () => void
}

const AppCtx = createContext<AppState>({
  lang: 'uk', dark: false, toggleLang: () => {}, toggleTheme: () => {},
})

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')
  const [dark, setDark] = useState(false)

  // Read preferences once on mount (localStorage is client-only)
  useEffect(() => {
    const stored = localStorage.getItem('svii-lang') as Lang | null
    if (stored === 'uk' || stored === 'en') setLang(stored)
    const isDark = localStorage.getItem('svii-theme') === 'dark'
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  function toggleLang() {
    setLang(prev => {
      const next: Lang = prev === 'uk' ? 'en' : 'uk'
      localStorage.setItem('svii-lang', next)
      return next
    })
  }

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('svii-theme', next ? 'dark' : 'light')
  }

  return (
    <AppCtx.Provider value={{ lang, dark, toggleLang, toggleTheme }}>
      {children}
    </AppCtx.Provider>
  )
}

export function useApp() {
  return useContext(AppCtx)
}

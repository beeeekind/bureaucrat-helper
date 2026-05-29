'use client'

import { useApp } from '@/app/providers'
import type { Lang } from '@/app/providers'

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M11.5 8.5A5 5 0 1 1 5.5 2.5a3.5 3.5 0 0 0 6 6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  )
}

const TAGLINE: Record<Lang, string> = {
  uk: 'Ваш бюрократ помічник',
  en: 'Your bureaucracy assistant',
}

const LANG_TOGGLE: Record<Lang, string> = {
  uk: 'EN',
  en: 'УКР',
}

export function SiteHeader() {
  const { lang, dark, toggleLang, toggleTheme } = useApp()

  return (
    <header style={{
      flexShrink: 0,
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: '16px 24px 14px',
      position: 'relative',
      zIndex: 10,
    }}>

      {/* Logo + tagline — left column */}
      <div>
        <span style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.22em',
          color: 'var(--text-2)',
          textTransform: 'uppercase',
          lineHeight: 1,
        }}>
          S V I I
        </span>
        <span style={{
          display: 'block',
          fontSize: '11px',
          color: 'var(--text-3)',
          marginTop: '4px',
          lineHeight: 1,
        }}>
          {TAGLINE[lang]}
        </span>
      </div>

      {/* Controls — right column, aligned to first line of logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '1px' }}>
        <button
          onClick={toggleLang}
          style={{
            fontSize: '11px', fontWeight: 500,
            color: 'var(--text-3)', background: 'none', border: 'none',
            cursor: 'pointer', transition: 'color 0.28s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
        >
          {LANG_TOGGLE[lang]}
        </button>

        <button
          onClick={toggleTheme}
          title={dark ? 'Light mode' : 'Dark mode'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28,
            color: 'var(--text-3)', background: 'none', border: 'none',
            cursor: 'pointer', transition: 'color 0.28s ease',
            marginTop: '-7px',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

    </header>
  )
}

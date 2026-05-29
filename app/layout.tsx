import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AppProviders } from './providers'
import { SiteHeader } from '@/components/header'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'SVII',
  description: 'Ваш помічник з офіційними документами.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F3EE' },
    { media: '(prefers-color-scheme: dark)',  color: '#0D0C0A' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme before hydration */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){if(localStorage.getItem('svii-theme')==='dark'){document.documentElement.classList.add('dark')}})()` }} />
      </head>
      <body>
        <AppProviders>
          <SiteHeader />
          {children}
        </AppProviders>
        <Analytics />
      </body>
    </html>
  )
}

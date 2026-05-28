import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Бюрократ-хелпер',
  description: 'Завантажте офіційний документ — отримайте людське пояснення.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uk" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
      <Analytics />
    </html>
  )
}

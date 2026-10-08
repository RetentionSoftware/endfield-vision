import 'endfield-vision/styles.css'
import './globals.css'
import { ThemeScript } from 'endfield-vision'
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import type { ReactNode } from 'react'
import { Providers } from './providers'

// Шрифты - CSS-переменные; токены библиотеки читают их через --ev-font-sans / --ev-font-mono.
const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter', display: 'swap' })
const mono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: { default: 'Endfield Vision', template: '%s - Endfield Vision' },
  description: 'Демо-консоль и витрина компонентов библиотеки Endfield Vision',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0e14',
  colorScheme: 'dark light',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" data-theme="dark" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Тема и акцент до первой отрисовки: без вспышки. */}
        <ThemeScript />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

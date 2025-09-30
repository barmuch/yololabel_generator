import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'
// SessionProvider must be used in a Client Component wrapper
import Providers from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Excellence AI',
  description: 'Excellence AI – Professional YOLO dataset annotation tool',
  manifest: '/manifest.json',
  icons: {
    icon: '/Vector.png',
    shortcut: '/Vector.png',
    apple: '/Vector.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
        <Toaster
          position="top-right"
          richColors
          closeButton
          expand
          visibleToasts={5}
        />
      </body>
    </html>
  )
}

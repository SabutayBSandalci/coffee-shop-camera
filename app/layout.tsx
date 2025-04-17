import { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kahve Dükkanı Kamera',
  description: 'Kahve dükkanı müşteri fotoğraf uygulaması',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}

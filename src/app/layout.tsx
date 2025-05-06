import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Outrage - Contact Your Representatives',
  description: 'Quickly send emails to your elected representatives in the US about issues you care about.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
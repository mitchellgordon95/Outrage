import './globals.css'
import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title: 'Outrage - Contact Your Representatives',
  description: 'Quickly send emails to your elected representatives in the US about issues you care about.',
  verification: {
    google: 'MaZ2MiM1lLOvhnjnEUi2RtQJ6eVUYlvUEBsGWj8fgbY',
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/icon-512x512.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <div className="flex-grow">
            {children}
          </div>
          <footer className="bg-gray-100 border-t border-gray-200 py-4 px-4 mt-8">
            <div className="max-w-4xl mx-auto text-center">
              <a 
                href="mailto:contact@outrage.gg?subject=Outrage%20Feedback"
                className="text-gray-600 hover:text-primary underline"
              >
                Contact Us
              </a>
            </div>
          </footer>
        </div>
        <Analytics />
      </body>
    </html>
  )
}
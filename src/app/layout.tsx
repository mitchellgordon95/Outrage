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
            <div className="max-w-4xl mx-auto text-center flex items-center justify-center gap-4">
              <a 
                href="mailto:contact@outrage.gg?subject=Outrage%20Feedback"
                className="text-gray-600 hover:text-primary underline"
              >
                Contact Us
              </a>
              <span className="text-gray-400">•</span>
              <a 
                href="https://github.com/mitchellgordon95/Outrage"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-primary flex items-center gap-1"
              >
                <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                GitHub
              </a>
            </div>
          </footer>
        </div>
        <Analytics />
      </body>
    </html>
  )
}
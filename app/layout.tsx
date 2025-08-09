import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GGBench - AI Graphics Evaluation Platform',
  description: 'A platform for comparing AI-generated graphics through community voting and ELO-based rankings.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent theme flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
            (function(){
              try {
                var stored = localStorage.getItem('theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var theme = stored ? stored : (prefersDark ? 'dark' : 'light');
                if (theme === 'dark') document.documentElement.classList.add('dark');
              } catch(_) {}
            })();
          `}}
        />
      </head>
      <body className={`${inter.className} bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100`}>
        <Navigation />
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
} 
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Sidebar } from '@/components/sidebar'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'Schwarz Management Consulting - IT-Management Consulting',
  description: 'Über 30 Jahre Erfahrung in IT-Service-Management, Prozessoptimierung und Projektmanagement für Banken, öffentlichen Dienst und Industrie.',
  keywords: 'IT-Management, Consulting, ITIL, Projektmanagement, Prozessmanagement, ITSM, Banken, öffentlicher Dienst',
  authors: [{ name: 'Thomas Schwarz' }],
  openGraph: {
    title: 'Schwarz Management Consulting',
    description: 'Über 30 Jahre Erfahrung in IT-Management Consulting',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <div className="flex min-h-screen">
            {/* Sidebar */}
            <Sidebar />
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col lg:ml-16 transition-all duration-300">
              <Header />
              <main className="flex-1 pt-16 sm:pt-20 lg:pt-24 relative z-0">
                {children}
              </main>
              <Footer />
            </div>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}

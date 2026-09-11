import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ApiInitializer from '@/components/ApiInitializer';

const inter  = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'AXumia Learnings — Premier Online Learning Platform',
    template: '%s | AXumia Learnings',
  },
  description: 'Book live 1-on-1 tutoring sessions or enroll in expert-led courses with AXumia Learnings. Pay via Telebirr, CBE Birr, or card. Learn in Amharic, English, or global languages.',
  keywords: ['AXumia Learnings', 'online learning ethiopia', 'amharic courses', 'tutoring ethiopia', 'telebirr education', 'ethiopian e-learning'],
  authors: [{ name: 'AXumia Learnings' }],
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'AXumia Learnings — Premier Online Learning Platform',
    description: 'Learn from premier instructors. Live tutoring & expert-led courses on AXumia Learnings.',
    type: 'website',
    locale: 'am_ET',
    siteName: 'AXumia Learnings',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AXumia Learnings',
    description: 'Learn from premier instructors with AXumia Learnings.',
  },
  robots: { index: true, follow: true },
};

import { LanguageProvider } from '@/context/LanguageContext';
import { ThemeProvider } from '@/context/ThemeContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="am" className={`${inter.variable} ${outfit.variable}`} data-theme="dark">
      <body style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <ToastProvider>
                {/* Wires toast + session-expiry into the global API client */}
                <ApiInitializer />
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </ToastProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

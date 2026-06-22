import type { Metadata } from 'next';
import AuthProvider from '@/components/AuthProvider';
import { PublicBanner } from '@/components/PublicBanner';
import { getServerMode } from '@/lib/mode';
import './globals.css';

export function generateMetadata(): Metadata {
  const mode = getServerMode();
  return {
    title: mode === 'public' ? 'BK-OS — public demo' : 'BK-OS',
    description: mode === 'public'
      ? 'A retro Win98 personal OS, public demo. Build by Bailey King in Brisbane.'
      : 'Personal OS shell for the mini-PC under my desk.',
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <PublicBanner />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

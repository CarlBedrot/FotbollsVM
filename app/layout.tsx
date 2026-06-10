import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';
import { RegisterSW } from '@/components/RegisterSW';
import { ThemeScript } from '@/components/ThemeScript';

export const metadata: Metadata = {
  title: 'VM-tipset 2026',
  description: 'Kompisgängets VM-tips 2026',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <head>
        <ThemeScript />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <RegisterSW />
        <div className="container">
          <Nav />
          {children}
        </div>
      </body>
    </html>
  );
}

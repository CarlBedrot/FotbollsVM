import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'VM-tipset 2026',
  description: 'Kompisgängets VM-tips 2026',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Anton&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="max-w-[1080px] mx-auto px-4 py-5 pb-16">
          <Nav />
          {children}
        </div>
      </body>
    </html>
  );
}

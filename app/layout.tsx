import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Bunting } from "@/components/Bunting";
import { RegisterSW } from "@/components/RegisterSW";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ThemeScript } from "@/components/ThemeScript";
import { PlayerCardProvider } from "@/components/PlayerCardProvider";

export const metadata: Metadata = {
  title: "VM-tipset 2026",
  description: "Kompisgängets VM-tips 2026",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <RegisterSW />
        <AutoRefresh />
        <PlayerCardProvider>
          <div className="container">
            <Nav />
            <Bunting />
            {children}
          </div>
        </PlayerCardProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Barlow_Condensed, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Bunting } from "@/components/Bunting";
import { RegisterSW } from "@/components/RegisterSW";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ThemeScript } from "@/components/ThemeScript";
import { PlayerCardProvider } from "@/components/PlayerCardProvider";
import { currentUser } from "@/lib/auth/currentUser";

// Self-hostade via next/font: ingen render-blockerande request mot Google och
// ingen layout-shift. CSS:en refererar dem genom var(--font-display/--font-body).
const displayFont = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
const bodyFont = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VM-tipset 2026",
  description: "Kompisgängets VM-tips 2026",
  manifest: "/manifest.webmanifest",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  return (
    <html
      lang="sv"
      suppressHydrationWarning
      className={`${displayFont.variable} ${bodyFont.variable}`}
    >
      <head>
        <ThemeScript />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <RegisterSW />
        <AutoRefresh />
        <PlayerCardProvider>
          <div className="container">
            <Nav isAdmin={Boolean(user?.isAdmin)} />
            <Bunting />
            {children}
          </div>
        </PlayerCardProvider>
      </body>
    </html>
  );
}

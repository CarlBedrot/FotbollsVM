import type { Metadata } from "next";
import { Barlow_Condensed, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { Nav, type NavUser } from "@/components/Nav";
import { BottomNav } from "@/components/BottomNav";
import { Bunting } from "@/components/Bunting";
import { RegisterSW } from "@/components/RegisterSW";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ThemeScript } from "@/components/ThemeScript";
import { PlayerCardProvider } from "@/components/PlayerCardProvider";
import { currentUser } from "@/lib/auth/currentUser";
import { getUserRepository } from "@/lib/db/repository";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
  const session = await currentUser();
  // Navigeringen ska finnas för varje inloggad session — den får aldrig hänga
  // på att profil-uppslaget lyckas (övergående db-fel, eller en session vars
  // record saknas). Profilen berikar bara avataren; faller annars tillbaka på
  // användarnamnets initialer.
  let navUser: NavUser | null = null;
  if (session) {
    const record = await getUserRepository()
      .findById(session.userId)
      .catch(() => null);
    navUser = {
      displayName: record?.displayName ?? session.username,
      color: record?.color ?? "var(--clay)",
      avatarUrl: record?.avatarUrl ?? null,
      isAdmin: session.isAdmin,
    };
  }
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
            <Nav user={navUser} />
            <Bunting />
            {children}
          </div>
          {navUser && <BottomNav />}
        </PlayerCardProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

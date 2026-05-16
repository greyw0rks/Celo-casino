import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/shared/Nav";

export const metadata: Metadata = {
  title: "Celo Casino — Play & Earn on Celo",
  description: "Crash, Prediction Markets, Chess Wager & Blackjack — powered by USDm on Celo",
  other: {
    // Talent Protocol verification (update with your actual meta tag)
    "talent-verify": "3a3da2faff10b6098fa503b18131121f856a0df5c7b7086162117c147757e99ac0178c8ecb4d41006874ec27c1c3c89cc1e0639e37c30954df19313fa2885bea",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-grid min-h-screen">
        <Providers>
          <Nav />
          <main className="pt-16 md:pt-16">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

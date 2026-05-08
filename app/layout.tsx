import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/shared/Nav";

export const metadata: Metadata = {
  title: "Celo Casino — Play & Earn on Celo",
  description: "Crash, Prediction Markets, Chess Wager & Blackjack — powered by USDm on Celo",
  other: {
    // Talent Protocol verification (update with your actual meta tag)
    "talent-verify": "your-talent-protocol-verification-token",
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

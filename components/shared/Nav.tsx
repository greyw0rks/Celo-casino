"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletBar } from "./WalletBar";

const GAMES = [
  { href: "/crash",      label: "CRASH",      icon: "📈" },
  { href: "/prediction", label: "PREDICT",    icon: "🎯" },
  { href: "/chess",      label: "CHESS",      icon: "♟️" },
  { href: "/blackjack",  label: "BLACKJACK",  icon: "🃏" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-casino-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-casino-gold flex items-center justify-center text-casino-bg font-display font-black text-xs">
            CC
          </div>
          <span className="font-display font-bold text-casino-gold text-sm tracking-widest group-hover:text-glow-gold transition-all">
            CELO CASINO
          </span>
        </Link>

        {/* Game Links */}
        <div className="hidden md:flex items-center gap-1">
          {GAMES.map((g) => {
            const active = pathname === g.href;
            return (
              <Link
                key={g.href}
                href={g.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-display font-semibold tracking-wider transition-all ${
                  active
                    ? "bg-casino-gold/10 text-casino-gold border border-casino-gold/30"
                    : "text-casino-muted hover:text-casino-text hover:bg-white/5"
                }`}
              >
                <span>{g.icon}</span>
                {g.label}
              </Link>
            );
          })}
        </div>

        {/* Wallet */}
        <WalletBar />
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex border-t border-casino-border">
        {GAMES.map((g) => {
          const active = pathname === g.href;
          return (
            <Link
              key={g.href}
              href={g.href}
              className={`flex-1 flex flex-col items-center py-2 text-[10px] font-display font-bold tracking-wider transition-all ${
                active ? "text-casino-gold bg-casino-gold/5" : "text-casino-muted"
              }`}
            >
              <span className="text-lg">{g.icon}</span>
              {g.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

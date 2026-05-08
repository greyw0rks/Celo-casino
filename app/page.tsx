"use client";

import Link from "next/link";
import { useMiniPay } from "@/hooks/useMiniPay";

const GAMES = [
  {
    href:     "/crash",
    title:    "CRASH",
    subtitle: "Ride the multiplier. Cash out before it crashes.",
    icon:     "📈",
    color:    "from-green-900/40 to-green-950/40",
    border:   "border-casino-neon/30",
    badge:    "LIVE",
    badgeColor: "bg-casino-neon/20 text-casino-neon border-casino-neon/40",
    stats:    ["Min: 0.1 USDm", "Max: 100 USDm", "3% edge"],
  },
  {
    href:     "/prediction",
    title:    "PREDICT",
    subtitle: "Bet on crypto prices, football, and world events.",
    icon:     "🎯",
    color:    "from-blue-900/40 to-blue-950/40",
    border:   "border-casino-blue/30",
    badge:    "HOT",
    badgeColor: "bg-casino-blue/20 text-casino-blue border-casino-blue/40",
    stats:    ["Min: 0.5 USDm", "Max: 500 USDm", "5% fee"],
  },
  {
    href:     "/chess",
    title:    "CHESS WAGER",
    subtitle: "Challenge anyone. Stake USDm. Winner takes all.",
    icon:     "♟️",
    color:    "from-purple-900/40 to-purple-950/40",
    border:   "border-casino-purple/30",
    badge:    "P2P",
    badgeColor: "bg-casino-purple/20 text-casino-purple border-casino-purple/40",
    stats:    ["Min: 1 USDm", "Max: 1000 USDm", "5% fee"],
  },
  {
    href:     "/blackjack",
    title:    "BLACKJACK",
    subtitle: "Beat the dealer. Natural 21 pays 3:2.",
    icon:     "🃏",
    color:    "from-amber-900/40 to-amber-950/40",
    border:   "border-casino-gold/30",
    badge:    "CLASSIC",
    badgeColor: "bg-casino-gold/20 text-casino-gold border-casino-gold/40",
    stats:    ["Min: 0.5 USDm", "Max: 200 USDm", "2% edge"],
  },
];

export default function Home() {
  const { isConnected, connectWallet, usdmBalance, isConnecting } = useMiniPay();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 pt-20 pb-16 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full bg-casino-gold/5 blur-[120px]" />
        </div>

        {/* Floating chips decoration */}
        <div className="absolute top-24 left-10 text-4xl animate-float opacity-30" style={{ animationDelay: "0s" }}>🎰</div>
        <div className="absolute top-32 right-12 text-3xl animate-float opacity-20" style={{ animationDelay: "1s" }}>💰</div>
        <div className="absolute bottom-12 left-16 text-2xl animate-float opacity-20" style={{ animationDelay: "2s" }}>🎲</div>

        <div className="relative z-10 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-casino-gold/30 bg-casino-gold/5 mb-6">
            <span className="w-2 h-2 rounded-full bg-casino-neon animate-pulse" />
            <span className="font-mono text-xs text-casino-gold tracking-widest">POWERED BY CELO · USDM</span>
          </div>

          <h1 className="font-display font-black text-6xl md:text-8xl mb-4 leading-none">
            <span className="shimmer">CELO</span>
            <br />
            <span className="text-casino-text">CASINO</span>
          </h1>

          <p className="text-casino-muted text-lg md:text-xl max-w-xl mx-auto mb-10 font-body">
            Provably fair games on Celo mainnet. <br className="hidden md:block" />
            Play with USDm. No house account needed.
          </p>

          {!isConnected ? (
            <button onClick={connectWallet} disabled={isConnecting} className="btn-gold px-8 py-3 rounded-xl text-base">
              {isConnecting ? "CONNECTING…" : "CONNECT & PLAY"}
            </button>
          ) : (
            <div className="flex items-center gap-3 justify-center">
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass border border-casino-neon/30">
                <span className="w-2 h-2 bg-casino-neon rounded-full animate-pulse" />
                <span className="font-mono text-casino-neon font-semibold">{usdmBalance} USDm</span>
              </div>
              <span className="text-casino-muted text-sm">ready to play</span>
            </div>
          )}
        </div>
      </section>

      {/* Game Grid */}
      <section className="max-w-6xl mx-auto w-full px-4 pb-20">
        <h2 className="font-display text-xs tracking-[0.3em] text-casino-muted mb-8 text-center">
          CHOOSE YOUR GAME
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {GAMES.map((game, i) => (
            <Link
              key={game.href}
              href={game.href}
              className={`group relative rounded-2xl bg-gradient-to-br ${game.color} border ${game.border} p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl overflow-hidden animate-slide-up`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Background icon */}
              <div className="absolute -right-4 -bottom-4 text-8xl opacity-10 group-hover:opacity-20 transition-opacity select-none">
                {game.icon}
              </div>

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-4xl">{game.icon}</span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-md border ${game.badgeColor} tracking-wider`}>
                    {game.badge}
                  </span>
                </div>

                <h3 className="font-display font-bold text-xl text-casino-text mb-1 tracking-wider">
                  {game.title}
                </h3>
                <p className="text-casino-muted text-sm mb-5 leading-relaxed">{game.subtitle}</p>

                <div className="flex items-center gap-4">
                  {game.stats.map((s) => (
                    <span key={s} className="text-[10px] font-mono text-casino-muted bg-white/5 px-2 py-1 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-casino-border py-8 text-center">
        <p className="font-mono text-xs text-casino-muted">
          Built on{" "}
          <a href="https://celo.org" target="_blank" className="text-casino-gold hover:underline">Celo</a>
          {" "}· Provably fair · Open source
        </p>
      </footer>
    </div>
  );
}

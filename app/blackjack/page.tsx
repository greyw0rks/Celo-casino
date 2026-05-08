"use client";

import { useState } from "react";
import { useBlackjack, cardLabel } from "@/hooks/useBlackjack";
import { useMiniPay } from "@/hooks/useMiniPay";

// ── Playing Card Component ───────────────────────────────────────────────────

function PlayingCard({ card, hidden = false, small = false }: { card?: number; hidden?: boolean; small?: boolean }) {
  const size = small ? "w-12 h-16" : "w-16 h-24";

  if (hidden || card === undefined) {
    return (
      <div className={`${size} rounded-lg border-2 border-casino-border shadow-lg flex items-center justify-center`}
           style={{ background: "repeating-linear-gradient(45deg, #1E1E3A 0px, #1E1E3A 5px, #141428 5px, #141428 10px)" }}>
        <span className="text-casino-gold text-xl">🂠</span>
      </div>
    );
  }

  const { rank, suit, isRed } = cardLabel(card);

  return (
    <div className={`${size} bg-white rounded-lg border-2 border-gray-200 shadow-lg flex flex-col justify-between p-1.5 relative`}>
      <div className={`text-sm font-bold leading-none font-mono ${isRed ? "text-red-600" : "text-gray-900"}`}>
        <div>{rank}</div>
        <div>{suit}</div>
      </div>
      <div className={`text-center text-lg leading-none ${isRed ? "text-red-600" : "text-gray-900"}`}>
        {suit}
      </div>
      <div className={`text-sm font-bold leading-none font-mono rotate-180 ${isRed ? "text-red-600" : "text-gray-900"}`}>
        <div>{rank}</div>
        <div>{suit}</div>
      </div>
    </div>
  );
}

function CardHand({ cards, hidden = false, total, label }: {
  cards: number[];
  hidden?: boolean;
  total?: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="font-display text-xs tracking-widest text-casino-muted">{label}</span>
        {total !== undefined && total > 0 && !hidden && (
          <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded-md ${
            total > 21 ? "bg-casino-red/20 text-casino-red" :
            total === 21 ? "bg-casino-gold/20 text-casino-gold" :
            "bg-white/10 text-casino-text"
          }`}>
            {total > 21 ? "BUST" : total}
          </span>
        )}
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        {cards.map((card, i) => (
          <PlayingCard
            key={i}
            card={card}
            hidden={hidden && i === 0}
          />
        ))}
        {cards.length === 0 && (
          <div className="w-16 h-24 rounded-lg border-2 border-dashed border-casino-border/40 flex items-center justify-center">
            <span className="text-casino-muted/40 text-2xl">🂠</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Result Banner ────────────────────────────────────────────────────────────

function ResultBanner({ session, bet }: { session: any; bet: string }) {
  if (!session || session.state !== 3) return null; // 3 = SETTLED

  const { playerTotal, dealerTotal, isBlackjack, playerBust } = session;
  const betNum = parseFloat(bet);

  let result: { label: string; sub: string; color: string; payout: string };

  if (playerBust) {
    result = { label: "BUST", sub: "Better luck next time", color: "text-casino-red", payout: `-${betNum.toFixed(2)} USDm` };
  } else if (isBlackjack) {
    result = { label: "BLACKJACK! 🎉", sub: "Natural 21 — pays 3:2", color: "text-casino-gold", payout: `+${(betNum * 1.5 * 0.98).toFixed(2)} USDm` };
  } else if (playerTotal > dealerTotal || dealerTotal > 21) {
    result = { label: "YOU WIN! 🏆", sub: "Beat the dealer", color: "text-casino-neon", payout: `+${(betNum * 0.98).toFixed(2)} USDm` };
  } else if (playerTotal === dealerTotal) {
    result = { label: "PUSH", sub: "It's a tie — bet returned", color: "text-casino-muted", payout: "±0 USDm" };
  } else {
    result = { label: "DEALER WINS", sub: "House edge at work", color: "text-casino-red", payout: `-${betNum.toFixed(2)} USDm` };
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl z-10">
      <div className="text-center animate-slide-up">
        <div className={`font-display font-black text-5xl mb-2 ${result.color}`}>{result.label}</div>
        <div className="text-casino-muted text-sm mb-3">{result.sub}</div>
        <div className={`font-mono font-bold text-2xl ${result.color}`}>{result.payout}</div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

const QUICK_BETS = ["0.5", "1", "2", "5", "10", "25"];

export default function BlackjackPage() {
  const { isConnected, connectWallet } = useMiniPay();
  const {
    betAmount, setBetAmount,
    session, houseBalance,
    startGame, hit, stand,
    isTxPending, isApproving,
  } = useBlackjack();

  const [showRules, setShowRules] = useState(false);

  const isPlaying  = session && session.state === 1; // PLAYER_TURN
  const isDealing  = session && session.state === 2; // DEALER_TURN (pending reveal)
  const isSettled  = session && session.state === 3;
  const canPlay    = !session || session.state === 3 || session.state === 0;
  const canHit     = isPlaying;
  const canStand   = isPlaying;

  return (
    <div className="min-h-screen pt-4 pb-20">
      {/* Felt table */}
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-black text-2xl text-casino-gold text-glow-gold tracking-widest">BLACKJACK</h1>
            <p className="text-casino-muted text-xs font-mono mt-1">Beat the dealer · Natural 21 pays 3:2</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowRules(!showRules)} className="text-casino-muted text-xs font-mono hover:text-casino-text transition-colors">
              {showRules ? "HIDE RULES" : "HOW TO PLAY"}
            </button>
            <div className="text-xs font-mono text-casino-muted glass px-3 py-1.5 rounded-lg border border-casino-border">
              House: {houseBalance} USDm
            </div>
          </div>
        </div>

        {/* Rules */}
        {showRules && (
          <div className="glass rounded-2xl border border-casino-border p-5 mb-5 animate-fade-in">
            <h3 className="font-display text-xs tracking-widest text-casino-muted mb-3">RULES</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              {[
                "Get closer to 21 than the dealer without going over.",
                "Face cards (J, Q, K) are worth 10.",
                "Ace is worth 11 or 1, whichever is better.",
                "Dealer must hit until they reach 17 or more.",
                "Blackjack (A + 10-value) pays 3:2.",
                "If both bust or tie, it's a push (bet returned).",
              ].map((r) => (
                <div key={r} className="flex items-start gap-2 text-xs text-casino-muted">
                  <span className="text-casino-gold mt-0.5">◆</span> {r}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game Table */}
        <div className="felt-bg rounded-3xl p-6 md:p-8 relative min-h-[480px] flex flex-col">
          {/* Table label */}
          <div className="text-center mb-6">
            <span className="font-display text-[10px] tracking-[0.4em] text-white/20">CELO CASINO · BLACKJACK · PAYS 3 TO 2</span>
          </div>

          {/* Dealer */}
          <div className="flex justify-center mb-10">
            <CardHand
              cards={session?.dealerCards ?? []}
              hidden={!!isPlaying}
              total={isPlaying ? undefined : session?.dealerTotal}
              label="DEALER"
            />
          </div>

          {/* Divider */}
          <div className="w-full border-t border-white/10 mb-10 relative">
            <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 px-4 bg-transparent">
              <span className="font-display text-[10px] tracking-[0.3em] text-white/20">VS</span>
            </span>
          </div>

          {/* Player */}
          <div className="flex justify-center mb-6">
            <CardHand
              cards={session?.playerCards ?? []}
              total={session?.playerTotal}
              label="YOU"
            />
          </div>

          {/* Result overlay */}
          {isSettled && <ResultBanner session={session} bet={session.bet} />}

          {/* Waiting for dealer */}
          {isDealing && !isSettled && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-3xl">
              <div className="text-center">
                <div className="font-display text-casino-gold text-lg animate-pulse">Dealer revealing…</div>
                <div className="text-casino-muted text-xs font-mono mt-1">Admin finalizing round on-chain</div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-5 glass rounded-2xl border border-casino-border p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Bet */}
            <div>
              <label className="text-xs font-mono text-casino-muted mb-2 block tracking-wider">BET AMOUNT (USDm)</label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                min="0.5"
                max="200"
                step="0.5"
                disabled={!canPlay}
                className="w-full bg-casino-bg border border-casino-border rounded-xl px-4 py-3 text-casino-text font-mono text-xl focus:outline-none focus:border-casino-gold disabled:opacity-40 mb-2"
              />
              <div className="flex gap-1.5 flex-wrap">
                {QUICK_BETS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setBetAmount(q)}
                    disabled={!canPlay}
                    className="flex-1 text-xs font-mono py-1.5 rounded-lg border border-casino-border text-casino-muted hover:border-casino-gold hover:text-casino-gold transition-all disabled:opacity-30 min-w-[36px]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 justify-end">
              {!isConnected ? (
                <button onClick={connectWallet} className="btn-gold w-full py-3 rounded-xl">
                  CONNECT WALLET
                </button>
              ) : canPlay ? (
                <button
                  onClick={startGame}
                  disabled={isTxPending || isApproving}
                  className="btn-gold w-full py-4 rounded-xl text-base"
                >
                  {isApproving ? "APPROVING…" : isTxPending ? "DEALING…" : "DEAL CARDS"}
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={hit}
                    disabled={!canHit || isTxPending}
                    className="flex-1 py-4 rounded-xl font-display font-bold text-sm tracking-wider bg-casino-blue/20 border border-casino-blue/50 text-casino-blue hover:bg-casino-blue/30 disabled:opacity-40 transition-all"
                  >
                    HIT
                  </button>
                  <button
                    onClick={stand}
                    disabled={!canStand || isTxPending}
                    className="flex-1 py-4 rounded-xl font-display font-bold text-sm tracking-wider bg-casino-red/20 border border-casino-red/50 text-casino-red hover:bg-casino-red/30 disabled:opacity-40 transition-all"
                  >
                    STAND
                  </button>
                </div>
              )}

              {/* Payout info */}
              <div className="flex justify-between text-xs font-mono px-1">
                <span className="text-casino-muted">Blackjack pays</span>
                <span className="text-casino-gold font-bold">3 : 2</span>
              </div>
              <div className="flex justify-between text-xs font-mono px-1">
                <span className="text-casino-muted">Win pays</span>
                <span className="text-casino-text">1 : 1</span>
              </div>
              <div className="flex justify-between text-xs font-mono px-1">
                <span className="text-casino-muted">House edge</span>
                <span className="text-casino-muted">2%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

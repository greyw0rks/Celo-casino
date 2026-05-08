"use client";

import { useState } from "react";
import { usePrediction, useMarket } from "@/hooks/usePrediction";
import { useMiniPay } from "@/hooks/useMiniPay";
import { formatUnits } from "viem";

// Demo markets — in prod these come from on-chain
const DEMO_MARKETS = [
  {
    id: 1,
    question: "Will BTC hit $120,000 before July 2025?",
    category: "crypto",
    outcomes: ["Yes 🚀", "No 📉"],
    deadline: Date.now() / 1000 + 86400 * 30,
    status: 0,
    totalPool: "8,250",
    outcomePools: ["5,420", "2,830"],
    icon: "₿",
    accent: "#F7931A",
  },
  {
    id: 2,
    question: "Which team wins AFCON 2025?",
    category: "sports",
    outcomes: ["Nigeria 🦅", "Senegal 🦁", "Egypt ☀️", "Morocco ⭐"],
    deadline: Date.now() / 1000 + 86400 * 60,
    status: 0,
    totalPool: "22,100",
    outcomePools: ["7,800", "6,400", "4,200", "3,700"],
    icon: "⚽",
    accent: "#00FF87",
  },
  {
    id: 3,
    question: "Will ETH flip BTC in market cap by 2026?",
    category: "crypto",
    outcomes: ["Yes 💎", "No ❌"],
    deadline: Date.now() / 1000 + 86400 * 180,
    status: 0,
    totalPool: "14,500",
    outcomePools: ["4,100", "10,400"],
    icon: "Ξ",
    accent: "#627EEA",
  },
  {
    id: 4,
    question: "Will CELO token reach $2 by Q3 2025?",
    category: "crypto",
    outcomes: ["Yes 🟢", "No 🔴"],
    deadline: Date.now() / 1000 + 86400 * 45,
    status: 0,
    totalPool: "3,300",
    outcomePools: ["2,100", "1,200"],
    icon: "🌱",
    accent: "#35D07F",
  },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  crypto: { label: "CRYPTO",  color: "text-casino-gold border-casino-gold/30 bg-casino-gold/10" },
  sports: { label: "SPORTS",  color: "text-casino-neon border-casino-neon/30 bg-casino-neon/10" },
  politics: { label: "POLITICS", color: "text-casino-purple border-casino-purple/30 bg-casino-purple/10" },
  other:  { label: "OTHER",   color: "text-casino-muted border-casino-muted/30 bg-white/5" },
};

function MarketCard({ market, onSelect }: { market: typeof DEMO_MARKETS[0]; onSelect: () => void }) {
  const total = parseFloat(market.totalPool.replace(/,/g, ""));
  const cat = CATEGORY_LABELS[market.category] ?? CATEGORY_LABELS.other;
  const daysLeft = Math.ceil((market.deadline - Date.now() / 1000) / 86400);

  const poolNums = market.outcomePools.map((p) => parseFloat(p.replace(/,/g, "")));
  const totalNum = poolNums.reduce((a, b) => a + b, 0);

  return (
    <button
      onClick={onSelect}
      className="w-full text-left glass rounded-2xl border border-casino-border p-5 hover:border-casino-gold/40 transition-all hover:scale-[1.01] group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold"
            style={{ background: `${market.accent}20`, border: `1px solid ${market.accent}40`, color: market.accent }}
          >
            {market.icon}
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-md border ${cat.color}`}>
            {cat.label}
          </span>
        </div>
        <span className="text-[10px] font-mono text-casino-muted">{daysLeft}d left</span>
      </div>

      <h3 className="font-body font-semibold text-casino-text text-base mb-4 leading-snug group-hover:text-casino-gold transition-colors">
        {market.question}
      </h3>

      {/* Outcome bars */}
      <div className="space-y-2 mb-4">
        {market.outcomes.slice(0, 3).map((outcome, i) => {
          const pct = totalNum > 0 ? (poolNums[i] / totalNum) * 100 : 100 / market.outcomes.length;
          return (
            <div key={i}>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-casino-text truncate mr-2">{outcome}</span>
                <span className="text-casino-muted whitespace-nowrap">{pct.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-casino-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: market.accent }}
                />
              </div>
            </div>
          );
        })}
        {market.outcomes.length > 3 && (
          <div className="text-[10px] font-mono text-casino-muted">+{market.outcomes.length - 3} more outcomes</div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-casino-muted">{market.totalPool} USDm pool</span>
        <span className="text-xs font-display font-bold text-casino-gold opacity-0 group-hover:opacity-100 transition-opacity tracking-wider">
          BET NOW →
        </span>
      </div>
    </button>
  );
}

function BetModal({
  market,
  onClose,
}: {
  market: typeof DEMO_MARKETS[0];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [amount, setAmount] = useState("1");
  const { placeBet, isTxPending, isApproving } = usePrediction();
  const { isConnected } = useMiniPay();

  const poolNums = market.outcomePools.map((p) => parseFloat(p.replace(/,/g, "")));
  const totalNum = poolNums.reduce((a, b) => a + b, 0);

  const potentialReturn = selected !== null && parseFloat(amount) > 0
    ? ((totalNum + parseFloat(amount)) / (poolNums[selected] + parseFloat(amount)) * parseFloat(amount) * 0.95).toFixed(2)
    : null;

  const handleBet = async () => {
    if (selected === null) return;
    await placeBet(market.id, selected, amount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md glass rounded-2xl border border-casino-border p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <h2 className="font-body font-semibold text-casino-text text-base leading-snug pr-4">{market.question}</h2>
          <button onClick={onClose} className="text-casino-muted hover:text-casino-text text-xl leading-none ml-2">×</button>
        </div>

        <p className="text-xs font-mono text-casino-muted mb-3 tracking-wider">PICK YOUR OUTCOME</p>
        <div className="grid grid-cols-1 gap-2 mb-5">
          {market.outcomes.map((outcome, i) => {
            const pct = totalNum > 0 ? (poolNums[i] / totalNum) * 100 : 100 / market.outcomes.length;
            const isSelected = selected === i;
            return (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-casino-gold bg-casino-gold/10 text-casino-gold"
                    : "border-casino-border text-casino-text hover:border-casino-gold/40"
                }`}
              >
                <span className="font-body font-medium text-sm">{outcome}</span>
                <span className="font-mono text-xs text-casino-muted ml-2">{pct.toFixed(0)}%</span>
              </button>
            );
          })}
        </div>

        <label className="text-xs font-mono text-casino-muted mb-2 block tracking-wider">AMOUNT (USDm)</label>
        <div className="flex gap-2 mb-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0.5"
            max="500"
            className="flex-1 bg-casino-bg border border-casino-border rounded-xl px-4 py-3 text-casino-text font-mono text-lg focus:outline-none focus:border-casino-gold"
          />
        </div>
        <div className="flex gap-2 mb-5">
          {["1", "5", "10", "50"].map((q) => (
            <button
              key={q}
              onClick={() => setAmount(q)}
              className="flex-1 text-xs font-mono py-2 rounded-lg border border-casino-border text-casino-muted hover:border-casino-gold hover:text-casino-gold transition-all"
            >
              {q}
            </button>
          ))}
        </div>

        {potentialReturn && (
          <div className="flex justify-between text-xs font-mono mb-5 px-1">
            <span className="text-casino-muted">Potential return</span>
            <span className="text-casino-neon font-bold">{potentialReturn} USDm</span>
          </div>
        )}

        <button
          onClick={handleBet}
          disabled={selected === null || !isConnected || isTxPending || isApproving}
          className="btn-gold w-full py-3 rounded-xl"
        >
          {!isConnected ? "CONNECT WALLET" :
           isApproving   ? "APPROVING…" :
           isTxPending   ? "PLACING BET…" : "PLACE BET"}
        </button>
      </div>
    </div>
  );
}

export default function PredictionPage() {
  const [selectedMarket, setSelectedMarket] = useState<typeof DEMO_MARKETS[0] | null>(null);
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? DEMO_MARKETS : DEMO_MARKETS.filter((m) => m.category === filter);

  return (
    <div className="min-h-screen pt-4 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-black text-2xl text-casino-blue tracking-widest mb-1">
            PREDICTION MARKETS
          </h1>
          <p className="text-casino-muted text-sm">Bet on outcomes. Winners split the pool.</p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total Pool", value: "48,150 USDm" },
            { label: "Active Markets", value: `${DEMO_MARKETS.length}` },
            { label: "Protocol Fee", value: "5%" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl border border-casino-border p-3 text-center">
              <div className="font-display font-bold text-casino-text text-sm">{s.value}</div>
              <div className="text-[10px] font-mono text-casino-muted mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {["all", "crypto", "sports", "politics", "other"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider whitespace-nowrap transition-all ${
                filter === f
                  ? "bg-casino-blue/20 text-casino-blue border border-casino-blue/40"
                  : "glass border border-casino-border text-casino-muted hover:text-casino-text"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Market grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((market) => (
            <MarketCard
              key={market.id}
              market={market}
              onSelect={() => setSelectedMarket(market)}
            />
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-20 text-casino-muted">
            <div className="text-4xl mb-3">🎯</div>
            <p className="font-mono text-sm">No markets in this category yet</p>
          </div>
        )}
      </div>

      {/* Bet Modal */}
      {selectedMarket && (
        <BetModal market={selectedMarket} onClose={() => setSelectedMarket(null)} />
      )}
    </div>
  );
}

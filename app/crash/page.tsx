"use client";

import { useState, useEffect, useRef } from "react";
import { useCrash } from "@/hooks/useCrash";
import { useMiniPay } from "@/hooks/useMiniPay";

const HISTORY = [
  { id: 1, crash: 2.41 }, { id: 2, crash: 8.33 }, { id: 3, crash: 1.02 },
  { id: 4, crash: 15.7 }, { id: 5, crash: 1.18 }, { id: 6, crash: 3.44 },
  { id: 7, crash: 1.01 }, { id: 8, crash: 22.1 },
];

export default function CrashPage() {
  const { isConnected, connectWallet } = useMiniPay();
  const {
    phase, multiplier, roundId, totalBets,
    betAmount, setBetAmount, hasBet, cashedOut, cashedOutAt,
    placeBet, cashOut, isTxPending, isApproving,
  } = useCrash();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[]>([1.0]);
  const animFrameRef = useRef<number>();

  // Simulate chart line
  useEffect(() => {
    if (phase !== "live") {
      dataRef.current = [1.0];
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    dataRef.current.push(multiplier);
    if (dataRef.current.length > 120) dataRef.current.shift();

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const data = dataRef.current;
      const maxVal = Math.max(...data, 1.1);
      const minVal = 1.0;

      // Grid lines
      ctx.strokeStyle = "rgba(245,197,66,0.08)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = (h * i) / 5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Gradient fill
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, "rgba(0,255,135,0.25)");
      gradient.addColorStop(1, "rgba(0,255,135,0.02)");

      ctx.beginPath();
      data.forEach((val, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((val - minVal) / (maxVal - minVal)) * (h * 0.85) - 10;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Line
      ctx.beginPath();
      data.forEach((val, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((val - minVal) / (maxVal - minVal)) * (h * 0.85) - 10;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#00FF87";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#00FF87";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    draw();
  }, [multiplier, phase]);

  const getMultiplierColor = () => {
    if (phase === "crashed") return "text-casino-red";
    if (multiplier >= 5) return "text-casino-gold";
    if (multiplier >= 2) return "text-casino-neon";
    return "text-white";
  };

  const QUICK_BETS = ["0.5", "1", "2", "5", "10"];

  return (
    <div className="min-h-screen pt-4 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-black text-2xl text-casino-neon text-glow-neon tracking-widest">CRASH</h1>
            <p className="text-casino-muted text-xs font-mono mt-1">Round #{roundId} · {totalBets} USDm in pool</p>
          </div>
          <div className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold tracking-wider ${
            phase === "live"    ? "border-casino-neon/50 text-casino-neon bg-casino-neon/10" :
            phase === "crashed" ? "border-casino-red/50 text-casino-red bg-casino-red/10" :
                                  "border-casino-gold/50 text-casino-gold bg-casino-gold/10"
          }`}>
            {phase === "live" ? "● LIVE" : phase === "crashed" ? "✗ CRASHED" : "◎ BETTING"}
          </div>
        </div>

        {/* History */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <span className="text-[10px] font-mono text-casino-muted whitespace-nowrap">PREV:</span>
          {HISTORY.map((h) => (
            <span
              key={h.id}
              className={`text-xs font-mono font-bold px-2 py-1 rounded whitespace-nowrap ${
                h.crash < 1.5  ? "bg-casino-red/20 text-casino-red" :
                h.crash >= 5   ? "bg-casino-gold/20 text-casino-gold" :
                                 "bg-casino-neon/10 text-casino-neon"
              }`}
            >
              {h.crash.toFixed(2)}×
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Chart + Multiplier */}
          <div className="lg:col-span-2 glass rounded-2xl border border-casino-border overflow-hidden">
            <div className="relative h-72">
              <canvas
                ref={canvasRef}
                width={800}
                height={288}
                className="w-full h-full"
              />

              {/* Multiplier overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`font-display font-black text-7xl md:text-8xl leading-none multiplier-display ${getMultiplierColor()} ${phase === "crashed" ? "crashed" : ""}`}>
                    {multiplier.toFixed(2)}
                    <span className="text-3xl ml-1">×</span>
                  </div>
                  {cashedOut && (
                    <div className="mt-3 px-4 py-2 rounded-xl bg-casino-neon/10 border border-casino-neon/30 inline-block">
                      <span className="font-mono text-casino-neon text-sm">
                        💰 Cashed out @ {cashedOutAt?.toFixed(2)}×
                      </span>
                    </div>
                  )}
                  {phase === "betting" && (
                    <div className="mt-3 text-casino-muted font-mono text-sm animate-pulse">
                      Waiting for round to start…
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bet Panel */}
          <div className="glass rounded-2xl border border-casino-border p-5 flex flex-col gap-4">
            <h2 className="font-display text-xs tracking-[0.2em] text-casino-muted">PLACE BET</h2>

            {/* Amount */}
            <div>
              <label className="text-xs font-mono text-casino-muted mb-2 block">AMOUNT (USDm)</label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                min="0.1"
                max="100"
                step="0.1"
                disabled={hasBet || phase !== "betting"}
                className="w-full bg-casino-bg border border-casino-border rounded-xl px-4 py-3 text-casino-text font-mono text-lg focus:outline-none focus:border-casino-neon disabled:opacity-40"
              />
              <div className="flex gap-2 mt-2 flex-wrap">
                {QUICK_BETS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setBetAmount(q)}
                    disabled={hasBet || phase !== "betting"}
                    className="flex-1 text-xs font-mono py-1.5 rounded-lg border border-casino-border text-casino-muted hover:border-casino-neon hover:text-casino-neon transition-all disabled:opacity-30"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Status / Actions */}
            {!isConnected ? (
              <button onClick={connectWallet} className="btn-gold w-full py-3 rounded-xl">
                CONNECT WALLET
              </button>
            ) : phase === "betting" && !hasBet ? (
              <button
                onClick={placeBet}
                disabled={isTxPending || isApproving}
                className="btn-neon w-full py-3 rounded-xl"
              >
                {isApproving ? "APPROVING…" : isTxPending ? "PLACING BET…" : "PLACE BET"}
              </button>
            ) : phase === "live" && hasBet && !cashedOut ? (
              <button
                onClick={cashOut}
                disabled={isTxPending}
                className="w-full py-3 rounded-xl font-display font-bold text-sm tracking-wider transition-all bg-casino-neon text-casino-bg hover:shadow-[0_0_30px_rgba(0,255,135,0.5)]"
              >
                CASH OUT {multiplier.toFixed(2)}×
              </button>
            ) : hasBet && cashedOut ? (
              <div className="text-center py-3 text-casino-neon font-mono text-sm">
                ✓ Cashed out @ {cashedOutAt?.toFixed(2)}×
              </div>
            ) : phase === "betting" && hasBet ? (
              <div className="text-center py-3 text-casino-gold font-mono text-sm">
                ✓ Bet placed — waiting for round
              </div>
            ) : null}

            {/* Info */}
            <div className="border-t border-casino-border pt-4 space-y-2">
              {[
                ["Potential @ 2×", `${(parseFloat(betAmount || "0") * 2 * 0.97).toFixed(2)} USDm`],
                ["Potential @ 5×", `${(parseFloat(betAmount || "0") * 5 * 0.97).toFixed(2)} USDm`],
                ["House edge", "3%"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs font-mono">
                  <span className="text-casino-muted">{k}</span>
                  <span className="text-casino-text">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-6 glass rounded-2xl border border-casino-border p-5">
          <h3 className="font-display text-xs tracking-[0.2em] text-casino-muted mb-4">HOW IT WORKS</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: "01", title: "Place Bet", desc: "Bet USDm during the betting phase before the round starts." },
              { step: "02", title: "Watch the Multiplier", desc: "The multiplier climbs from 1×. It could crash at any time." },
              { step: "03", title: "Cash Out", desc: "Tap CASH OUT before the crash to claim your multiplied winnings." },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <span className="font-display text-casino-neon/30 text-2xl font-black leading-none">{item.step}</span>
                <div>
                  <div className="font-display text-xs font-bold text-casino-text mb-1 tracking-wider">{item.title}</div>
                  <div className="text-xs text-casino-muted leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

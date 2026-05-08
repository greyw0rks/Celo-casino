"use client";

import { useMiniPay } from "@/hooks/useMiniPay";

export function WalletBar() {
  const { isConnected, isMiniPay, connectWallet, shortAddress, usdmBalance, isConnecting } = useMiniPay();

  if (isMiniPay && isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass border border-casino-border">
          <span className="w-2 h-2 rounded-full bg-casino-neon animate-pulse" />
          <span className="font-mono text-sm text-casino-neon">{usdmBalance} USDm</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg glass border border-casino-border">
          <span className="font-mono text-xs text-casino-muted">{shortAddress}</span>
        </div>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass border border-casino-border">
          <span className="w-2 h-2 rounded-full bg-casino-neon" />
          <span className="font-mono text-sm text-casino-neon">{usdmBalance} USDm</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg glass border border-casino-border">
          <span className="font-mono text-xs text-casino-muted">{shortAddress}</span>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={connectWallet}
      disabled={isConnecting}
      className="btn-gold px-4 py-2 rounded-lg text-sm"
    >
      {isConnecting ? "CONNECTING…" : "CONNECT WALLET"}
    </button>
  );
}

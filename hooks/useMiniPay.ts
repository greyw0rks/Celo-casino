"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { injected } from "wagmi/connectors";
import { formatUnits } from "viem";
import { USDM_ADDRESS, USDM_DECIMALS } from "@/lib/constants";

export function useMiniPay() {
  const [isMiniPay, setIsMiniPay] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const { data: usdmBalance } = useBalance({
    address,
    token: USDM_ADDRESS,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mini = !!(window.ethereum as any)?.isMiniPay;
      setIsMiniPay(mini);

      // Auto-connect inside MiniPay
      if (mini && !isConnected) {
        connect({ connector: injected() });
      }
    }
  }, []);

  const connectWallet = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    try {
      connect({ connector: injected() });
    } finally {
      setIsConnecting(false);
    }
  };

  const formattedBalance = usdmBalance
    ? parseFloat(formatUnits(usdmBalance.value, USDM_DECIMALS)).toFixed(2)
    : "0.00";

  const shortAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  return {
    isMiniPay,
    address,
    isConnected,
    isConnecting,
    connectWallet,
    disconnect,
    usdmBalance: formattedBalance,
    shortAddress,
  };
}

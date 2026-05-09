"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { CRASH_ABI } from "@/lib/abis";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { useTokenApproval } from "./useTokenApproval";

const ADDR = CONTRACT_ADDRESSES.crashGame;

export type CrashPhase = "idle" | "betting" | "live" | "crashed";

export interface HistoryEntry {
  roundId: number;
  crashPoint: number;
}

export function useCrash() {
  const { address } = useAccount();
  const [multiplier, setMultiplier] = useState(1.0);
  const [phase, setPhase] = useState<CrashPhase>("betting");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [betAmount, setBetAmount] = useState("1");
  const [hasBet, setHasBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashedOutAt, setCashedOutAt] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const { needsApproval, approve, isApproving } = useTokenApproval(ADDR);

  const { data: roundData, refetch: refetchRound } = useReadContract({
    address: ADDR,
    abi: CRASH_ABI,
    functionName: "getCurrentRound",
    query: { refetchInterval: 2000 },
  });

  const { data: myBet, refetch: refetchBet } = useReadContract({
    address: ADDR,
    abi: CRASH_ABI,
    functionName: "getMyBet",
    args: roundData ? [(roundData as any).roundId] : undefined,
    query: { enabled: !!address && !!roundData },
  });

  const { writeContractAsync } = useWriteContract();
  const { isLoading: isTxPending } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  // Map on-chain phase (0=IDLE,1=BETTING,2=LIVE,3=REVEALING) to local state
  useEffect(() => {
    if (!roundData) return;
    const onChainPhase = (roundData as any).phase;
    if (onChainPhase === 1) setPhase("betting");
    else if (onChainPhase === 2) setPhase("live");
    else setPhase("idle");
  }, [roundData]);

  // Animate multiplier when live
  useEffect(() => {
    if (phase !== "live") {
      setMultiplier(1.0);
      clearInterval(intervalRef.current);
      return;
    }
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      // Exponential growth: 1 * e^(0.06 * elapsed)
      setMultiplier(Math.pow(Math.E, 0.06 * elapsed));
    }, 50);
    return () => clearInterval(intervalRef.current);
  }, [phase]);

  useEffect(() => {
    if (myBet) {
      const bet = myBet as any;
      setHasBet(bet.amount > 0n);
      if (bet.cashedOutAt > 0) {
        setCashedOut(true);
        setCashedOutAt(bet.cashedOutAt / 100);
      }
    }
  }, [myBet]);

  const placeBet = useCallback(async () => {
    const amount = parseUnits(betAmount, 18);
    if (needsApproval(betAmount)) await approve(amount);
    const hash = await writeContractAsync({
      address: ADDR,
      abi: CRASH_ABI,
      functionName: "placeBet",
      args: [amount],
      type: "legacy",
    });
    setTxHash(hash);
    await refetchBet();
  }, [betAmount, needsApproval, approve, writeContractAsync, refetchBet]);

  const cashOut = useCallback(async () => {
    if (cashedOut || phase !== "live") return;
    const multiplierScaled = Math.floor(multiplier * 100);
    const hash = await writeContractAsync({
      address: ADDR,
      abi: CRASH_ABI,
      functionName: "cashOut",
      args: [multiplierScaled],
      type: "legacy",
    });
    setTxHash(hash);
    setCashedOut(true);
    setCashedOutAt(multiplier);
    await refetchBet();
  }, [cashedOut, phase, multiplier, writeContractAsync, refetchBet]);

  const roundId = roundData ? Number((roundData as any).roundId) : 0;
  const totalBets = roundData
    ? parseFloat(formatUnits((roundData as any).totalBets, 18)).toFixed(2)
    : "0.00";

  return {
    phase,
    multiplier,
    roundId,
    totalBets,
    history,
    betAmount,
    setBetAmount,
    hasBet,
    cashedOut,
    cashedOutAt,
    placeBet,
    cashOut,
    isApproving,
    isTxPending,
    address,
  };
}

"use client";

import { useState, useCallback } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { PREDICTION_ABI } from "@/lib/abis";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { useTokenApproval } from "./useTokenApproval";

const ADDR = CONTRACT_ADDRESSES.predictionMarket;

export function usePrediction() {
  const { address } = useAccount();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [selectedMarket, setSelectedMarket] = useState<number | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState("1");

  const { needsApproval, approve, isApproving } = useTokenApproval(ADDR);

  const { data: marketCount } = useReadContract({
    address: ADDR,
    abi: PREDICTION_ABI,
    functionName: "marketCount",
    query: { refetchInterval: 10000 },
  });

  const { writeContractAsync } = useWriteContract();
  const { isLoading: isTxPending } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  const placeBet = useCallback(async (marketId: number, outcome: number, amount: string) => {
    const amountWei = parseUnits(amount, 18);
    if (needsApproval(amount)) await approve(amountWei);
    const hash = await writeContractAsync({
      address: ADDR,
      abi: PREDICTION_ABI,
      functionName: "placeBet",
      args: [BigInt(marketId), outcome, amountWei],
      type: "legacy",
    });
    setTxHash(hash);
    return hash;
  }, [needsApproval, approve, writeContractAsync]);

  const claimWinnings = useCallback(async (marketId: number, positionIndex: number) => {
    const hash = await writeContractAsync({
      address: ADDR,
      abi: PREDICTION_ABI,
      functionName: "claim",
      args: [BigInt(marketId), BigInt(positionIndex)],
      type: "legacy",
    });
    setTxHash(hash);
    return hash;
  }, [writeContractAsync]);

  return {
    address,
    marketCount: marketCount ? Number(marketCount) : 0,
    selectedMarket,
    setSelectedMarket,
    selectedOutcome,
    setSelectedOutcome,
    betAmount,
    setBetAmount,
    placeBet,
    claimWinnings,
    isApproving,
    isTxPending,
  };
}

// Hook to fetch a single market's data
export function useMarket(marketId: number) {
  const { data, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.predictionMarket,
    abi: PREDICTION_ABI,
    functionName: "getMarket",
    args: [BigInt(marketId)],
    query: { enabled: marketId > 0, refetchInterval: 10000 },
  });

  const { data: odds } = useReadContract({
    address: CONTRACT_ADDRESSES.predictionMarket,
    abi: PREDICTION_ABI,
    functionName: "getMarketOdds",
    args: [BigInt(marketId)],
    query: { enabled: marketId > 0, refetchInterval: 10000 },
  });

  if (!data) return { market: null, odds: null, refetch };

  const [id, question, outcomes, deadline, status, winningOutcome, totalPool, outcomePools, category] = data as unknown as any[];

  return {
    market: {
      id: Number(id),
      question,
      outcomes: outcomes as string[],
      deadline: Number(deadline),
      status: Number(status),
      winningOutcome: Number(winningOutcome),
      totalPool: parseFloat(formatUnits(totalPool as bigint, 18)).toFixed(2),
      outcomePools: (outcomePools as bigint[]).map((p: bigint) =>
        parseFloat(formatUnits(p, 18)).toFixed(2)
      ),
      category,
    },
    odds: odds as bigint[] | undefined,
    refetch,
  };
}

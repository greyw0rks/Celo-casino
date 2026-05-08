"use client";

import { useState, useCallback } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { BLACKJACK_ABI } from "@/lib/abis";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { useTokenApproval } from "./useTokenApproval";

const ADDR = CONTRACT_ADDRESSES.blackjack;

const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const SUITS = ["♠","♥","♦","♣"];

export function cardLabel(card: number): { rank: string; suit: string; isRed: boolean } {
  const rank = RANKS[card % 13];
  const suitIndex = Math.floor(card / 13);
  const suit = SUITS[suitIndex];
  return { rank, suit, isRed: suitIndex === 1 || suitIndex === 2 };
}

export function useBlackjack() {
  const { address } = useAccount();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [betAmount, setBetAmount] = useState("1");
  const [localSessionId, setLocalSessionId] = useState<number | null>(null);

  const { needsApproval, approve, isApproving } = useTokenApproval(ADDR);

  const { data: activeSessionId, refetch: refetchActive } = useReadContract({
    address: ADDR,
    abi: BLACKJACK_ABI,
    functionName: "activeSession",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 3000 },
  });

  const currentSessionId = localSessionId ?? (activeSessionId ? Number(activeSessionId) : 0);

  const { data: sessionData, refetch: refetchSession } = useReadContract({
    address: ADDR,
    abi: BLACKJACK_ABI,
    functionName: "getSession",
    args: currentSessionId > 0 ? [BigInt(currentSessionId)] : undefined,
    query: { enabled: currentSessionId > 0, refetchInterval: 2000 },
  });

  const { data: houseBalance } = useReadContract({
    address: ADDR,
    abi: BLACKJACK_ABI,
    functionName: "houseBalance",
    query: { refetchInterval: 15000 },
  });

  const { writeContractAsync } = useWriteContract();
  const { isLoading: isTxPending } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  const startGame = useCallback(async () => {
    const amountWei = parseUnits(betAmount, 18);
    if (needsApproval(betAmount)) await approve(amountWei);
    const hash = await writeContractAsync({
      address: ADDR,
      abi: BLACKJACK_ABI,
      functionName: "startGame",
      args: [amountWei],
      type: "legacy",
    });
    setTxHash(hash);
    await refetchActive();
    await refetchSession();
    return hash;
  }, [betAmount, needsApproval, approve, writeContractAsync, refetchActive, refetchSession]);

  const hit = useCallback(async () => {
    const hash = await writeContractAsync({
      address: ADDR,
      abi: BLACKJACK_ABI,
      functionName: "hit",
      args: [],
      type: "legacy",
    });
    setTxHash(hash);
    await refetchSession();
    return hash;
  }, [writeContractAsync, refetchSession]);

  const stand = useCallback(async () => {
    const hash = await writeContractAsync({
      address: ADDR,
      abi: BLACKJACK_ABI,
      functionName: "stand",
      args: [],
      type: "legacy",
    });
    setTxHash(hash);
    await refetchSession();
    return hash;
  }, [writeContractAsync, refetchSession]);

  const session = sessionData as any;

  return {
    address,
    betAmount,
    setBetAmount,
    currentSessionId,
    session: session
      ? {
          state:       Number(session.state),  // 0=IDLE 1=PLAYER_TURN 2=DEALER_TURN 3=SETTLED
          playerCards: session.playerCards as number[],
          dealerCards: session.dealerCards as number[],
          playerTotal: Number(session.playerTotal),
          dealerTotal: Number(session.dealerTotal),
          isBlackjack: session.isBlackjack as boolean,
          playerBust:  session.playerBust as boolean,
          bet:         parseFloat(formatUnits(session.bet as bigint, 18)).toFixed(2),
        }
      : null,
    houseBalance: houseBalance
      ? parseFloat(formatUnits(houseBalance as bigint, 18)).toFixed(2)
      : "0.00",
    startGame,
    hit,
    stand,
    isApproving,
    isTxPending,
    cardLabel,
  };
}

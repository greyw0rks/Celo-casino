"use client";

import { useState, useCallback } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { CHESS_ABI } from "@/lib/abis";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { useTokenApproval } from "./useTokenApproval";

const ADDR = CONTRACT_ADDRESSES.chessWager;

export type ChessResult = 0 | 1 | 2 | 3; // NONE | WHITE_WINS | BLACK_WINS | DRAW

export function useChessWager() {
  const { address } = useAccount();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [stakeAmount, setStakeAmount] = useState("5");

  const { needsApproval, approve, isApproving } = useTokenApproval(ADDR);

  const { data: activeGameId, refetch: refetchActive } = useReadContract({
    address: ADDR,
    abi: CHESS_ABI,
    functionName: "activeGame",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const { data: gameCount } = useReadContract({
    address: ADDR,
    abi: CHESS_ABI,
    functionName: "gameCount",
    query: { refetchInterval: 10000 },
  });

  const { data: openChallenges } = useReadContract({
    address: ADDR,
    abi: CHESS_ABI,
    functionName: "getOpenChallenges",
    args: [BigInt(1), BigInt(20)],
    query: { refetchInterval: 10000 },
  });

  const { writeContractAsync } = useWriteContract();
  const { isLoading: isTxPending } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  const createChallenge = useCallback(async (stake: string) => {
    const stakeWei = parseUnits(stake, 18);
    if (needsApproval(stake)) await approve(stakeWei);
    const hash = await writeContractAsync({
      address: ADDR,
      abi: CHESS_ABI,
      functionName: "createChallenge",
      args: [stakeWei],
      type: "legacy",
    });
    setTxHash(hash);
    await refetchActive();
    return hash;
  }, [needsApproval, approve, writeContractAsync, refetchActive]);

  const acceptChallenge = useCallback(async (gameId: number, stake: string) => {
    const stakeWei = parseUnits(stake, 18);
    if (needsApproval(stake)) await approve(stakeWei);
    const hash = await writeContractAsync({
      address: ADDR,
      abi: CHESS_ABI,
      functionName: "acceptChallenge",
      args: [BigInt(gameId)],
      type: "legacy",
    });
    setTxHash(hash);
    await refetchActive();
    return hash;
  }, [needsApproval, approve, writeContractAsync, refetchActive]);

  const attestResult = useCallback(async (gameId: number, result: ChessResult) => {
    const hash = await writeContractAsync({
      address: ADDR,
      abi: CHESS_ABI,
      functionName: "attestResult",
      args: [BigInt(gameId), result],
      type: "legacy",
    });
    setTxHash(hash);
    return hash;
  }, [writeContractAsync]);

  const cancelChallenge = useCallback(async (gameId: number) => {
    const hash = await writeContractAsync({
      address: ADDR,
      abi: CHESS_ABI,
      functionName: "cancelChallenge",
      args: [BigInt(gameId)],
      type: "legacy",
    });
    setTxHash(hash);
    await refetchActive();
    return hash;
  }, [writeContractAsync, refetchActive]);

  return {
    address,
    activeGameId: activeGameId ? Number(activeGameId) : 0,
    gameCount: gameCount ? Number(gameCount) : 0,
    openChallenges: (openChallenges as bigint[] | undefined)
      ?.filter((id) => id > 0n)
      .map(Number) ?? [],
    stakeAmount,
    setStakeAmount,
    createChallenge,
    acceptChallenge,
    attestResult,
    cancelChallenge,
    isApproving,
    isTxPending,
  };
}

export function useChessGame(gameId: number) {
  const { data, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.chessWager,
    abi: CHESS_ABI,
    functionName: "getGame",
    args: [BigInt(gameId)],
    query: { enabled: gameId > 0, refetchInterval: 3000 },
  });

  if (!data) return { game: null, refetch };

  const g = data as any;
  return {
    game: {
      id:               Number(g.id),
      white:            g.white as string,
      black:            g.black as string,
      stake:            g.stake as bigint,
      status:           Number(g.status),  // 0=OPEN 1=ACTIVE 2=RESOLVED 3=CANCELLED
      result:           Number(g.result),  // 0=NONE 1=WHITE 2=BLACK 3=DRAW
      createdAt:        Number(g.createdAt),
      startedAt:        Number(g.startedAt),
      whiteAttestation: Number(g.whiteAttestation),
      blackAttestation: Number(g.blackAttestation),
      pgn:              g.pgn as string,
    },
    refetch,
  };
}

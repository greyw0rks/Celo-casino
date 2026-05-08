"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, maxUint256 } from "viem";
import { ERC20_ABI } from "@/lib/abis";
import { USDM_ADDRESS } from "@/lib/constants";

export function useTokenApproval(spender: `0x${string}`) {
  const { address } = useAccount();
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDM_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, spender] : undefined,
    query: { enabled: !!address },
  });

  const { writeContractAsync } = useWriteContract();

  const { isLoading: isApproving } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    query: { enabled: !!approveTxHash },
  });

  const approve = async (amount?: bigint) => {
    const hash = await writeContractAsync({
      address: USDM_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, amount ?? maxUint256],
      // MiniPay requires legacy tx type
      type: "legacy",
    });
    setApproveTxHash(hash);
    await refetchAllowance();
    return hash;
  };

  const needsApproval = (amount: string): boolean => {
    if (!allowance) return true;
    const amountWei = parseUnits(amount, 18);
    return (allowance as bigint) < amountWei;
  };

  return { allowance, needsApproval, approve, isApproving };
}

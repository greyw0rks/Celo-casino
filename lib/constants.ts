import { celo } from "viem/chains";

export const CELO_CHAIN = celo;

// USDm token on Celo mainnet (same address as cUSD for MiniPay context)
export const USDM_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;

// Deploy these and update:
export const CONTRACT_ADDRESSES = {
  crashGame:        "0x8ea586bb4ce9a104aa0c2b83707ff92bbb501059" as const, // TODO: deploy
  predictionMarket: "0xda1de2ad187cfef1b80a9896ec1915ed051c9693" as const, // TODO: deploy
  chessWager:       "0x74cdef5b6fda93f2e669548a372f5338b76caa78" as const, // TODO: deploy
  blackjack:        "0x72fb7312b53ef6e8ae8acb0c0b2a7d372f41c02f" as const, // ✅ deployed
} as const;

export const USDM_DECIMALS = 18;
export const PROTOCOL_FEE_BPS = 500; // 5%

export const GAME_CONFIG = {
  crash: {
    minBet: 0.1,
    maxBet: 100,
    houseEdge: 3,
  },
  prediction: {
    minBet: 0.5,
    maxBet: 500,
    fee: 5,
  },
  chess: {
    minStake: 1,
    maxStake: 1000,
    fee: 5,
  },
  blackjack: {
    minBet: 0.5,
    maxBet: 200,
    houseEdge: 2,
  },
} as const;

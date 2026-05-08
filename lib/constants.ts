import { celo } from "viem/chains";

export const CELO_CHAIN = celo;

// USDm token on Celo mainnet (same address as cUSD for MiniPay context)
export const USDM_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;

// Deploy these and update:
export const CONTRACT_ADDRESSES = {
  crashGame:        "0x8ea586bb4ce9a104aa0c2b83707ff92bbb501059" as const, // TODO: deploy
  predictionMarket: "0xbf6b285646e99dccdd939a7324ddd93286427240" as const, // TODO: deploy
  chessWager:       "0xb3bd991bae73640ab436ba1a2b04e681ac631e9d" as const, // TODO: deploy
  blackjack:        "0x989d42c08ea967efc81f29a0a5d249e89229cc2a" as const, // ✅ deployed
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

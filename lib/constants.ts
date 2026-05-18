import { celo } from "viem/chains";

export const CELO_CHAIN = celo;

// USDm token on Celo mainnet (same address as cUSD for MiniPay context)
export const USDM_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;

// Deploy these and update:
export const CONTRACT_ADDRESSES = {
  crashGame:        "0x8ea586bb4ce9a104aa0c2b83707ff92bbb501059" as const, // TODO: deploy
  predictionMarket: "0x31b69623c1bf3c952d31d6345e599e1ba05fcd39" as const, // TODO: deploy
  chessWager:       "0xa63d368c5e94b9fb9c47f52392f7499a8a6f625f" as const, // TODO: deploy
  blackjack:        "0x39e929da037b24a7f26c19216b207990a7600901" as const, // ✅ deployed
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

# Celo Casino 🎰

Four provably fair games on Celo mainnet — all under one roof.

| Game | Route | Contract | Status |
|------|-------|----------|--------|
| Crash | `/crash` | CrashGame.sol | Deploy pending |
| Prediction Market | `/prediction` | PredictionMarket.sol | Deploy pending |
| Chess Wager | `/chess` | ChessWager.sol | Deploy pending |
| Blackjack | `/blackjack` | Blackjack.sol | ✅ Deployed |

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Compile Contracts

```bash
npm run compile
# Outputs to compiled/*.json
```

## Deploy Contracts

```bash
# Deploy all
PRIVATE_KEY=0x... npm run deploy

# Deploy single game
PRIVATE_KEY=0x... node deploy.js crash
PRIVATE_KEY=0x... node deploy.js predict
PRIVATE_KEY=0x... node deploy.js chess
PRIVATE_KEY=0x... node deploy.js blackjack
```

After deploy, paste the printed addresses into `lib/constants.ts`.

## Stack

- Next.js 14 · wagmi 2.5.7 · viem 2.7.0
- Tailwind CSS 3 · TypeScript
- Solidity 0.8.x · Celo mainnet
- USDm stablecoin · MiniPay compatible

## MiniPay Testing

```bash
# Install ngrok, then:
ngrok http 3000
# Open the ngrok URL in MiniPay
```

## Routes

- `/` — Casino lobby
- `/crash` — Crash game
- `/prediction` — Prediction markets
- `/chess` — Chess wager
- `/blackjack` — Blackjack

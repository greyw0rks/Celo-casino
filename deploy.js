/**
 * Celo Casino — Deploy all 4 contracts
 *
 * Usage:
 *   PRIVATE_KEY=0x... node deploy.js              # deploy all
 *   PRIVATE_KEY=0x... node deploy.js crash        # deploy one
 *   PRIVATE_KEY=0x... node deploy.js crash chess  # deploy subset
 *
 * Addresses saved to deployed-addresses.json and printed for lib/constants.ts
 */

const { createWalletClient, createPublicClient, http } = require("viem");
const { privateKeyToAccount }                           = require("viem/accounts");
const { celo }                                          = require("viem/chains");
const fs                                                = require("fs");
const path                                              = require("path");

const PRIVATE_KEY    = process.env.PRIVATE_KEY;
const USDM_ADDRESS   = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
const RPC_URL        = "https://forno.celo.org";
const ADDRESSES_FILE = path.join(__dirname, "deployed-addresses.json");

const GAME_MAP = {
  crash:     "CrashGame",
  predict:   "PredictionMarket",
  chess:     "ChessWager",
  blackjack: "Blackjack",
};

async function deployContract(walletClient, publicClient, contractName) {
  const artifactPath = path.join(__dirname, "compiled", `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    console.error(`❌ No artifact for ${contractName} — run: npm run compile`);
    process.exit(1);
  }

  const artifact       = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const constructorArg = USDM_ADDRESS.slice(2).toLowerCase().padStart(64, "0");

  console.log(`\n📦 Deploying ${contractName}...`);

  const hash = await walletClient.deployContract({
    abi:      artifact.abi,
    bytecode: artifact.bytecode + constructorArg,
    args:     [USDM_ADDRESS],
    type:     "legacy",
    gasPrice: BigInt(500_000_000_000), // 500 gwei — above Celo base fee
  });

  console.log(`   tx: ${hash}`);
  console.log(`   waiting for confirmation...`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const address = receipt.contractAddress;

  console.log(`   ✅ ${contractName} → ${address}`);
  console.log(`   🔍 https://celoscan.io/address/${address}`);

  return address;
}

async function main() {
  if (!PRIVATE_KEY) {
    console.error("❌ Set PRIVATE_KEY:\n   PRIVATE_KEY=0x... node deploy.js");
    process.exit(1);
  }

  const account      = privateKeyToAccount(PRIVATE_KEY);
  const walletClient = createWalletClient({ account, chain: celo, transport: http(RPC_URL) });
  const publicClient = createPublicClient({ chain: celo, transport: http(RPC_URL) });

  const balance    = await publicClient.getBalance({ address: account.address });
  const celoBalance = Number(balance) / 1e18;

  console.log(`\n🔑 Deployer: ${account.address}`);
  console.log(`💰 Balance:  ${celoBalance.toFixed(4)} CELO`);
  console.log(`📡 Network:  Celo Mainnet`);
  console.log(`💵 USDm:     ${USDM_ADDRESS}`);

  if (celoBalance < 0.05) {
    console.error("❌ Need at least 0.05 CELO for gas");
    process.exit(1);
  }

  // Which games to deploy
  const args    = process.argv.slice(2);
  const targets = args.length > 0
    ? args.map((a) => {
        if (!GAME_MAP[a]) { console.error(`❌ Unknown game: ${a}. Options: ${Object.keys(GAME_MAP).join(", ")}`); process.exit(1); }
        return [a, GAME_MAP[a]];
      })
    : Object.entries(GAME_MAP);

  console.log(`\n🎰 Deploying: ${targets.map(([k]) => k).join(", ")}\n`);

  // Load existing addresses
  let addresses = fs.existsSync(ADDRESSES_FILE)
    ? JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"))
    : {};

  for (const [key, name] of targets) {
    addresses[key] = await deployContract(walletClient, publicClient, name);
    fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(addresses, null, 2));
  }

  // Print constants.ts snippet
  console.log("\n─────────────────────────────────────────────────────");
  console.log("✅ Done! Update lib/constants.ts:\n");
  console.log("export const CONTRACT_ADDRESSES = {");
  console.log(`  crashGame:        "${addresses.crash        ?? "0x0000000000000000000000000000000000000000"}",`);
  console.log(`  predictionMarket: "${addresses.predict      ?? "0x0000000000000000000000000000000000000000"}",`);
  console.log(`  chessWager:       "${addresses.chess        ?? "0x0000000000000000000000000000000000000000"}",`);
  console.log(`  blackjack:        "${addresses.blackjack    ?? "0x0000000000000000000000000000000000000000"}",`);
  console.log(`} as const;`);
  console.log("─────────────────────────────────────────────────────\n");
}

main().catch((e) => { console.error("❌ Deploy failed:", e.message); process.exit(1); });

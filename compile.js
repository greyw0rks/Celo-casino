const solc = require("solc");
const fs   = require("fs");
const path = require("path");

const CONTRACTS_DIR = path.join(__dirname, "contracts");
const OUT_DIR       = path.join(__dirname, "compiled");
fs.mkdirSync(OUT_DIR, { recursive: true });

const CONTRACTS = [
  "CrashGame",
  "PredictionMarket",
  "ChessWager",
  "Blackjack",
];

function compile(name) {
  const filename = `${name}.sol`;
  const source   = fs.readFileSync(path.join(CONTRACTS_DIR, filename), "utf8");

  const input = {
    language: "Solidity",
    sources:  { [filename]: { content: source } },
    settings: {
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
      optimizer: { enabled: true, runs: 200 },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errs = output.errors.filter((e) => e.severity === "error");
    if (errs.length) {
      errs.forEach((e) => console.error(e.formattedMessage));
      process.exit(1);
    }
  }

  const compiled  = output.contracts[filename][name];
  const artifact  = { contractName: name, abi: compiled.abi, bytecode: "0x" + compiled.evm.bytecode.object };
  fs.writeFileSync(path.join(OUT_DIR, `${name}.json`), JSON.stringify(artifact, null, 2));
  console.log(`✅ ${name.padEnd(20)} ${(compiled.evm.bytecode.object.length / 2 / 1024).toFixed(1)} KB`);
}

console.log("\n🔨 Compiling Celo Casino contracts...\n");
CONTRACTS.forEach(compile);
console.log("\n✅ All compiled → compiled/\n");

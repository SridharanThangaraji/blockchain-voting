#!/usr/bin/env node
/**
 * Print demo wallet addresses from Ganache (for copy-paste into Registration/Verify).
 * Run with stack up: ./run.sh start (in another terminal), then: node scripts/demo-credentials.js
 * Or: NODE_PATH=backend/node_modules node scripts/demo-credentials.js
 */
const path = require("path");
const RPC = "http://127.0.0.1:8545";

async function main() {
  const ethers = require(path.join(__dirname, "../backend/node_modules/ethers"));
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  let accounts = [];
  try {
    accounts = await provider.listAccounts();
  } catch (e) {
    console.error("Cannot reach Ganache at", RPC);
    console.error("Start the stack first: ./run.sh  or  npm start\n");
    process.exit(1);
  }

  console.log("\n------------------------------------------");
  console.log("  DEMO CREDENTIALS (Blockchain Voting)");
  console.log("------------------------------------------\n");
  console.log("No passwords — use these wallet addresses in the UI.\n");
  console.log("  Admin (account 0) — used by backend for contract actions:");
  console.log("    " + accounts[0] + "\n");
  console.log("  Voter 1 (for Registration / Vote / Verify):");
  console.log("    " + accounts[1] + "\n");
  console.log("  Voter 2:");
  console.log("    " + accounts[2] + "\n");
  console.log("  Voter 3:");
  console.log("    " + accounts[3] + "\n");
  console.log("  More voters (4–9):");
  accounts.slice(4, 10).forEach((a) => console.log("    " + a));
  console.log("\n------------------------------------------");
  console.log("  DEMO FLOW");
  console.log("------------------------------------------");
  console.log("  1. Open http://localhost:3000");
  console.log("  2. Register: paste \"Voter 1\" address → REGISTER CITIZEN");
  console.log("  3. Home: click \"Start Voting\" (admin) so voting phase begins");
  console.log("  4. Vote: go to Vote page, select a candidate (wallet from step 2 is remembered)");
  console.log("  5. Verify: paste same address → confirm \"vote secured on ledger\"");
  console.log("  6. Results: view live counts");
  console.log("------------------------------------------\n");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

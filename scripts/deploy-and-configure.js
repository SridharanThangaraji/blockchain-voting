#!/usr/bin/env node
/**
 * Compile and deploy Voting contract to local Ganache, then write backend/.env with CONTRACT_ADDRESS.
 * Requires Ganache running on port 8545.
 */
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "..");
const SMART_CONTRACTS = path.join(ROOT, "smart-contracts");
const BACKEND = path.join(ROOT, "backend");

const r = spawnSync("npx", ["hardhat", "compile"], { cwd: SMART_CONTRACTS, encoding: "utf8" });
if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  process.exit(1);
}

const deploy = spawnSync("node", ["scripts/deploy-ganache.js"], {
  cwd: SMART_CONTRACTS,
  encoding: "utf8",
});
const out = deploy.stdout + deploy.stderr;
const match = out.match(/Voting contract deployed to:\s*(0x[a-fA-F0-9]{40})/);
if (!match) {
  console.error(out);
  process.exit(1);
}
const address = match[1].trim();
const envPath = path.join(BACKEND, ".env");
const envContent = `CONTRACT_ADDRESS=${address}\nRPC_URL=http://127.0.0.1:8545\nPORT=3000\n`;
fs.writeFileSync(envPath, envContent, "utf8");
console.log("Contract deployed:", address);
console.log("Updated", envPath);

#!/usr/bin/env node
/**
 * Single script: Ganache + Backend + Frontend
 * 1. Starts Ganache (port 8545)
 * 2. Compiles & deploys Voting contract, writes backend/.env
 * 3. Initializes demo candidates
 * 4. Starts Backend on port 3000 (serves both API and frontend)
 * Usage: npm start  |  node scripts/run-all.js  |  ./run.sh
 */
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const http = require("http");

const ROOT = path.join(__dirname, "..");
const BACKEND = path.join(ROOT, "backend");
const SMART_CONTRACTS = path.join(ROOT, "smart-contracts");

const GANACHE_PORT = 8545;
const RPC_URL = `http://127.0.0.1:${GANACHE_PORT}`;

function log(msg) {
  console.log(`[run-all] ${msg}`);
}

function waitForRpc(url, timeoutMs = 20000) {
  const start = Date.now();
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] });
  return new Promise((resolve, reject) => {
    function tryRpc() {
      const req = http.request(
        url,
        { method: "POST", headers: { "Content-Type": "application/json" }, timeout: 3000 },
        (res) => {
          let data = "";
          res.on("data", (c) => (data += c));
          res.on("end", () => {
            try {
              if (JSON.parse(data).result != null) return resolve();
            } catch (_) {}
            if (Date.now() - start > timeoutMs) return reject(new Error("RPC not ready in time"));
            setTimeout(tryRpc, 400);
          });
        }
      );
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) reject(new Error("RPC not ready in time"));
        else setTimeout(tryRpc, 400);
      });
      req.on("timeout", () => req.destroy());
      req.end(body);
    }
    tryRpc();
  });
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const cwd = opts.cwd || ROOT;
    const child = spawn(cmd, args, {
      cwd,
      stdio: opts.silent ? "pipe" : "inherit",
      shell: false,
      ...opts,
    });
    if (opts.silent) {
      let out = "";
      let err = "";
      child.stdout?.on("data", (d) => (out += d.toString()));
      child.stderr?.on("data", (d) => (err += d.toString()));
      child.on("close", (code) => {
        if (code !== 0) reject(new Error(err || `Exit ${code}`));
        else resolve(out);
      });
    } else {
      child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
    }
  });
}

async function deployAndGetAddress() {
  log("Compiling contracts...");
  await run("npx", ["hardhat", "compile"], { cwd: SMART_CONTRACTS });

  log("Deploying contract to Ganache...");
  const out = await run("node", ["scripts/deploy-ganache.js"], {
    cwd: SMART_CONTRACTS,
    silent: true,
  });
  const match = out.match(/Voting contract deployed to:\s*(0x[a-fA-F0-9]{40})/);
  if (!match) throw new Error("Could not parse contract address from deploy output");
  return match[1].trim();
}

async function main() {
  log("Starting Ganache on port " + GANACHE_PORT + "...");
  const ganache = spawn("npx", ["ganache", "--port", String(GANACHE_PORT)], {
    cwd: BACKEND,
    stdio: "pipe",
    detached: true,
  });
  ganache.unref();

  log("Waiting for RPC to be ready...");
  await waitForRpc(RPC_URL);
  await new Promise((r) => setTimeout(r, 2000)); // allow Ganache to fully initialize

  let contractAddress;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      contractAddress = await deployAndGetAddress();
      break;
    } catch (err) {
      if (attempt === 3) throw err;
      log("Deploy attempt " + attempt + " failed, retrying in 2s...");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  log("Contract deployed: " + contractAddress);

  const envPath = path.join(BACKEND, ".env");
  const envContent = `CONTRACT_ADDRESS=${contractAddress}\nRPC_URL=${RPC_URL}\nPORT=3000\n`;
  fs.writeFileSync(envPath, envContent, "utf8");
  log("Wrote " + envPath);

  log("Initializing demo (candidates)...");
  await run("node", ["init-system.js"], { cwd: BACKEND });

  log("Starting backend (serves API + frontend at http://localhost:3000)...");
  log("Press Ctrl+C to stop.\n");
  const backend = spawn("node", ["index.js"], {
    cwd: BACKEND,
    stdio: "inherit",
    env: { ...process.env, CONTRACT_ADDRESS: contractAddress, RPC_URL, PORT: "3000" },
  });
  backend.on("close", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error("[run-all] Error:", err.message);
  process.exit(1);
});

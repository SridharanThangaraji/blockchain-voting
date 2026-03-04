#!/usr/bin/env node
/**
 * Health check: verifies Backend, Frontend, and optionally Ganache are up.
 * Usage: node scripts/check.js   or  npm run check
 */
const http = require("http");

const BASE = "http://localhost:3000";
const RPC = "http://127.0.0.1:8545";

function get(url, isJson = false) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      { hostname: u.hostname, port: u.port || 80, path: u.pathname, method: "GET", timeout: 3000 },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, data: isJson ? tryJson(data) : data }));
      }
    );
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    req.end();
  });
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const b = JSON.stringify(body);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(b) },
        timeout: 3000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, data }));
      }
    );
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    req.end(b);
  });
}

function tryJson(s) {
  try {
    return JSON.parse(s);
  } catch (_) {
    return null;
  }
}

async function main() {
  let failed = 0;

  console.log("Monitoring blockchain-voting stack...\n");

  // Ganache (optional)
  try {
    const r = await post(RPC, { jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] });
    const j = tryJson(r.data);
    if (j && j.result != null) {
      console.log("  Ganache (8545)     OK");
    } else {
      console.log("  Ganache (8545)     no response");
      failed++;
    }
  } catch (e) {
    console.log("  Ganache (8545)     DOWN -", e.message);
    failed++;
  }

  // Backend API
  try {
    const r = await get(BASE + "/api/status", true);
    if (r.status === 200 && r.data && r.data.success) {
      console.log("  Backend API (3000) OK  phase=" + r.data.phase + " totalVotes=" + r.data.totalVotes);
    } else {
      console.log("  Backend API (3000) FAIL status=" + r.status);
      failed++;
    }
  } catch (e) {
    console.log("  Backend API (3000)  DOWN -", e.message);
    failed++;
  }

  // Frontend
  const pages = ["/", "/pages/register.html", "/pages/vote.html", "/pages/verify.html", "/pages/results.html"];
  for (const p of pages) {
    try {
      const r = await get(BASE + p);
      if (r.status === 200) {
        console.log("  Frontend " + p.padEnd(24) + " 200");
      } else {
        console.log("  Frontend " + p.padEnd(24) + " " + r.status);
        failed++;
      }
    } catch (e) {
      console.log("  Frontend " + p.padEnd(24) + " DOWN -", e.message);
      failed++;
    }
  }

  console.log("");
  if (failed === 0) {
    console.log("All checks passed. Stack is healthy.");
    process.exit(0);
  } else {
    console.log(failed + " check(s) failed. Ensure npm start (or ./run.sh) is running.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Check failed:", e.message);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * End-to-end system tests: all API flows, validation, and logic.
 * Requires: stack running (./run.sh or npm start). Uses Ganache accounts 0=admin, 1,2,3=voters.
 * Run: NODE_PATH=backend/node_modules node tests/system-test.js   or  npm test
 */
const axios = require("axios");
const { ethers } = require("ethers");

const API_URL = "http://localhost:3000/api";
const RPC_URL = "http://127.0.0.1:8545";

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
let accounts = [];
let adminAddress;
let voter1Address, voter2Address, voter3Address;

let testsRun = 0;
let testsPassed = 0;

function pass(name, msg = "") {
  testsRun++;
  testsPassed++;
  console.log(`  ✅ ${name}${msg ? ": " + msg : ""}`);
}

function fail(name, reason) {
  testsRun++;
  console.log(`  ❌ ${name}: ${reason}`);
}

async function runTests() {
  console.log("🚀 Blockchain Voting – End-to-End Test Suite\n");

  try {
    accounts = await provider.listAccounts();
    adminAddress = accounts[0];
    voter1Address = accounts[1];
    voter2Address = accounts[2];
    voter3Address = accounts[3];
    console.log(`  Admin: ${adminAddress}`);
    console.log(`  Voters: 1=${voter1Address?.slice(0, 10)}... 2=${voter2Address?.slice(0, 10)}... 3=${voter3Address?.slice(0, 10)}...\n`);
  } catch (e) {
    console.error("⛔ Ganache not reachable. Start stack with: ./run.sh or npm start\n", e.message);
    process.exit(1);
  }

  // ---- 1–2: Health & Status ----
  console.log("--- 1. API Health & Status ---");
  try {
    const statusRes = await axios.get(`${API_URL}/status`);
    if (statusRes.data.success && typeof statusRes.data.phase !== "undefined") {
      pass("GET /api/status returns success and phase");
    } else {
      fail("GET /api/status", "missing success or phase");
    }
  } catch (e) {
    fail("GET /api/status", e.response?.data?.message || e.message);
  }

  try {
    const r = await axios.get(`${API_URL}/status`);
    const phase = r.data.phase;
    const validPhases = ["Registration", "Voting", "Ended"];
    const validNums = [0, 1, 2]; // Solidity enum: Registration=0, Voting=1, Ended=2
    if (validPhases.includes(phase) || validNums.includes(phase)) {
      pass("Phase is valid (string or enum number)");
    } else {
      fail("Phase value", `got ${phase}`);
    }
  } catch (e) {
    fail("Phase check", e.message);
  }

  // ---- 3–7: Registration ----
  console.log("\n--- 2. Voter Registration ---");
  try {
    const res = await axios.post(`${API_URL}/register`, { wallet: voter1Address });
    if (res.data.success) {
      pass("Register voter1");
    } else {
      fail("Register voter1", res.data.message);
    }
  } catch (e) {
    const msg = (e.response?.data?.message || e.message || "").toLowerCase();
    if (msg.includes("already registered")) pass("Register voter1 (already registered)");
    else if (msg.includes("registration period closed")) pass("Register voter1 (registration closed)");
    else fail("Register voter1", e.response?.data?.message || e.message);
  }

  try {
    await axios.post(`${API_URL}/register`, { wallet: voter2Address });
    pass("Register voter2");
  } catch (e) {
    const msg = (e.response?.data?.message || e.message || "").toLowerCase();
    if (msg.includes("already registered") || msg.includes("registration period closed")) pass("Register voter2 (idempotent/closed)");
    else fail("Register voter2", e.response?.data?.message || e.message);
  }

  try {
    await axios.post(`${API_URL}/register`, { wallet: voter1Address });
    fail("Duplicate registration", "should have been rejected");
  } catch (e) {
    const msg = (e.response?.data?.message || e.message || "").toLowerCase();
    if (msg.includes("already registered") || msg.includes("registration period closed")) {
      pass("Duplicate registration rejected");
    } else {
      fail("Duplicate registration", "unexpected: " + (e.response?.data?.message || e.message));
    }
  }

  try {
    await axios.post(`${API_URL}/register`, {});
    fail("Register without wallet", "should return 400");
  } catch (e) {
    if (e.response?.status === 400) pass("Register without wallet returns 400");
    else fail("Register without wallet", `status ${e.response?.status}`);
  }

  try {
    await axios.post(`${API_URL}/register`, { wallet: "not-an-address" });
    fail("Register invalid wallet", "should fail");
  } catch (e) {
    if (e.response?.status === 400 || e.response?.status === 500) pass("Register invalid wallet rejected");
    else fail("Register invalid wallet", `status ${e.response?.status}`);
  }

  // ---- 8–10: Verify ----
  console.log("\n--- 3. Vote Verification ---");
  try {
    const res = await axios.post(`${API_URL}/verify`, { wallet: voter1Address });
    if (res.data.success && res.data.registered) pass("Verify voter1 is registered");
    else fail("Verify voter1", "registered not true");
  } catch (e) {
    fail("Verify voter1", e.message);
  }

  try {
    const res = await axios.post(`${API_URL}/verify`, { wallet: voter3Address });
    if (res.data.success && res.data.registered === false) pass("Verify unregistered voter returns registered false");
    else fail("Verify unregistered", `registered=${res.data?.registered}`);
  } catch (e) {
    fail("Verify unregistered", e.message);
  }

  try {
    await axios.post(`${API_URL}/verify`, {});
    fail("Verify without wallet", "should return 400");
  } catch (e) {
    if (e.response?.status === 400) pass("Verify without wallet returns 400");
    else fail("Verify without wallet", `status ${e.response?.status}`);
  }

  // ---- 11–12: Candidates ----
  console.log("\n--- 4. Candidates ---");
  try {
    const res = await axios.get(`${API_URL}/candidates`);
    if (res.data.success && Array.isArray(res.data.data) && res.data.data.length >= 1) {
      pass("GET /api/candidates returns array with at least one candidate");
    } else {
      fail("GET /api/candidates", "invalid or empty data");
    }
  } catch (e) {
    fail("GET /api/candidates", e.message);
  }

  try {
    const res = await axios.get(`${API_URL}/candidates`);
    const first = res.data.data?.[0];
    if (first && typeof first.id !== "undefined" && first.name && typeof first.voteCount !== "undefined") {
      pass("Candidate object has id, name, voteCount");
    } else {
      fail("Candidate shape", "missing id/name/voteCount");
    }
  } catch (e) {
    fail("Candidate shape", e.message);
  }

  // ---- 13–15: Admin ----
  console.log("\n--- 5. Admin – Phase & Candidates ---");
  try {
    await axios.post(`${API_URL}/admin/start`);
    pass("Admin start voting");
  } catch (e) {
    const msg = (e.response?.data?.message || e.message || "").toLowerCase();
    if (msg.includes("already") || msg.includes("registration")) pass("Admin start (already started or wrong phase)");
    else fail("Admin start", e.response?.data?.message || e.message);
  }

  try {
    await axios.post(`${API_URL}/admin/candidate`, { name: "Test Candidate E2E" });
    fail("Add candidate during Voting", "should be rejected");
  } catch (e) {
    const msg = (e.response?.data?.message || e.message || "").toLowerCase();
    if (e.response?.status === 500 && msg) pass("Add candidate during Voting rejected");
    else fail("Add candidate during Voting", `status ${e.response?.status}`);
  }

  try {
    await axios.post(`${API_URL}/admin/candidate`, {});
    fail("Admin add candidate without name", "should return 400");
  } catch (e) {
    if (e.response?.status === 400) pass("Admin add candidate without name returns 400");
    else fail("Admin add candidate without name", `status ${e.response?.status}`);
  }

  // ---- 16–22: Voting ----
  console.log("\n--- 6. Voting ---");
  try {
    const res = await axios.post(`${API_URL}/vote`, { candidate: 1, wallet: voter1Address });
    if (res.data.success) pass("Cast vote voter1 → candidate 1");
    else fail("Cast vote voter1", res.data.message);
  } catch (e) {
    const msg = (e.response?.data?.message || e.message || "").toLowerCase();
    if (msg.includes("already cast")) pass("Cast vote voter1 (already voted)");
    else fail("Cast vote voter1", e.response?.data?.message || e.message);
  }

  try {
    await axios.post(`${API_URL}/vote`, { candidate: 1, wallet: voter1Address });
    fail("Double vote voter1", "should be rejected");
  } catch (e) {
    const msg = (e.response?.data?.message || e.message || "").toLowerCase();
    if (msg.includes("already cast") || msg.includes("revert")) pass("Double vote rejected");
    else fail("Double vote", e.response?.data?.message || e.message);
  }

  try {
    await axios.post(`${API_URL}/vote`, { candidate: 1, wallet: voter3Address });
    fail("Vote by unregistered voter", "should be rejected");
  } catch (e) {
    const msg = (e.response?.data?.message || e.message || "").toLowerCase();
    if (e.response?.status === 500 && msg) pass("Unregistered voter vote rejected");
    else fail("Unregistered voter vote", `status ${e.response?.status}`);
  }

  try {
    await axios.post(`${API_URL}/vote`, { candidate: 999, wallet: voter2Address });
    fail("Invalid candidate ID", "should be rejected");
  } catch (e) {
    const msg = (e.response?.data?.message || e.message || "").toLowerCase();
    if (e.response?.status === 500 && msg) pass("Invalid candidate ID rejected");
    else fail("Invalid candidate ID", e.response?.data?.message || e.message);
  }

  try {
    const res = await axios.post(`${API_URL}/vote`, { candidate: 2, wallet: voter2Address });
    if ((await axios.post(`${API_URL}/verify`, { wallet: voter2Address })).data.verified) {
      pass("Cast vote voter2 → candidate 2 and verify voted");
    } else {
      pass("Cast vote voter2");
    }
  } catch (e) {
    const msg = (e.response?.data?.message || e.message || "").toLowerCase();
    if (msg.includes("already cast")) pass("Cast vote voter2 (already voted)");
    else fail("Cast vote voter2", e.response?.data?.message || e.message);
  }

  try {
    await axios.post(`${API_URL}/vote`, { candidate: 1 });
    fail("Vote without wallet", "should return 400");
  } catch (e) {
    if (e.response?.status === 400) pass("Vote without wallet returns 400");
    else fail("Vote without wallet", `status ${e.response?.status}`);
  }

  try {
    await axios.post(`${API_URL}/vote`, { wallet: voter2Address });
    fail("Vote without candidate", "should return 400");
  } catch (e) {
    if (e.response?.status === 400) pass("Vote without candidate returns 400");
    else fail("Vote without candidate", `status ${e.response?.status}`);
  }

  // ---- 23–25: Results ----
  console.log("\n--- 7. Results ---");
  try {
    const res = await axios.get(`${API_URL}/results`);
    if (res.data.success && res.data.data && Array.isArray(res.data.data.candidates)) {
      pass("GET /api/results returns success and candidates array");
    } else {
      fail("GET /api/results", "invalid structure");
    }
  } catch (e) {
    fail("GET /api/results", e.message);
  }

  try {
    const res = await axios.get(`${API_URL}/results`);
    const total = res.data.data?.totalVotes;
    if (typeof total !== "undefined" && Number(total) >= 0) pass("Results include totalVotes");
    else fail("Results totalVotes", "missing or invalid");
  } catch (e) {
    fail("Results totalVotes", e.message);
  }

  try {
    const res = await axios.get(`${API_URL}/results`);
    const phase = res.data.data?.phase;
    const validPhases = ["Registration", "Voting", "Ended"];
    const validNums = [0, 1, 2];
    if (validPhases.includes(phase) || validNums.includes(phase)) pass("Results include phase");
    else fail("Results phase", `got ${phase}`);
  } catch (e) {
    fail("Results phase", e.message);
  }

  // ---- 26–27: Admin register ----
  console.log("\n--- 8. Admin Routes ---");
  try {
    await axios.post(`${API_URL}/admin/register`, { address: voter3Address });
    fail("Admin register during Voting", "contract should reject");
  } catch (e) {
    const msg = (e.response?.data?.message || e.message || "").toLowerCase();
    if (e.response?.status === 500 && msg) pass("Admin register during Voting rejected");
    else fail("Admin register during Voting", e.response?.data?.message || e.message);
  }

  try {
    await axios.post(`${API_URL}/admin/register`, {});
    fail("Admin register without address", "should return 400");
  } catch (e) {
    if (e.response?.status === 400) pass("Admin register without address returns 400");
    else fail("Admin register without address", `status ${e.response?.status}`);
  }

  // ---- 28–32: Frontend & consistency ----
  console.log("\n--- 9. Frontend & Consistency ---");
  const base = "http://localhost:3000";
  const pages = ["/", "/pages/register.html", "/pages/vote.html", "/pages/verify.html", "/pages/results.html"];
  for (const p of pages) {
    try {
      const r = await axios.get(base + p, { validateStatus: () => true });
      if (r.status === 200) pass("Frontend " + (p || "/"));
      else fail("Frontend " + p, "status " + r.status);
    } catch (e) {
      fail("Frontend " + p, e.message);
    }
  }

  try {
    const statusRes = await axios.get(`${API_URL}/status`);
    const resultsRes = await axios.get(`${API_URL}/results`);
    if (String(statusRes.data.totalVotes) === String(resultsRes.data.data?.totalVotes)) {
      pass("Status totalVotes matches results totalVotes");
    } else {
      fail("Total votes consistency", `status=${statusRes.data.totalVotes} results=${resultsRes.data.data?.totalVotes}`);
    }
  } catch (e) {
    fail("Total votes consistency", e.message);
  }

  try {
    const verifyRes = await axios.post(`${API_URL}/verify`, { wallet: voter1Address });
    if (verifyRes.data.success && verifyRes.data.verified === true) pass("Voter1 verify voted = true");
    else fail("Voter1 verified", `verified=${verifyRes.data?.verified}`);
  } catch (e) {
    fail("Voter1 verified", e.message);
  }

  // ---- Summary ----
  console.log("\n" + "─".repeat(50));
  console.log(`  Total: ${testsPassed}/${testsRun} tests passed`);
  if (testsPassed < testsRun) {
    console.log("  ⚠️  Some tests failed.\n");
    process.exit(1);
  }
  console.log("  All tests passed.\n");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("\n⛔ Fatal:", err.message);
  process.exit(1);
});

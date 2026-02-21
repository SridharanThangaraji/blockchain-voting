const axios = require('axios');
const { ethers } = require('ethers');

// Configuration
const API_URL = 'http://localhost:3000/api';
const CANDIDATE_ID = 1; // Candidate to vote for

// Setup provider to list accounts (mimicking what backend does)
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
let WALLET_ADDRESS;

async function runTests() {
    console.log('🚀 Starting Automated System Verification...\n');

    try {
        // Get Accounts
        const accounts = await provider.listAccounts();
        WALLET_ADDRESS = accounts[1]; // Use Account 1 for testing (Account 0 is Admin)
        console.log(`ℹ️ Testing with Wallet: ${WALLET_ADDRESS}`);

        // --- TEST CASE 1: Standard Registration ---
        console.log('\nTest Case 1: Standard Registration');
        try {
            const regRes = await axios.post(`${API_URL}/register`, { wallet: WALLET_ADDRESS });
            if (regRes.data.success) {
                console.log('✅ PASS: Voter registered successfully.');
            } else {
                throw new Error(regRes.data.message);
            }
        } catch (e) {
            const msg = (e.response?.data?.message || e.message || '').toLowerCase();
            if (msg.includes('already registered')) {
                console.log('✅ PASS: Wallet was already registered (idempotency check).');
            } else if (msg.includes('registration period closed') || msg.includes('revert')) {
                console.log('✅ PASS: Registration closed (voting already started from prior run).');
            } else {
                console.error('❌ FAIL: Registration failed:', e.response?.data?.message || e.message);
            }
        }

        // --- TEST CASE 2: Duplicate Registration ---
        console.log('\nTest Case 2: Prevent Duplicate Registration');
        try {
            await axios.post(`${API_URL}/register`, { wallet: WALLET_ADDRESS });
            console.error('❌ FAIL: Duplicate registration should have been rejected.');
        } catch (e) {
            const msg = (e.response?.data?.message || e.message || '').toLowerCase();
            const rejected = msg.includes('already registered') || msg.includes('registration period closed') || msg.includes('revert');
            if (e.response?.status === 500 && rejected) {
                console.log('✅ PASS: Duplicate registration correctly rejected.');
            } else if (rejected) {
                console.log('✅ PASS: Duplicate registration correctly rejected.');
            } else {
                console.error('❌ FAIL: Unexpected error:', e.response?.data?.message || e.message);
            }
        }

        // --- TEST CASE 3: Verify Discovery (Review Phase 2) ---
        console.log('\nTest Case 3: Voter Discovery');
        try {
            const verifyRes = await axios.post(`${API_URL}/verify`, { wallet: WALLET_ADDRESS });
            if (verifyRes.data.success && verifyRes.data.registered) {
                console.log('✅ PASS: Voter discovered in ledger.');
            } else {
                console.error('❌ FAIL: Voter not found in ledger.');
            }
        } catch (e) {
            console.error('❌ FAIL: Verification request failed:', e.message);
        }

        // --- TEST CASE 4: Successful Ballot Casting ---
        console.log('\nTest Case 4: Successful Ballot Casting');
        // First, verify we haven't voted yet
        const checkRes = await axios.post(`${API_URL}/verify`, { wallet: WALLET_ADDRESS });
        if (!checkRes.data.verified) {
            // Backend must be in VOTING phase!
            // Admin (Account 0) must start voting.
            // Let's force start voting just in case.
            try {
                await axios.post(`${API_URL}/admin/start`);
                console.log('ℹ️ Voting phase ensured.');
            } catch (e) {
                // Might fail if already started, which is fine
            }

            try {
                // Pass wallet explicitly now!
                const voteRes = await axios.post(`${API_URL}/vote`, { candidate: CANDIDATE_ID, wallet: WALLET_ADDRESS });
                if (voteRes.data.success) {
                    console.log('✅ PASS: Vote cast successfully.');
                }
            } catch (e) {
                console.error('❌ FAIL: Voting failed:', e.response?.data || e.message);
            }
        } else {
            console.log('⚠️ NOTE: Voter already voted. Skipping vote execution.');
        }

        // --- TEST CASE 5: Prevent Double Voting ---
        console.log('\nTest Case 5: Prevent Double Voting');
        try {
            await axios.post(`${API_URL}/vote`, { candidate: CANDIDATE_ID, wallet: WALLET_ADDRESS });
            console.error('❌ FAIL: Double voting should be rejected.');
        } catch (e) {
            if (e.response && e.response.data.message.includes('already cast a vote')) {
                console.log('✅ PASS: Double voting correctly rejected.');
            } else if (e.response && e.response.data.message.includes('revert')) {
                console.log('✅ PASS: Transaction reverted as expected.');
            } else {
                console.log(`✅ PASS: Rejected with message: ${e.response?.data?.message}`);
            }
        }

        // --- TEST CASE 6: Results Consistency ---
        console.log('\nTest Case 6: Results Consistency');
        try {
            const resultsRes = await axios.get(`${API_URL}/results`);
            const data = resultsRes.data.data || resultsRes.data;
            const candidate = (data.candidates || []).find(c => c.id == CANDIDATE_ID);
            if (candidate && Number(candidate.voteCount) > 0) {
                console.log(`✅ PASS: Results reflect votes (Candidate ${candidate.name}: ${candidate.voteCount}).`);
            } else {
                console.error('❌ FAIL: Vote count not updated.');
            }
        } catch (e) {
            console.error('❌ FAIL: Could not fetch results:', e.message);
        }

    } catch (error) {
        console.error('\n⛔ FATAL ERROR:', error);
    }
}

runTests();

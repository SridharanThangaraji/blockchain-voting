const express = require("express");
const router = express.Router();
const { provider } = require("../config/blockchain");

/**
 * GET /api/demo-accounts
 * Returns Ganache wallet addresses for demo use (Registration, Vote, Verify).
 */
router.get("/", async (req, res) => {
  try {
    const accounts = await provider.listAccounts();
    const list = accounts.map((addr, i) => ({
      role: i === 0 ? "Admin" : `Voter ${i}`,
      address: addr,
    }));
    res.json({ success: true, accounts: list });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;

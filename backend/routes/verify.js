const express = require("express");
const router = express.Router();
const votingService = require("../services/voting.service");

/*
  POST /api/verify
  Verifies if a wallet has registered or voted.
*/
router.post("/", async (req, res) => {
  try {
    const { wallet } = req.body;
    if (!wallet) return res.status(400).json({ success: false, message: "Wallet required" });

    const registered = await votingService.isRegistered(wallet);
    const voted = await votingService.hasVoted(wallet);

    res.json({
      success: true,
      registered,
      verified: voted // 'verified' used by frontend for vote check
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

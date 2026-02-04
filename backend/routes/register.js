const express = require("express");
const router = express.Router();
const votingService = require("../services/voting.service");

/*
  POST /api/register
  Registers a voter using wallet address
*/
router.post("/", async (req, res) => {
  try {
    const { wallet } = req.body;

    // Check input
    if (!wallet) {
      return res.status(400).json({
        success: false,
        message: "Wallet address is required"
      });
    }

    // Register voter
    await votingService.registerVoter(wallet);

    res.json({
      success: true,
      message: "Voter registered successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

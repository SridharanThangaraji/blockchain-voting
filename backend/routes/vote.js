const express = require("express");
const router = express.Router();
const votingService = require("../services/voting.service");

/*
  POST /api/vote
  Cast a vote for a candidate
*/
router.post("/", async (req, res) => {
  try {
    const { candidate, wallet } = req.body;

    // Validate input
    if (candidate === undefined || !wallet) {
      return res.status(400).json({
        success: false,
        message: "Candidate ID and Wallet Address are required"
      });
    }

    // Delegate voting logic to service
    await votingService.castVote(candidate, wallet);

    res.json({
      success: true,
      message: "Vote cast successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

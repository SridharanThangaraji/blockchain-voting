const express = require("express");
const router = express.Router();
const votingService = require("../services/voting.service");

/*
  GET /api/verify
  Returns voting verification data
*/
router.get("/", async (req, res) => {
  try {
    const events = await votingService.getVoteEvents();

    res.json({
      success: true,
      data: events
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

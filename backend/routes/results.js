const express = require("express");
const router = express.Router();
const votingService = require("../services/voting.service");

/*
  GET /api/results
  Returns voting results
*/
router.get("/", async (req, res) => {
  try {
    const results = await votingService.getResults();

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const votingService = require("../services/voting.service");

/*
  POST /api/admin/register
  Register a voter (admin action)
*/
router.post("/register", async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Voter address is required"
      });
    }

    await votingService.registerVoter(address);

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

/*
  POST /api/admin/start
  Start the voting process
*/
router.post("/start", async (req, res) => {
  try {
    await votingService.startVoting();

    res.json({
      success: true,
      message: "Voting started"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/*
  POST /api/admin/end
  End the voting process
*/
router.post("/end", async (req, res) => {
  try {
    await votingService.endElection();

    res.json({
      success: true,
      message: "Voting ended"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

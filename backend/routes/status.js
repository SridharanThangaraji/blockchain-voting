const express = require("express");
const router = express.Router();
const votingService = require("../services/voting.service");

router.get("/", async (req, res) => {
    try {
        const status = await votingService.getResults(); // contains phase info
        res.json({
            success: true,
            phase: status.phase,
            totalVotes: status.totalVotes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;

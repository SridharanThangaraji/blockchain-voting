const express = require("express");
const router = express.Router();
const votingService = require("../services/voting.service");

/**
 * GET /api/candidates
 * Returns a list of all registered candidates.
 */
router.get("/", async (req, res) => {
    try {
        const candidates = await votingService.getCandidates();
        res.json({
            success: true,
            data: candidates,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

module.exports = router;

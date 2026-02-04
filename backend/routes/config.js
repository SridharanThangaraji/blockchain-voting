// routes/config.js
const express = require("express");
const { review, features } = require("../config/review.config");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ review, features });
});

module.exports = router;

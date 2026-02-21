const express = require("express");
const router = express.Router();

// Import route files
const register = require("./register");
const vote = require("./vote");
const results = require("./results");
const verify = require("./verify");
const candidates = require("./candidates");
const status = require("./status");
const admin = require("./admin");

/*
  Main API Routes
*/
router.use("/register", register);
router.use("/vote", vote);
router.use("/results", results);
router.use("/verify", verify);
router.use("/candidates", candidates);
router.use("/status", status);
router.use("/admin", admin);

module.exports = router;

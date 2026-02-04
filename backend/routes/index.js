const express = require("express");
const router = express.Router();

// Import route files
const register = require("./register");
const vote = require("./vote");
const results = require("./results");
const verify = require("./verify");
const config = require("./config")
/*
  Main API Routes
*/
router.use("/register", register);
router.use("/vote", vote);
router.use("/results", results);
router.use("/verify", verify);
router.use("/config", config);

module.exports = router;

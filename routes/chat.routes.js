const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { chat } = require("../controllers/chatController");

router.post("/", authenticateToken, chat);

module.exports = router;
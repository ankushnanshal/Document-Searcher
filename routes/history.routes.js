const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { addHistory, getHistory, clearHistory } = require("../controllers/historyController");

router.post("/", authenticateToken, addHistory);
router.get("/:email", authenticateToken, getHistory);
router.delete("/:email", authenticateToken, clearHistory);

module.exports = router;
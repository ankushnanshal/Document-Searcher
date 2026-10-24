const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { getNotifications, getUnreadCount, markAsRead } = require("../controllers/notificationController");

router.get("/", authenticateToken, getNotifications);
router.get("/unread-count", authenticateToken, getUnreadCount);
router.post("/:id/read", authenticateToken, markAsRead);

module.exports = router;
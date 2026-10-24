const { Notification } = require("../models/Notification");

async function getNotifications(req, res) {
  try {
    const notifications = await Notification.find({ recipient: req.user.email.toLowerCase() }).sort({ createdAt: -1 }).limit(50);
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching notifications." });
  }
}

async function getUnreadCount(req, res) {
  try {
    const count = await Notification.countDocuments({ recipient: req.user.email.toLowerCase(), isRead: false });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching notification count." });
  }
}

async function markAsRead(req, res) {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.email.toLowerCase() },
      { isRead: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: "Notification not found." });
    res.status(200).json({ message: "Notification marked as read.", notif });
  } catch (error) {
    res.status(500).json({ message: "Server error while updating notification." });
  }
}

module.exports = { getNotifications, getUnreadCount, markAsRead };
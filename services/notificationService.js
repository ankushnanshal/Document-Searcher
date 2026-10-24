const { Notification } = require("../models/Notification");
const { User } = require("../models/User");
const { COLLEGE_WIDE_ROLES } = require("../config/constants");

async function createNotification(recipient, sender, senderName, type, title, message, resourceId, requestId) {
  try {
    if (!recipient) return null;
    const notif = new Notification({
      recipient: recipient.toLowerCase().trim(),
      sender: sender || "",
      senderName: senderName || "",
      type: type || "INFO",
      title,
      message,
      resourceId: resourceId || null,
      requestId: requestId || null
    });
    await notif.save();
    return notif;
  } catch (e) {
    console.error("Notification error:", e.message);
    return null;
  }
}

async function getUsersByRole(role) {
  return await User.find({ role }).select('email name');
}

async function getCollegeWideRecipients() {
  return await User.find({ role: { $in: COLLEGE_WIDE_ROLES } }).select('email name role');
}

module.exports = { createNotification, getUsersByRole, getCollegeWideRecipients };
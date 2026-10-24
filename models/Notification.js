const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient: { type: String, required: true, lowercase: true, trim: true },
  sender: { type: String, default: "" },
  senderName: { type: String, default: "" },
  type: { type: String, enum: ["DELETION_REQUEST", "DELETION_APPROVED", "DELETION_REJECTED", "INFO"], default: "INFO" },
  title: { type: String, required: true },
  message: { type: String, required: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: "DeletionRequest" },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
module.exports = { Notification, notificationSchema };
const mongoose = require("mongoose");

const deletionAuditSchema = new mongoose.Schema({
  resourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  resourceName: { type: String, required: true },
  originalUploader: { type: String, required: true },
  deletedBy: { type: String, required: true },
  deletedByName: { type: String, required: true },
  deletedByRole: { type: String, required: true },
  deletionType: { type: String, enum: ["DIRECT_DELETE", "REQUEST_APPROVED"], required: true },
  deletionReason: { type: String, required: true },
  deletedAt: { type: Date, default: Date.now },
  department: { type: String, default: null },
  branch: { type: String, default: "" }
});

const DeletionAudit = mongoose.models.DeletionAudit || mongoose.model("DeletionAudit", deletionAuditSchema);
module.exports = { DeletionAudit, deletionAuditSchema };
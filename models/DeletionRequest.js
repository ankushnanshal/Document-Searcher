const mongoose = require("mongoose");

const deletionRequestSchema = new mongoose.Schema({
  resourceId: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
  resourceName: { type: String, required: true },
  originalUploader: { type: String, required: true },
  originalUploaderName: { type: String, default: "" },
  requestedBy: { type: String, required: true },
  requesterName: { type: String, default: "" },
  requesterRole: { type: String, required: true },
  targetAuthority: { type: String, required: true },
  requestType: { type: String, enum: ["UPLOADER_APPROVAL", "HIGHER_AUTHORITY_APPROVAL"], required: true },
  comment: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected", "cancelled"], default: "pending" },
  responseComment: { type: String, default: "" },
  respondedBy: { type: String, default: "" },
  respondedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

const DeletionRequest = mongoose.models.DeletionRequest || mongoose.model("DeletionRequest", deletionRequestSchema);
module.exports = { DeletionRequest, deletionRequestSchema };
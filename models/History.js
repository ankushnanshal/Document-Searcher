const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  title: { type: String, required: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
  chunkId: { type: mongoose.Schema.Types.ObjectId, ref: "Chunk" },
  timestamp: { type: Date, default: Date.now }
});

const History = mongoose.models.History || mongoose.model("History", historySchema);
module.exports = { History, historySchema };
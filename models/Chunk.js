const mongoose = require("mongoose");

const chunkSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
  chunkIndex: { type: Number, required: true },
  text: { type: String, required: true },
  textHindi: { type: String, default: "" },
  textRomanized: { type: String, default: "" },
  pageNumber: { type: Number, default: 0 },
  startOffset: { type: Number, default: 0 },
  endOffset: { type: Number, default: 0 },
  embedding: { type: [Number], default: [] },
  metadata: {
    title: { type: String, default: "" },
    category: { type: String, default: "" },
    branch: { type: String, default: "" },
    semester: { type: String, default: "" },
    year: { type: String, default: "" },
    session: { type: String, default: "" },
    officialDocType: { type: String, default: "" },
    paperType: { type: String, default: "" },
    department: { type: String, default: "" },
    status: { type: String, default: "published" }
  },
  createdAt: { type: Date, default: Date.now }
});

chunkSchema.index({ documentId: 1, chunkIndex: 1 });
chunkSchema.index({ text: "text" });
chunkSchema.index({ "metadata.category": 1, "metadata.branch": 1 });
chunkSchema.index({ "metadata.department": 1 });

const Chunk = mongoose.models.Chunk || mongoose.model("Chunk", chunkSchema);
module.exports = { Chunk, chunkSchema };
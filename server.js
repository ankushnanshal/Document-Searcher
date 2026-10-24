const express = require("express");
const path = require("path");
require("dotenv").config();

const env = require("./config/env");

require("./models/User");
require("./models/Document");
require("./models/Chunk");
require("./models/History");
require("./models/DeletionAudit");
require("./models/DeletionRequest");
require("./models/Notification");

require("./config/db");

const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const documentRoutes = require("./routes/document.routes");
const deletionRoutes = require("./routes/deletion.routes");
const deletionAuditRoutes = require("./routes/deletionAudit.routes");
const notificationRoutes = require("./routes/notification.routes");
const historyRoutes = require("./routes/history.routes");
const chatRoutes = require("./routes/chat.routes");
const statusRoutes = require("./routes/status.routes");

const { Document } = require("./models/Document");
const { Chunk } = require("./models/Chunk");
const { User } = require("./models/User");
const { DeletionAudit } = require("./models/DeletionAudit");
const { DeletionRequest } = require("./models/DeletionRequest");

const app = express();
app.use(require("cors")());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

const PUBLIC_FILES = ['index.html', 'script.js', 'style.css'];
PUBLIC_FILES.forEach(file => {
  app.get(`/${file}`, (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, file));
  });
});

app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/deletion-requests", deletionRoutes);
app.use("/api/deletion-audit", deletionAuditRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/status", statusRoutes);

app.use(errorHandler);

app.listen(env.PORT, async () => {
  console.log(`Server running on port ${env.PORT}`);
  console.log(`Storage mode: ${env.STORAGE_MODE}`);
  console.log(`OCR DPI: ${env.OCR_DPI}`);
  console.log(`AI services: ${env.genAI || env.openai ? 'Enabled' : 'Disabled'}`);
  console.log(`Embedding model: ${env.EMBEDDING_MODEL}`);
  console.log(`Chunk size: ${env.CHUNK_SIZE}, Overlap: ${env.CHUNK_OVERLAP}`);
  console.log(`Role-based access control: Enabled`);
  console.log(`Approval workflow: Enabled`);
  console.log(`Departments: ${Object.values(env.DEPARTMENTS).join(', ')}`);
  console.log(`CSE Branches: ${env.CSE_BRANCHES.join(', ')}`);
  console.log(`Drafts feature: Enabled`);
  console.log(`Department-based access control: Enabled`);
  console.log(`Deletion audit & request system: Enabled`);
  const docCount = await Document.countDocuments().catch(() => 0);
  const chunkCount = await Chunk.countDocuments().catch(() => 0);
  const userCount = await User.countDocuments().catch(() => 0);
  const auditCount = await DeletionAudit.countDocuments().catch(() => 0);
  const requestCount = await DeletionRequest.countDocuments().catch(() => 0);
  console.log(`Existing documents: ${docCount}, chunks: ${chunkCount}, users: ${userCount}, audits: ${auditCount}, requests: ${requestCount}`);
});
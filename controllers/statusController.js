const { Document } = require("../models/Document");
const { Chunk } = require("../models/Chunk");
const { User } = require("../models/User");
const { DeletionAudit } = require("../models/DeletionAudit");
const { DeletionRequest } = require("../models/DeletionRequest");
const env = require("../config/env");
const { ROLES, DEPARTMENTS, CSE_BRANCHES } = require("../config/constants");

async function getStatus(req, res) {
  const docCount = await Document.countDocuments().catch(() => 0);
  const chunkCount = await Chunk.countDocuments().catch(() => 0);
  const userCount = await User.countDocuments().catch(() => 0);
  const deletionAuditCount = await DeletionAudit.countDocuments().catch(() => 0);
  const deletionRequestCount = await DeletionRequest.countDocuments().catch(() => 0);
  res.json({
    status: "online",
    version: "3.2.0",
    features: {
      ocr: true,
      semanticSearch: process.env.SEMANTIC_SEARCH_ENABLED === 'true',
      vectorSearch: process.env.VECTOR_SEARCH_ENABLED === 'true',
      chunking: true,
      embeddingModel: env.EMBEDDING_MODEL,
      embeddingDimension: env.EMBEDDING_DIMENSION,
      chunkSize: env.CHUNK_SIZE,
      chunkOverlap: env.CHUNK_OVERLAP,
      chatbot: !!(env.genAI || env.openai),
      drafts: true,
      approvalWorkflow: true,
      roleBasedAccess: true,
      departmentIsolation: true,
      branchAccessControl: true,
      cseBranches: CSE_BRANCHES,
      deletionAudit: true,
      deletionRequests: true
    },
    roles: Object.values(ROLES),
    departments: Object.values(DEPARTMENTS),
    cseBranches: CSE_BRANCHES,
    storage: env.STORAGE_MODE,
    stats: {
      documents: docCount,
      chunks: chunkCount,
      users: userCount,
      deletionAudits: deletionAuditCount,
      deletionRequests: deletionRequestCount
    }
  });
}

module.exports = { getStatus };
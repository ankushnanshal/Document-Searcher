const express = require("express");
const router = express.Router();
const { authenticateToken, requireFaculty, requireAdmin } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const {
  uploadDocument,
  getDrafts,
  getPendingApproval,
  approveDocument,
  rejectDocument,
  publishDocument,
  deleteDraft,
  getDraft,
  updateDraft,
  searchDocuments,
  debugDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  reindexDocuments
} = require("../controllers/documentController");

router.post("/upload", authenticateToken, requireFaculty, upload.single("file"), uploadDocument);
router.get("/drafts", authenticateToken, requireFaculty, getDrafts);
router.get("/pending-approval", authenticateToken, requireFaculty, getPendingApproval);
router.post("/:id/approve", authenticateToken, requireFaculty, approveDocument);
router.post("/:id/reject", authenticateToken, requireFaculty, rejectDocument);
router.post("/publish/:id", authenticateToken, requireFaculty, publishDocument);
router.delete("/draft/:id", authenticateToken, requireFaculty, deleteDraft);
router.get("/draft/:id", authenticateToken, requireFaculty, getDraft);
router.put("/draft/:id", authenticateToken, requireFaculty, updateDraft);
router.get("/search", authenticateToken, searchDocuments);
router.get("/debug", authenticateToken, requireAdmin, debugDocuments);
router.post("/reindex", authenticateToken, requireAdmin, reindexDocuments);
router.get("/:id", authenticateToken, getDocument);
router.put("/:id", authenticateToken, requireFaculty, updateDocument);
router.delete("/:id", authenticateToken, requireFaculty, deleteDocument);

module.exports = router;
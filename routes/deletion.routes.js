const express = require("express");
const router = express.Router();
const { authenticateToken, requireFaculty, requireCollegeWideAccess } = require("../middleware/auth");
const {
  createDeletionRequest,
  getIncomingRequests,
  getOutgoingRequests,
  getPendingCount,
  approveRequest,
  rejectRequest,
  cancelRequest,
  getDeletionAudit
} = require("../controllers/deletionController");

router.post("/", authenticateToken, requireFaculty, createDeletionRequest);
router.get("/incoming", authenticateToken, getIncomingRequests);
router.get("/outgoing", authenticateToken, getOutgoingRequests);
router.get("/pending-count", authenticateToken, getPendingCount);
router.post("/:id/approve", authenticateToken, approveRequest);
router.post("/:id/reject", authenticateToken, rejectRequest);
router.post("/:id/cancel", authenticateToken, cancelRequest);

module.exports = router;
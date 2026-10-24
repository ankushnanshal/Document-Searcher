const fs = require("fs");
const path = require("path");
const { Document } = require("../models/Document");
const { Chunk } = require("../models/Chunk");
const { User } = require("../models/User");
const { DeletionAudit } = require("../models/DeletionAudit");
const { DeletionRequest } = require("../models/DeletionRequest");
const env = require("../config/env");
const { DIRECT_DELETE_ROLES, REQUEST_DELETE_ROLES, COLLEGE_WIDE_ROLES } = require("../config/constants");
const { getRoleDisplay } = require("../utils/roleUtils");
const { createNotification } = require("../services/notificationService");

async function createDeletionRequest(req, res) {
  try {
    const { resourceId, comment, targetAuthority, requestType } = req.body;
    if (!resourceId || !comment || !comment.trim()) {
      return res.status(400).json({ message: "Resource ID and reason are required." });
    }

    const doc = await Document.findById(resourceId);
    if (!doc) return res.status(404).json({ message: "Resource not found." });

    const userRole = req.user.role;
    const isDirectDelete = DIRECT_DELETE_ROLES.includes(userRole);
    const isOwner = doc.uploadedBy && doc.uploadedBy.toLowerCase() === req.user.email.toLowerCase();

    if (isDirectDelete) {
      return res.status(400).json({ message: "Direct delete roles should use direct deletion." });
    }
    if (isOwner) {
      return res.status(400).json({ message: "You are the owner. Use direct deletion." });
    }
    if (!REQUEST_DELETE_ROLES.includes(userRole) && !COLLEGE_WIDE_ROLES.includes(userRole)) {
      return res.status(403).json({ message: "Access denied. You cannot request deletion." });
    }

    const requester = await User.findOne({ email: req.user.email }).select('name');
    const requesterName = requester ? requester.name : req.user.email;

    let finalRequestType = requestType;
    let finalTargetAuthority = targetAuthority;

    if (!finalRequestType) {
      if (targetAuthority && COLLEGE_WIDE_ROLES.includes(targetAuthority)) {
        finalRequestType = "HIGHER_AUTHORITY_APPROVAL";
      } else {
        finalRequestType = "UPLOADER_APPROVAL";
        finalTargetAuthority = doc.uploadedBy;
      }
    }

    if (finalRequestType === "UPLOADER_APPROVAL") {
      finalTargetAuthority = doc.uploadedBy;
    }

    const request = new DeletionRequest({
      resourceId: doc._id,
      resourceName: doc.title,
      originalUploader: doc.uploadedBy,
      originalUploaderName: doc.uploadedByName || doc.uploadedBy,
      requestedBy: req.user.email,
      requesterName: requesterName,
      requesterRole: userRole,
      targetAuthority: finalTargetAuthority,
      requestType: finalRequestType,
      comment: comment.trim(),
      status: "pending"
    });
    await request.save();

    await createNotification(
      finalTargetAuthority,
      req.user.email,
      requesterName,
      "DELETION_REQUEST",
      "Deletion Request",
      `${requesterName} (${getRoleDisplay(userRole)}) has requested deletion of "${doc.title}". Reason: ${comment.trim()}`,
      doc._id,
      request._id
    );

    res.status(201).json({ message: "Deletion request sent successfully.", request });
  } catch (error) {
    res.status(500).json({ message: "Server error while creating deletion request." });
  }
}

async function getIncomingRequests(req, res) {
  try {
    const userEmail = req.user.email.toLowerCase();
    const requests = await DeletionRequest.find({
      targetAuthority: userEmail,
      status: "pending"
    }).sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching incoming requests." });
  }
}

async function getOutgoingRequests(req, res) {
  try {
    const requests = await DeletionRequest.find({
      requestedBy: req.user.email,
      status: { $in: ["pending", "approved", "rejected", "cancelled"] }
    }).sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching outgoing requests." });
  }
}

async function getPendingCount(req, res) {
  try {
    const userEmail = req.user.email.toLowerCase();
    const count = await DeletionRequest.countDocuments({
      targetAuthority: userEmail,
      status: "pending"
    });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching count." });
  }
}

async function approveRequest(req, res) {
  try {
    const { responseComment } = req.body;
    const request = await DeletionRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found." });
    if (request.status !== "pending") return res.status(400).json({ message: "Request already processed." });

    const userEmail = req.user.email.toLowerCase();
    if (request.targetAuthority.toLowerCase() !== userEmail) {
      return res.status(403).json({ message: "Access denied. This request is not for you." });
    }

    const doc = await Document.findById(request.resourceId);
    if (!doc) {
      request.status = "approved";
      request.responseComment = responseComment || "Resource already deleted.";
      request.respondedBy = req.user.email;
      request.respondedAt = new Date();
      await request.save();
      return res.status(200).json({ message: "Request approved. Resource was already deleted." });
    }

    const approver = await User.findOne({ email: req.user.email }).select('name');
    const approverName = approver ? approver.name : req.user.email;

    const auditRecord = new DeletionAudit({
      resourceId: doc._id,
      resourceName: doc.title,
      originalUploader: doc.uploadedBy,
      deletedBy: req.user.email,
      deletedByName: approverName,
      deletedByRole: req.user.role,
      deletionType: "REQUEST_APPROVED",
      deletionReason: request.comment,
      deletedAt: new Date(),
      department: doc.department,
      branch: doc.branch
    });
    await auditRecord.save();

    if (doc.storageName) {
      const filePath = path.join(env.uploadDir, doc.storageName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await Chunk.deleteMany({ documentId: doc._id });
    await Document.findByIdAndDelete(request.resourceId);

    request.status = "approved";
    request.responseComment = responseComment || "";
    request.respondedBy = req.user.email;
    request.respondedAt = new Date();
    await request.save();

    await createNotification(
      request.requestedBy,
      req.user.email,
      approverName,
      "DELETION_APPROVED",
      "Deletion Request Approved",
      `Your deletion request for "${request.resourceName}" has been approved by ${approverName}.`,
      request.resourceId,
      request._id
    );

    res.status(200).json({ message: "Request approved and resource deleted.", request });
  } catch (error) {
    res.status(500).json({ message: "Server error while approving request." });
  }
}

async function rejectRequest(req, res) {
  try {
    const { responseComment } = req.body;
    const request = await DeletionRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found." });
    if (request.status !== "pending") return res.status(400).json({ message: "Request already processed." });

    const userEmail = req.user.email.toLowerCase();
    if (request.targetAuthority.toLowerCase() !== userEmail) {
      return res.status(403).json({ message: "Access denied. This request is not for you." });
    }

    const rejecter = await User.findOne({ email: req.user.email }).select('name');
    const rejecterName = rejecter ? rejecter.name : req.user.email;

    request.status = "rejected";
    request.responseComment = responseComment || "No reason provided.";
    request.respondedBy = req.user.email;
    request.respondedAt = new Date();
    await request.save();

    await createNotification(
      request.requestedBy,
      req.user.email,
      rejecterName,
      "DELETION_REJECTED",
      "Deletion Request Rejected",
      `Your deletion request for "${request.resourceName}" has been rejected by ${rejecterName}. Comment: ${responseComment || "No reason provided."}`,
      request.resourceId,
      request._id
    );

    res.status(200).json({ message: "Request rejected.", request });
  } catch (error) {
    res.status(500).json({ message: "Server error while rejecting request." });
  }
}

async function cancelRequest(req, res) {
  try {
    const request = await DeletionRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found." });
    if (request.status !== "pending") return res.status(400).json({ message: "Request already processed." });
    if (request.requestedBy.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({ message: "Access denied. You can only cancel your own requests." });
    }
    request.status = "cancelled";
    request.respondedBy = req.user.email;
    request.respondedAt = new Date();
    await request.save();
    res.status(200).json({ message: "Request cancelled.", request });
  } catch (error) {
    res.status(500).json({ message: "Server error while cancelling request." });
  }
}

async function getDeletionAudit(req, res) {
  try {
    const audits = await DeletionAudit.find().sort({ deletedAt: -1 }).limit(200);
    res.status(200).json(audits);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching audit history." });
  }
}

module.exports = {
  createDeletionRequest,
  getIncomingRequests,
  getOutgoingRequests,
  getPendingCount,
  approveRequest,
  rejectRequest,
  cancelRequest,
  getDeletionAudit
};
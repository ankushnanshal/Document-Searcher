const fs = require("fs");
const path = require("path");
const { Document } = require("../models/Document");
const { Chunk } = require("../models/Chunk");
const { User } = require("../models/User");
const { DeletionAudit } = require("../models/DeletionAudit");
const env = require("../config/env");
const {
  ROLES,
  DEPARTMENTS,
  CSE_BRANCHES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  DIRECT_DELETE_ROLES
} = require("../config/constants");
const {
  isCollegeWideRole,
  userCanAccessResource,
  userCanAccessBranch,
  canApproveDocuments,
  canManageDocuments,
  canManageDrafts,
  isFaculty,
  getApprovalChain,
  canApproveRole,
  normalizeDepartmentForResource,
  normalizeBranchForResource,
  getRoleDisplay
} = require("../utils/roleUtils");
const {
  detectLanguage,
  romanizeHindi,
  getUniqueWords,
  generateEnglishSearchVariants
} = require("../utils/textUtils");
const { generateEmbedding } = require("../utils/aiUtils");
const { chunkText, embedDocumentChunks, buildIndexedDocument } = require("../services/indexingService");
const { extractFileContent } = require("../services/extractionService");
const { enhancedHybridSearch } = require("../services/searchService");

async function uploadDocument(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });
    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    const canUpload = userPermissions.includes(PERMISSIONS.CREATE_DOCUMENT) || userPermissions.includes(PERMISSIONS.SUBMIT_DOCUMENT);
    if (!canUpload) {
      if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: "Access denied. You don't have permission to upload documents." });
    }
    const { title, category, docDate, year, semester, branch, paperType, officialDocType, session, status, department } = req.body;
    let docStatus = "pending_approval";
    if (status === "draft") docStatus = "draft";
    else if (status === "published") {
      if (req.user.role === ROLES.ADMIN || req.user.role === ROLES.DIRECTOR) {
        docStatus = "published";
      } else {
        docStatus = "pending_approval";
      }
    } else if (req.user.role === ROLES.ADMIN || req.user.role === ROLES.DIRECTOR) {
      docStatus = "published";
    }
    let docDepartment;
    let docBranch;
    if (isCollegeWideRole(req.user)) {
      docDepartment = department ? normalizeDepartmentForResource(department, branch) : null;
      docBranch = branch ? normalizeBranchForResource(branch, docDepartment) : '';
    } else {
      docDepartment = req.user.department;
      if (docDepartment === DEPARTMENTS.CSE) {
        if (branch && CSE_BRANCHES.includes(branch)) {
          docBranch = branch;
        } else if (req.user.branch && CSE_BRANCHES.includes(req.user.branch)) {
          docBranch = req.user.branch;
        } else {
          docBranch = 'CSE-R';
        }
      } else {
        docBranch = docDepartment || branch || '';
      }
    }
    if (docDepartment === DEPARTMENTS.CSE && !CSE_BRANCHES.includes(docBranch)) {
      if (docBranch === 'All Branches') {
        docBranch = 'All Branches';
      } else {
        docBranch = 'CSE-R';
      }
    }
    if (docBranch === 'All Branches' || docBranch === '') {
      docDepartment = null;
    }
    let finalTitle = (title && title.trim()) ? title.trim() : req.file.originalname;
    if (!finalTitle.trim()) finalTitle = req.file.originalname;
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/documents/${req.file.filename}`;
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tiff'].includes(ext);
    const isPDF = ext === '.pdf';
    let extractionResult = { text: '', pageTexts: [], ocrApplied: false, isScanned: false, ocrConfidence: 0, totalPages: 0 };
    if (isPDF || isImage) extractionResult = await extractFileContent(filePath, req.file.mimetype);
    else {
      const text = await extractFileContent(filePath, req.file.mimetype);
      extractionResult.text = text.text || '';
      extractionResult.pageTexts = text.pageTexts || [];
      extractionResult.totalPages = text.totalPages || 1;
    }
    const extractedText = extractionResult.text || '';
    const uploaderUser = await User.findOne({ email: req.user.email }).select('name');
    const docData = buildIndexedDocument(
      finalTitle, extractedText, fileUrl, req.file.mimetype || "",
      req.user.email, req.user.role, category, docDate, year || "", semester || "",
      docBranch || "", paperType || "", officialDocType || "", session || "",
      req.file.filename, docDepartment, extractionResult.pageTexts || [],
      extractionResult.ocrConfidence || 0, extractionResult.ocrApplied || false,
      extractionResult.isScanned || false, docStatus
    );
    docData.uploadedByName = uploaderUser ? uploaderUser.name : req.user.email;
    docData.processingStatus = "completed";
    docData.pageCount = extractionResult.totalPages || 0;
    if (docStatus === "draft") {
      docData.draftCreatedAt = new Date();
    } else if (docStatus === "pending_approval") {
      const chain = getApprovalChain(req.user.role);
      docData.approvalChain = chain;
      docData.currentApprovalIndex = 0;
      docData.approvalStage = chain.length > 0 ? chain[0] : "";
    } else {
      docData.publishedAt = new Date();
    }
    const newDoc = new Document(docData);
    await newDoc.save();
    const textToChunk = (extractedText || docData.textContent || finalTitle);
    const textChunks = chunkText(textToChunk);
    if (textChunks.length > 0) {
      const metadata = {
        pageNumber: 0, title: finalTitle, category: category || "General",
        branch: docBranch || "", semester: semester || "", year: year || "",
        session: session || "", officialDocType: officialDocType || "",
        paperType: paperType || "", department: docDepartment || "",
        status: docStatus
      };
      const embeddedChunks = await embedDocumentChunks(newDoc, textChunks, metadata);
      if (embeddedChunks.length > 0) await Chunk.insertMany(embeddedChunks);
    }
    try {
      if (extractedText && extractedText.length > 100) {
        const embedding = await generateEmbedding(extractedText.substring(0, 2000));
        if (embedding && embedding.length > 0) { newDoc.embedding = embedding; await newDoc.save(); }
      }
    } catch (e) {}
    res.status(201).json({
      message: docStatus === "draft" ? "Document saved as draft successfully." : (docStatus === "pending_approval" ? "Document submitted for approval." : "Document uploaded successfully."),
      id: newDoc._id, fileUrl, status: docStatus,
      department: docDepartment, branch: docBranch,
      language: docData.language,
      extractedTextLength: extractedText.length,
      hasHindiText: !!(docData.extractedTextHindi || docData.titleHindi),
      pageCount: extractionResult.totalPages || 0,
      ocrApplied: extractionResult.ocrApplied || false,
      ocrConfidence: extractionResult.ocrConfidence || 0,
      isScanned: extractionResult.isScanned || false,
      contentPreview: extractedText.substring(0, 300) + (extractedText.length > 300 ? '...' : ''),
      keywords: docData.keywords.slice(0, 10),
      chunksCreated: textChunks.length
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: error.message || "Server error while uploading document." });
  }
}

async function getDrafts(req, res) {
  try {
    if (!canManageDrafts(req.user)) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions." });
    }
    let filter = { status: "draft" };
    if (isCollegeWideRole(req.user)) {
      filter = { status: "draft" };
    } else if (req.user.department) {
      filter = { status: "draft", department: req.user.department };
    } else {
      filter = { status: "draft", uploadedBy: req.user.email };
    }
    const drafts = await Document.find(filter).sort({ draftCreatedAt: -1 });
    res.status(200).json(drafts);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching drafts." });
  }
}

async function getPendingApproval(req, res) {
  try {
    if (!canApproveDocuments(req.user)) return res.status(403).json({ message: "Access denied." });
    let filter = { status: "pending_approval" };
    if (req.user.role === ROLES.ADMIN || req.user.role === ROLES.DIRECTOR) {
      filter = { status: "pending_approval" };
    } else {
      filter.approvalStage = req.user.role;
      if (!isCollegeWideRole(req.user) && req.user.department) {
        filter.department = req.user.department;
      }
    }
    const pendingDocs = await Document.find(filter).sort({ createdAt: -1 });
    res.status(200).json(pendingDocs);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching pending approvals." });
  }
}

async function approveDocument(req, res) {
  try {
    if (!canApproveDocuments(req.user)) return res.status(403).json({ message: "Access denied." });
    const { comment } = req.body;
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found." });
    if (doc.status !== "pending_approval") return res.status(400).json({ message: "Document is not pending approval." });
    const submitterRole = doc.uploadedByRole;
    if (!canApproveRole(req.user.role, submitterRole) && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ message: "Access denied. You are not authorized to approve this document." });
    }
    if (!isCollegeWideRole(req.user) && doc.department && doc.department !== req.user.department) {
      return res.status(403).json({ message: "Access denied. You can only approve documents from your department." });
    }
    if (doc.approvalChain && doc.approvalChain.length > 0) {
      const currentStage = doc.approvalChain[doc.currentApprovalIndex];
      if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.DIRECTOR && currentStage && currentStage !== req.user.role) {
        return res.status(400).json({ message: "Not your turn to approve." });
      }
    }
    doc.approvalComments.push({
      user: req.user.email,
      role: req.user.role,
      comment: comment || "",
      timestamp: new Date(),
      action: "approved"
    });
    if (req.user.role === ROLES.ADMIN || req.user.role === ROLES.DIRECTOR) {
      doc.status = "published";
      doc.approvalStage = "";
      doc.publishedAt = new Date();
      doc.approvedBy = req.user.email;
      doc.approvedAt = new Date();
    } else if (doc.approvalChain && doc.currentApprovalIndex + 1 < doc.approvalChain.length) {
      doc.currentApprovalIndex += 1;
      doc.approvalStage = doc.approvalChain[doc.currentApprovalIndex];
      doc.approvedBy = req.user.email;
      doc.approvedAt = new Date();
    } else {
      doc.status = "published";
      doc.approvalStage = "";
      doc.publishedAt = new Date();
      doc.approvedBy = req.user.email;
      doc.approvedAt = new Date();
    }
    await doc.save();
    res.status(200).json({ message: "Document approved successfully.", status: doc.status, approvalStage: doc.approvalStage, currentApprovalIndex: doc.currentApprovalIndex });
  } catch (error) {
    res.status(500).json({ message: "Server error while approving document." });
  }
}

async function rejectDocument(req, res) {
  try {
    if (!canApproveDocuments(req.user)) return res.status(403).json({ message: "Access denied." });
    const { reason } = req.body;
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found." });
    if (doc.status !== "pending_approval") return res.status(400).json({ message: "Document is not pending approval." });
    const submitterRole = doc.uploadedByRole;
    if (!canApproveRole(req.user.role, submitterRole) && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ message: "Access denied. You are not authorized to reject this document." });
    }
    if (!isCollegeWideRole(req.user) && doc.department && doc.department !== req.user.department) {
      return res.status(403).json({ message: "Access denied." });
    }
    doc.status = "draft";
    doc.rejectedBy = req.user.email;
    doc.rejectedAt = new Date();
    doc.rejectionReason = reason || "No reason provided";
    doc.approvalComments.push({
      user: req.user.email,
      role: req.user.role,
      comment: reason || "No reason provided",
      timestamp: new Date(),
      action: "rejected"
    });
    doc.approvalStage = "";
    doc.currentApprovalIndex = 0;
    doc.draftCreatedAt = new Date();
    await doc.save();
    res.status(200).json({ message: "Document rejected. It has been moved to drafts with your feedback.", status: doc.status });
  } catch (error) {
    res.status(500).json({ message: "Server error while rejecting document." });
  }
}

async function publishDocument(req, res) {
  try {
    if (!canManageDrafts(req.user)) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions." });
    }
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found." });
    if (!isCollegeWideRole(req.user) && doc.department !== req.user.department) {
      return res.status(403).json({ message: "Access denied." });
    }
    if (doc.status !== "draft") return res.status(400).json({ message: "Document is not a draft." });
    if (req.user.role === ROLES.ADMIN || req.user.role === ROLES.DIRECTOR) {
      doc.status = "published";
      doc.draftCreatedAt = null;
      doc.publishedAt = new Date();
    } else {
      const chain = getApprovalChain(req.user.role);
      doc.status = "pending_approval";
      doc.approvalChain = chain;
      doc.currentApprovalIndex = 0;
      doc.approvalStage = chain.length > 0 ? chain[0] : "";
      doc.draftCreatedAt = null;
    }
    await doc.save();
    await Chunk.updateMany(
      { documentId: doc._id },
      { $set: { "metadata.status": doc.status } }
    );
    const textToChunk = (doc.extractedText || doc.textContent || doc.title);
    const textChunks = chunkText(textToChunk);
    if (textChunks.length > 0) {
      const existingChunks = await Chunk.find({ documentId: doc._id });
      if (existingChunks.length === 0) {
        const metadata = {
          pageNumber: 0, title: doc.title, category: doc.category,
          branch: doc.branch, semester: doc.semester, year: doc.year,
          session: doc.session, officialDocType: doc.officialDocType,
          paperType: doc.paperType, department: doc.department || "",
          status: doc.status
        };
        const embeddedChunks = await embedDocumentChunks(doc, textChunks, metadata);
        if (embeddedChunks.length > 0) await Chunk.insertMany(embeddedChunks);
      }
    }
    res.status(200).json({ message: "Draft published successfully.", document: doc });
  } catch (error) {
    res.status(500).json({ message: "Server error while publishing draft." });
  }
}

async function deleteDraft(req, res) {
  try {
    if (!canManageDrafts(req.user)) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions." });
    }
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Draft not found." });
    if (!isCollegeWideRole(req.user)) {
      if (doc.uploadedBy !== req.user.email && doc.department !== req.user.department) {
        return res.status(403).json({ message: "Access denied." });
      }
    }
    if (doc.status !== "draft") return res.status(400).json({ message: "Document is not a draft." });
    if (doc.storageName) {
      const filePath = path.join(env.uploadDir, doc.storageName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await Chunk.deleteMany({ documentId: doc._id });
    await Document.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Draft deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error while deleting draft." });
  }
}

async function getDraft(req, res) {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Draft not found." });
    if (doc.status !== "draft") return res.status(400).json({ message: "Document is not a draft." });
    if (!isCollegeWideRole(req.user) && doc.department !== req.user.department) {
      return res.status(403).json({ message: "Access denied." });
    }
    res.status(200).json(doc);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching draft." });
  }
}

async function updateDraft(req, res) {
  try {
    if (!canManageDrafts(req.user)) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions." });
    }
    const { title, category, docDate, year, semester, branch, paperType, officialDocType, session } = req.body;
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Draft not found." });
    if (doc.status !== "draft") return res.status(400).json({ message: "Document is not a draft." });
    if (!isCollegeWideRole(req.user) && doc.department !== req.user.department) {
      return res.status(403).json({ message: "Access denied." });
    }
    if (title !== undefined && title !== doc.title) {
      doc.title = title;
      const lang = detectLanguage(title);
      if (lang === 'hi') doc.titleHindi = title;
      doc.titleRomanized = romanizeHindi(title);
    }
    if (category !== undefined) doc.category = category;
    if (docDate !== undefined) doc.docDate = docDate;
    if (year !== undefined) doc.year = year;
    if (semester !== undefined) doc.semester = semester;
    if (branch !== undefined) {
      if (doc.department === DEPARTMENTS.CSE && CSE_BRANCHES.includes(branch)) {
        doc.branch = branch;
      } else if (isCollegeWideRole(req.user)) {
        doc.branch = normalizeBranchForResource(branch, doc.department);
      } else {
        doc.branch = req.user.department === DEPARTMENTS.CSE ? 'CSE-R' : req.user.department;
      }
    }
    if (paperType !== undefined) doc.paperType = paperType;
    if (officialDocType !== undefined) doc.officialDocType = officialDocType;
    if (session !== undefined) doc.session = session;
    const metaBlob = [doc.title, doc.officialDocType, doc.paperType, doc.category, doc.storageName, doc.year, doc.semester, doc.branch, doc.session, doc.department].filter(Boolean).join(' ');
    if (doc.extractedText) {
      doc.extractedTextRomanized = romanizeHindi(doc.extractedText);
      doc.textContentRomanized = `${doc.titleRomanized} ${doc.extractedTextRomanized} ${romanizeHindi(metaBlob)}`.trim();
      doc.searchTermsRomanized = getUniqueWords(`${doc.extractedTextRomanized} ${romanizeHindi(metaBlob)}`).slice(0, 1000);
      doc.keywords = getUniqueWords(`${doc.extractedText} ${metaBlob}`).slice(0, 200);
      doc.keywordSynonyms = generateEnglishSearchVariants(`${doc.extractedText} ${metaBlob}`);
    }
    doc.searchTerms = getUniqueWords(`${doc.title} ${doc.extractedText || ''} ${metaBlob}`).slice(0, 1000);
    doc.textContent = `${doc.title} ${doc.extractedText || ''} ${metaBlob}`.trim();
    await doc.save();
    await Chunk.deleteMany({ documentId: doc._id });
    const textChunks = chunkText(doc.extractedText || doc.textContent || doc.title);
    if (textChunks.length > 0) {
      const metadata = {
        pageNumber: 0, title: doc.title, category: doc.category,
        branch: doc.branch, semester: doc.semester, year: doc.year,
        session: doc.session, officialDocType: doc.officialDocType,
        paperType: doc.paperType, department: doc.department || "",
        status: "draft"
      };
      const embeddedChunks = await embedDocumentChunks(doc, textChunks, metadata);
      if (embeddedChunks.length > 0) await Chunk.insertMany(embeddedChunks);
    }
    res.status(200).json({ message: "Draft updated successfully.", doc });
  } catch (error) {
    res.status(500).json({ message: "Server error while updating draft." });
  }
}

async function searchDocuments(req, res) {
  try {
    const { q, category, branch, semester, year, limit, department, status } = req.query;
    const staff = isFaculty(req.user);
    const filter = {};
    if (category) filter.category = category;
    if (semester) filter.semester = semester;
    if (year) filter.year = year;

    if (!staff) {
      filter.status = "published";
    } else if (status && ["draft", "published", "pending_approval"].includes(status)) {
      if (status === "draft" && !canManageDrafts(req.user)) {
        return res.status(403).json({ message: "Access denied. Insufficient permissions for drafts." });
      }
      filter.status = status;
    } else {
      filter.$or = [
        { status: "published" },
        { status: { $exists: false } },
        { status: null },
        { status: "" }
      ];
    }

    const resultLimit = parseInt(limit) || env.SEARCH_RESULTS_LIMIT;

    const applyVisibility = (docs) => docs.filter(doc =>
      userCanAccessResource(req.user, doc) && userCanAccessBranch(req.user, doc.branch, doc.department)
    );

    const applyUserFilters = (docs) => {
      let out = docs;
      if (isCollegeWideRole(req.user)) {
        if (department && department !== 'all') out = out.filter(d => d.department === department);
        if (branch && branch !== 'all' && branch !== 'All Branches') {
          out = out.filter(d => d.branch === branch || d.branch === 'All Branches' || !d.branch);
        }
      } else if (req.user.department === DEPARTMENTS.CSE) {
        if (branch && branch !== 'all' && branch !== 'All Branches') {
          out = out.filter(d => d.branch === branch || d.branch === 'All Branches' || !d.branch);
        }
      }
      return out;
    };

    if (!q || q.trim() === '') {
      let docs = await Document.find(filter).sort({ createdAt: -1 }).limit(resultLimit * 5);
      docs = applyVisibility(docs);
      docs = applyUserFilters(docs);
      return res.status(200).json(docs.slice(0, resultLimit));
    }

    let results = await enhancedHybridSearch(q.trim(), filter, resultLimit * 3);
    results = applyVisibility(results);
    results = applyUserFilters(results);
    results = results.slice(0, resultLimit);
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: "Search failed", error: error.message });
  }
}

async function debugDocuments(req, res) {
  try {
    const total = await Document.countDocuments();
    const chunks = await Chunk.countDocuments();
    const sample = await Document.find().limit(5);
    const chunkSample = await Chunk.find().limit(5);
    res.json({
      totalDocuments: total,
      totalChunks: chunks,
      sample: sample.map(d => ({
        title: d.title, titleHindi: d.titleHindi, titleRomanized: d.titleRomanized,
        hasExtractedText: !!d.extractedText, hasExtractedTextHindi: !!d.extractedTextHindi,
        hasExtractedTextRomanized: !!d.extractedTextRomanized,
        extractedTextLength: d.extractedText ? d.extractedText.length : 0,
        language: d.language, category: d.category, year: d.year,
        semester: d.semester, branch: d.branch, session: d.session,
        officialDocType: d.officialDocType, pageCount: d.pageCount,
        ocrApplied: d.ocrApplied, ocrConfidence: d.ocrConfidence,
        isScanned: d.isScanned, processingStatus: d.processingStatus,
        keywordsCount: d.keywords ? d.keywords.length : 0,
        hasEmbedding: d.embedding && d.embedding.length > 0,
        status: d.status || "published",
        department: d.department
      })),
      chunkSample: chunkSample.map(c => ({
        documentId: c.documentId, chunkIndex: c.chunkIndex,
        textLength: c.text ? c.text.length : 0,
        hasEmbedding: c.embedding && c.embedding.length > 0,
        metadata: c.metadata
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getDocument(req, res) {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found." });
    if (!userCanAccessResource(req.user, doc)) {
      return res.status(403).json({ message: "Access denied. You don't have permission to view this resource." });
    }
    if (doc.status && doc.status !== "published") {
      if (!isFaculty(req.user)) return res.status(403).json({ message: "Access denied." });
    }
    res.status(200).json(doc);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching document." });
  }
}

async function updateDocument(req, res) {
  try {
    if (!canManageDocuments(req.user)) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions." });
    }
    const { title, category, docDate, year, semester, branch, paperType, officialDocType, session } = req.body;
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found." });
    if (!isCollegeWideRole(req.user) && doc.department !== req.user.department) {
      return res.status(403).json({ message: "Access denied. You can only update documents from your department." });
    }
    if (title !== undefined && title !== doc.title) {
      doc.title = title;
      const lang = detectLanguage(title);
      if (lang === 'hi') doc.titleHindi = title;
      doc.titleRomanized = romanizeHindi(title);
    }
    if (category !== undefined) doc.category = category;
    if (docDate !== undefined) doc.docDate = docDate;
    if (year !== undefined) doc.year = year;
    if (semester !== undefined) doc.semester = semester;
    if (branch !== undefined) {
      if (isCollegeWideRole(req.user)) {
        doc.branch = normalizeBranchForResource(branch, doc.department);
      } else if (doc.department === DEPARTMENTS.CSE) {
        if (branch === 'All Branches') {
          doc.branch = 'All Branches';
        } else if (CSE_BRANCHES.includes(branch)) {
          doc.branch = branch;
        }
      } else {
        doc.branch = doc.department;
      }
    }
    if (paperType !== undefined) doc.paperType = paperType;
    if (officialDocType !== undefined) doc.officialDocType = officialDocType;
    if (session !== undefined) doc.session = session;
    const metaBlob = [doc.title, doc.officialDocType, doc.paperType, doc.category, doc.storageName, doc.year, doc.semester, doc.branch, doc.session, doc.department].filter(Boolean).join(' ');
    if (doc.extractedText) {
      doc.extractedTextRomanized = romanizeHindi(doc.extractedText);
      doc.textContentRomanized = `${doc.titleRomanized} ${doc.extractedTextRomanized} ${romanizeHindi(metaBlob)}`.trim();
      doc.searchTermsRomanized = getUniqueWords(`${doc.extractedTextRomanized} ${romanizeHindi(metaBlob)}`).slice(0, 1000);
      doc.keywords = getUniqueWords(`${doc.extractedText} ${metaBlob}`).slice(0, 200);
      doc.keywordSynonyms = generateEnglishSearchVariants(`${doc.extractedText} ${metaBlob}`);
    }
    doc.searchTerms = getUniqueWords(`${doc.title} ${doc.extractedText || ''} ${metaBlob}`).slice(0, 1000);
    doc.textContent = `${doc.title} ${doc.extractedText || ''} ${metaBlob}`.trim();
    await doc.save();
    await Chunk.deleteMany({ documentId: doc._id });
    const textChunks = chunkText(doc.extractedText || doc.textContent || doc.title);
    if (textChunks.length > 0) {
      const metadata = {
        pageNumber: 0, title: doc.title, category: doc.category,
        branch: doc.branch, semester: doc.semester, year: doc.year,
        session: doc.session, officialDocType: doc.officialDocType,
        paperType: doc.paperType, department: doc.department || "",
        status: doc.status || "published"
      };
      const embeddedChunks = await embedDocumentChunks(doc, textChunks, metadata);
      if (embeddedChunks.length > 0) await Chunk.insertMany(embeddedChunks);
    }
    res.status(200).json({ message: "Document updated successfully.", doc });
  } catch (error) {
    res.status(500).json({ message: "Server error while updating document." });
  }
}

async function deleteDocument(req, res) {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Please provide a reason for deleting this resource." });
    }
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found." });

    const userRole = req.user.role;
    const isDirectDelete = DIRECT_DELETE_ROLES.includes(userRole);
    const isOwner = doc.uploadedBy && doc.uploadedBy.toLowerCase() === req.user.email.toLowerCase();

    if (!isDirectDelete && !isOwner) {
      return res.status(403).json({ message: "403 Forbidden: You do not have permission to directly delete this resource. Please use the deletion request API." });
    }

    const deleter = await User.findOne({ email: req.user.email }).select('name');
    const deleterName = deleter ? deleter.name : req.user.email;

    const auditRecord = new DeletionAudit({
      resourceId: doc._id,
      resourceName: doc.title,
      originalUploader: doc.uploadedBy,
      deletedBy: req.user.email,
      deletedByName: deleterName,
      deletedByRole: userRole,
      deletionType: "DIRECT_DELETE",
      deletionReason: reason.trim(),
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
    await Document.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Resource removed successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error while deleting document." });
  }
}

async function reindexDocuments(req, res) {
  try {
    const docs = await Document.find({});
    let reindexedCount = 0;
    let chunkCount = 0;
    let errors = [];
    await Chunk.deleteMany({});
    for (const doc of docs) {
      if (doc.storageName) {
        const filePath = path.join(env.uploadDir, doc.storageName);
        if (fs.existsSync(filePath)) {
          try {
            const result = await extractFileContent(filePath, doc.fileType);
            if (result.text) {
              const docData = buildIndexedDocument(
                doc.title, result.text, doc.fileUrl, doc.fileType,
                doc.uploadedBy, doc.uploadedByRole || "", doc.category, doc.docDate,
                doc.year, doc.semester, doc.branch, doc.paperType,
                doc.officialDocType, doc.session, doc.storageName,
                doc.department, result.pageTexts || [], result.ocrConfidence || 0,
                result.ocrApplied || false, result.isScanned || false,
                doc.status || "published"
              );
              Object.assign(doc, docData);
              doc.pageCount = result.totalPages || 0;
              doc.processingStatus = "completed";
              await doc.save();
              reindexedCount++;
              const textChunks = chunkText(result.text || doc.textContent || doc.title);
              if (textChunks.length > 0) {
                const metadata = {
                  pageNumber: 0, title: doc.title, category: doc.category,
                  branch: doc.branch, semester: doc.semester, year: doc.year,
                  session: doc.session, officialDocType: doc.officialDocType,
                  paperType: doc.paperType, department: doc.department || "",
                  status: doc.status || "published"
                };
                const embeddedChunks = await embedDocumentChunks(doc, textChunks, metadata);
                if (embeddedChunks.length > 0) { await Chunk.insertMany(embeddedChunks); chunkCount += embeddedChunks.length; }
              }
            }
          } catch (err) {
            errors.push({ id: doc._id, error: err.message });
          }
        }
      }
    }
    res.status(200).json({ message: `Re-indexed ${reindexedCount} documents and ${chunkCount} chunks successfully.`, total: docs.length, reindexed: reindexedCount, chunks: chunkCount, errors });
  } catch (error) {
    res.status(500).json({ message: "Server error during re-indexing." });
  }
}

module.exports = {
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
};
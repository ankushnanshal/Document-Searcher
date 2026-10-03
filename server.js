const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const PDFParser = require('pdf2json');
const pdfParse = require('pdf-parse');
const sharp = require('sharp');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
require('dotenv').config();

const ROLES = {
  ADMIN: 'admin',
  DIRECTOR: 'director',
  DEAN: 'dean',
  HOD: 'hod',
  PROFESSOR: 'professor',
  ASSISTANT_PROFESSOR: 'assistant_professor',
  STUDENT: 'student'
};

const DEPARTMENTS = {
  CSE: 'CSE',
  ECE: 'ECE',
  ME: 'ME',
  CE: 'CE',
  EE: 'EE',
  CHE: 'CHE'
};

const CSE_BRANCHES = ['CSE-R', 'CSE-A.I', 'CSE-SF'];

const ALL_BRANCHES = [
  'CSE-R', 'CSE-A.I', 'CSE-SF',
  'ECE', 'EE', 'ME', 'CE', 'CHE',
  'All Branches'
];

const PERMISSIONS = {
  CREATE_DOCUMENT: 'create_document',
  EDIT_DOCUMENT: 'edit_document',
  DELETE_DOCUMENT: 'delete_document',
  VIEW_DOCUMENTS: 'view_documents',
  APPROVE_DOCUMENT: 'approve_document',
  MANAGE_USERS: 'manage_users',
  MANAGE_DEPARTMENT: 'manage_department',
  SUBMIT_DOCUMENT: 'submit_document',
  MANAGE_DRAFTS: 'manage_drafts'
};

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
    PERMISSIONS.DELETE_DOCUMENT,
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.APPROVE_DOCUMENT,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_DEPARTMENT,
    PERMISSIONS.SUBMIT_DOCUMENT,
    PERMISSIONS.MANAGE_DRAFTS
  ],
  [ROLES.DIRECTOR]: [
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
    PERMISSIONS.DELETE_DOCUMENT,
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.APPROVE_DOCUMENT,
    PERMISSIONS.MANAGE_DEPARTMENT,
    PERMISSIONS.SUBMIT_DOCUMENT,
    PERMISSIONS.MANAGE_DRAFTS
  ],
  [ROLES.DEAN]: [
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
    PERMISSIONS.DELETE_DOCUMENT,
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.APPROVE_DOCUMENT,
    PERMISSIONS.MANAGE_DEPARTMENT,
    PERMISSIONS.SUBMIT_DOCUMENT,
    PERMISSIONS.MANAGE_DRAFTS
  ],
  [ROLES.HOD]: [
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
    PERMISSIONS.DELETE_DOCUMENT,
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.APPROVE_DOCUMENT,
    PERMISSIONS.MANAGE_DEPARTMENT,
    PERMISSIONS.SUBMIT_DOCUMENT,
    PERMISSIONS.MANAGE_DRAFTS
  ],
  [ROLES.PROFESSOR]: [
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
    PERMISSIONS.DELETE_DOCUMENT,
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.APPROVE_DOCUMENT,
    PERMISSIONS.MANAGE_DEPARTMENT,
    PERMISSIONS.SUBMIT_DOCUMENT,
    PERMISSIONS.MANAGE_DRAFTS
  ],
  [ROLES.ASSISTANT_PROFESSOR]: [
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
    PERMISSIONS.DELETE_DOCUMENT,
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.SUBMIT_DOCUMENT,
    PERMISSIONS.MANAGE_DRAFTS
  ],
  [ROLES.STUDENT]: [
    PERMISSIONS.VIEW_DOCUMENTS
  ]
};

const FACULTY_ROLES = [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.DEAN, ROLES.HOD, ROLES.PROFESSOR, ROLES.ASSISTANT_PROFESSOR];
const COLLEGE_WIDE_ROLES = [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.DEAN];

const APPROVAL_CHAIN = {
  [ROLES.ASSISTANT_PROFESSOR]: [ROLES.PROFESSOR, ROLES.HOD, ROLES.DEAN, ROLES.DIRECTOR],
  [ROLES.PROFESSOR]: [ROLES.HOD, ROLES.DEAN, ROLES.DIRECTOR],
  [ROLES.HOD]: [ROLES.DEAN, ROLES.DIRECTOR],
  [ROLES.DEAN]: [ROLES.DIRECTOR],
  [ROLES.DIRECTOR]: [],
  [ROLES.ADMIN]: []
};

const DEMO_USERS = [
  {
    name: 'Admin User',
    email: 'ankushadmin@gmail.com',
    password: '817167',
    role: ROLES.ADMIN,
    department: null,
    branch: null,
    permissions: ROLE_PERMISSIONS[ROLES.ADMIN]
  },
  {
    name: 'Director User',
    email: 'director@college.gmail',
    password: 'Director@123',
    role: ROLES.DIRECTOR,
    department: null,
    branch: null,
    permissions: ROLE_PERMISSIONS[ROLES.DIRECTOR]
  },
  {
    name: 'Dean User',
    email: 'dean@college.gmail',
    password: 'Dean@123',
    role: ROLES.DEAN,
    department: null,
    branch: null,
    permissions: ROLE_PERMISSIONS[ROLES.DEAN]
  },
  {
    name: 'HOD CSE',
    email: 'hod.cse@college.gmail',
    password: 'HODCSE@123',
    role: ROLES.HOD,
    department: DEPARTMENTS.CSE,
    branch: null,
    permissions: ROLE_PERMISSIONS[ROLES.HOD]
  },
  {
    name: 'Professor CSE 1',
    email: 'professor.cse1@college.gmail',
    password: 'ProfCSE1@123',
    role: ROLES.PROFESSOR,
    department: DEPARTMENTS.CSE,
    branch: 'CSE-R',
    permissions: ROLE_PERMISSIONS[ROLES.PROFESSOR]
  },
  {
    name: 'Professor CSE 2',
    email: 'professor.cse2@college.gmail',
    password: 'ProfCSE2@123',
    role: ROLES.PROFESSOR,
    department: DEPARTMENTS.CSE,
    branch: 'CSE-A.I',
    permissions: ROLE_PERMISSIONS[ROLES.PROFESSOR]
  },
  {
    name: 'Assistant Professor CSE 1',
    email: 'assistant.cse1@college.gmail',
    password: 'AsstCSE1@123',
    role: ROLES.ASSISTANT_PROFESSOR,
    department: DEPARTMENTS.CSE,
    branch: 'CSE-SF',
    permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR]
  },
  {
    name: 'Assistant Professor CSE 2',
    email: 'assistant.cse2@college.gmail',
    password: 'AsstCSE2@123',
    role: ROLES.ASSISTANT_PROFESSOR,
    department: DEPARTMENTS.CSE,
    branch: 'CSE-R',
    permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR]
  },
  {
    name: 'HOD ECE',
    email: 'hod.ece@college.gmail',
    password: 'HODECE@123',
    role: ROLES.HOD,
    department: DEPARTMENTS.ECE,
    branch: null,
    permissions: ROLE_PERMISSIONS[ROLES.HOD]
  },
  {
    name: 'Professor ECE 1',
    email: 'professor.ece1@college.gmail',
    password: 'ProfECE1@123',
    role: ROLES.PROFESSOR,
    department: DEPARTMENTS.ECE,
    branch: 'ECE',
    permissions: ROLE_PERMISSIONS[ROLES.PROFESSOR]
  },
  {
    name: 'Assistant Professor ECE 1',
    email: 'assistant.ece1@college.gmail',
    password: 'AsstECE1@123',
    role: ROLES.ASSISTANT_PROFESSOR,
    department: DEPARTMENTS.ECE,
    branch: 'ECE',
    permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR]
  },
  {
    name: 'HOD EE',
    email: 'hod.ee@college.gmail',
    password: 'HODEE@123',
    role: ROLES.HOD,
    department: DEPARTMENTS.EE,
    branch: null,
    permissions: ROLE_PERMISSIONS[ROLES.HOD]
  },
  {
    name: 'Professor EE 1',
    email: 'professor.ee1@college.gmail',
    password: 'ProfEE1@123',
    role: ROLES.PROFESSOR,
    department: DEPARTMENTS.EE,
    branch: 'EE',
    permissions: ROLE_PERMISSIONS[ROLES.PROFESSOR]
  },
  {
    name: 'HOD ME',
    email: 'hod.me@college.gmail',
    password: 'HODME@123',
    role: ROLES.HOD,
    department: DEPARTMENTS.ME,
    branch: null,
    permissions: ROLE_PERMISSIONS[ROLES.HOD]
  },
  {
    name: 'Professor ME 1',
    email: 'professor.me1@college.gmail',
    password: 'ProfME1@123',
    role: ROLES.PROFESSOR,
    department: DEPARTMENTS.ME,
    branch: 'ME',
    permissions: ROLE_PERMISSIONS[ROLES.PROFESSOR]
  },
  {
    name: 'HOD CE',
    email: 'hod.ce@college.gmail',
    password: 'HODCE@123',
    role: ROLES.HOD,
    department: DEPARTMENTS.CE,
    branch: null,
    permissions: ROLE_PERMISSIONS[ROLES.HOD]
  },
  {
    name: 'Professor CE 1',
    email: 'professor.ce1@college.gmail',
    password: 'ProfCE1@123',
    role: ROLES.PROFESSOR,
    department: DEPARTMENTS.CE,
    branch: 'CE',
    permissions: ROLE_PERMISSIONS[ROLES.PROFESSOR]
  },
  {
    name: 'HOD CHE',
    email: 'hod.che@college.gmail',
    password: 'HODCHE@123',
    role: ROLES.HOD,
    department: DEPARTMENTS.CHE,
    branch: null,
    permissions: ROLE_PERMISSIONS[ROLES.HOD]
  },
  {
    name: 'Professor CHE 1',
    email: 'professor.che1@college.gmail',
    password: 'ProfCHE1@123',
    role: ROLES.PROFESSOR,
    department: DEPARTMENTS.CHE,
    branch: 'CHE',
    permissions: ROLE_PERMISSIONS[ROLES.PROFESSOR]
  }
];

const STAFF_BY_EMAIL = new Map(DEMO_USERS.map(u => [u.email.toLowerCase().trim(), u]));

function resolveAccess(email) {
  const staff = STAFF_BY_EMAIL.get(String(email || '').toLowerCase().trim());
  if (staff) {
    return {
      role: staff.role,
      department: staff.department || null,
      branch: staff.branch || null,
      permissions: ROLE_PERMISSIONS[staff.role]
    };
  }
  return { role: ROLES.STUDENT, department: null, branch: null, permissions: ROLE_PERMISSIONS[ROLES.STUDENT] };
}

function normalizeDepartmentForResource(department, branch) {
  if (!department) return null;
  const upperDept = String(department).toUpperCase().trim();
  if (CSE_BRANCHES.includes(branch)) return DEPARTMENTS.CSE;
  if (upperDept === 'CSE' || CSE_BRANCHES.some(b => upperDept.includes(b.replace('CSE-', '')))) {
    return DEPARTMENTS.CSE;
  }
  if (Object.values(DEPARTMENTS).includes(upperDept)) return upperDept;
  return null;
}

function getDepartmentFromBranch(branch) {
  if (!branch) return null;
  if (CSE_BRANCHES.includes(branch)) return DEPARTMENTS.CSE;
  if (Object.values(DEPARTMENTS).includes(branch)) return branch;
  return null;
}

function normalizeBranchForResource(branch, department) {
  if (!branch) return department || '';
  if (branch === 'All Branches') return 'All Branches';
  if (CSE_BRANCHES.includes(branch)) return branch;
  if (Object.values(DEPARTMENTS).includes(branch)) return branch;
  if (department === DEPARTMENTS.CSE) {
    if (branch.includes('R') || branch.includes('R)')) return 'CSE-R';
    if (branch.includes('AI') || branch.includes('A.I')) return 'CSE-A.I';
    if (branch.includes('SF')) return 'CSE-SF';
  }
  return branch;
}

function getApprovalChain(role) {
  return APPROVAL_CHAIN[role] || [];
}

function requiresApproval(role) {
  const chain = getApprovalChain(role);
  return chain.length > 0;
}

function canApproveRole(approverRole, submitterRole) {
  const chain = getApprovalChain(submitterRole);
  return chain.includes(approverRole);
}

async function syncUserAccess(user) {
  const access = resolveAccess(user.email);
  const samePerms = Array.isArray(user.permissions) &&
    user.permissions.length === access.permissions.length &&
    access.permissions.every(p => user.permissions.includes(p));
  if (user.role !== access.role ||
      (user.department || null) !== access.department ||
      (user.branch || null) !== access.branch ||
      !samePerms) {
    user.role = access.role;
    user.department = access.department;
    user.branch = access.branch;
    user.permissions = access.permissions;
    await user.save();
  }
  return user;
}

function createToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      department: user.department,
      branch: user.branch,
      permissions: user.permissions
    },
    process.env.JWT_SECRET || 'change-this-secret',
    { expiresIn: '7d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required.' });
  jwt.verify(token, process.env.JWT_SECRET || 'change-this-secret', async (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token.' });
    try {
      const dbUser = await mongoose.model('User').findById(decoded.id).select('email');
      if (!dbUser) return res.status(401).json({ message: 'User no longer exists.' });
      const access = resolveAccess(dbUser.email);
      req.user = {
        id: dbUser._id.toString(),
        email: dbUser.email,
        role: access.role,
        department: access.department,
        branch: access.branch,
        permissions: access.permissions
      };
      next();
    } catch (e) {
      res.status(500).json({ message: 'Authentication failed.' });
    }
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Access denied.' });
    next();
  };
}

function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
    const userPerms = req.user.permissions || ROLE_PERMISSIONS[req.user.role] || [];
    const hasPermission = permissions.some(p => userPerms.includes(p));
    if (!hasPermission) return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    next();
  };
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
  if (req.user.role !== ROLES.ADMIN) return res.status(403).json({ message: 'Admin access required.' });
  next();
}

function requireFaculty(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
  if (!FACULTY_ROLES.includes(req.user.role)) return res.status(403).json({ message: 'Faculty access required.' });
  next();
}

function requireCollegeWideAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
  if (!COLLEGE_WIDE_ROLES.includes(req.user.role)) return res.status(403).json({ message: 'Access denied.' });
  next();
}

function isCollegeWideRole(user) {
  return COLLEGE_WIDE_ROLES.includes(user.role);
}

function userCanAccessResource(user, resource) {
  if (isCollegeWideRole(user)) return true;
  if (!resource.department) return true;
  if (!user.department) return false;
  return resource.department === user.department;
}

function userCanAccessBranch(user, resourceBranch, resourceDepartment) {
  if (isCollegeWideRole(user)) return true;
  if (!resourceBranch || resourceBranch === 'All Branches' || resourceBranch === '') return true;
  if (!user.department) return false;
  const normalizedDept = resourceDepartment || getDepartmentFromBranch(resourceBranch);
  if (!normalizedDept) return true;
  if (normalizedDept === user.department) return true;
  if (user.department === DEPARTMENTS.CSE && CSE_BRANCHES.includes(resourceBranch)) return true;
  return false;
}

function canApproveDocuments(user) {
  const perms = user.permissions || ROLE_PERMISSIONS[user.role] || [];
  return perms.includes(PERMISSIONS.APPROVE_DOCUMENT);
}

function canManageDocuments(user) {
  const perms = user.permissions || ROLE_PERMISSIONS[user.role] || [];
  return perms.includes(PERMISSIONS.CREATE_DOCUMENT) ||
         perms.includes(PERMISSIONS.DELETE_DOCUMENT) ||
         perms.includes(PERMISSIONS.APPROVE_DOCUMENT);
}

function canManageDrafts(user) {
  const perms = user.permissions || ROLE_PERMISSIONS[user.role] || [];
  return perms.includes(PERMISSIONS.MANAGE_DRAFTS);
}

function isFaculty(user) {
  return FACULTY_ROLES.includes(user.role);
}

function isStudent(user) {
  return user.role === ROLES.STUDENT;
}

function validateDepartmentForUser(user, requestedDepartment) {
  if (isCollegeWideRole(user)) {
    if (!requestedDepartment) return null;
    return normalizeDepartmentForResource(requestedDepartment, null);
  }
  return user.department;
}

function validateBranchForUser(user, requestedBranch, department) {
  if (!requestedBranch || requestedBranch === 'All Branches') {
    if (department === DEPARTMENTS.CSE && !isCollegeWideRole(user)) {
      return 'All Branches';
    }
    return requestedBranch || '';
  }
  if (isCollegeWideRole(user)) {
    return normalizeBranchForResource(requestedBranch, department);
  }
  if (department === DEPARTMENTS.CSE) {
    if (CSE_BRANCHES.includes(requestedBranch)) return requestedBranch;
    return 'CSE-R';
  }
  return department || requestedBranch;
}

const app = express();
app.use(cors());
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

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/eduvault";
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE) || 500;
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP) || 100;
const MIN_CHUNK_LENGTH = parseInt(process.env.MIN_CHUNK_LENGTH) || 100;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "gemini-embedding-001";
const EMBEDDING_DIMENSION = parseInt(process.env.EMBEDDING_DIMENSION) || 768;
const SEARCH_RESULTS_LIMIT = parseInt(process.env.SEARCH_RESULTS_LIMIT) || 50;

const uploadDir = path.join(__dirname, "uploads", "documents");
const tessdataDir = path.join(__dirname, "tessdata");
const tempDir = path.join(__dirname, "temp");

[uploadDir, tessdataDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

let genAI = null;
let openai = null;
try {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("Gemini AI initialized");
  }
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log("OpenAI initialized");
  }
} catch (e) {
  console.log("AI initialization warning:", e.message);
}

mongoose.connect(MONGO_URI).then(async () => {
  console.log("MongoDB connected");
  await migrateLegacyData();
  await createTextIndexes();
  await seedDemoUsers();
}).catch(err => console.error("MongoDB error:", err.message));

async function migrateLegacyData() {
  try {
    const db = mongoose.connection.db;
    const docsResult = await db.collection('documents').updateMany(
      { $or: [{ status: { $exists: false } }, { status: null }, { status: "" }] },
      { $set: { status: "published" } }
    );
    if (docsResult.modifiedCount > 0) {
      console.log(`Migrated ${docsResult.modifiedCount} legacy documents to published`);
    }
    const adminEmail = 'ankushadmin@gmail.com';
    const adminUser = await db.collection('users').findOne({ email: adminEmail });
    if (adminUser && adminUser.role !== ROLES.ADMIN) {
      await db.collection('users').updateOne(
        { email: adminEmail },
        { $set: { role: ROLES.ADMIN, permissions: ROLE_PERMISSIONS[ROLES.ADMIN], department: null, branch: null } }
      );
      console.log('Promoted ankushadmin@gmail.com to admin');
    }
    const staffEmails = Array.from(STAFF_BY_EMAIL.keys());
    const demoted = await db.collection('users').updateMany(
      { email: { $nin: staffEmails }, $or: [{ role: { $ne: ROLES.STUDENT } }, { permissions: { $ne: ROLE_PERMISSIONS[ROLES.STUDENT] } }] },
      { $set: { role: ROLES.STUDENT, department: null, branch: null, permissions: ROLE_PERMISSIONS[ROLES.STUDENT] } }
    );
    if (demoted.modifiedCount > 0) {
      console.log(`Reset ${demoted.modifiedCount} non-staff accounts to student`);
    }
    const usersToFix = await db.collection('users').find({
      role: { $in: FACULTY_ROLES }
    }).toArray();
    for (const user of usersToFix) {
      const expectedPerms = ROLE_PERMISSIONS[user.role] || [];
      const currentPerms = user.permissions || [];
      if (!currentPerms.includes(PERMISSIONS.CREATE_DOCUMENT) || !currentPerms.includes(PERMISSIONS.MANAGE_DRAFTS)) {
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { permissions: expectedPerms } }
        );
      }
    }
    await db.collection('documents').updateMany(
      { department: { $exists: false } },
      { $set: { department: null } }
    );
    const orphanDocs = await db.collection('documents').updateMany(
      {
        $and: [
          { $or: [ { branch: "All Branches" }, { branch: "" }, { branch: null } ] },
          { department: { $ne: null } }
        ]
      },
      { $set: { department: null } }
    );
    if (orphanDocs.modifiedCount > 0) {
      console.log(`Cleared department on ${orphanDocs.modifiedCount} All-Branches documents`);
    }
  } catch (e) {
    console.log("Legacy migration warning:", e.message);
  }
}

async function createTextIndexes() {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('documents');
    const existingIndexes = await collection.indexes();
    const textIndex = existingIndexes.find(idx => idx.key && idx.key._fts === "text");
    if (textIndex) {
      await collection.dropIndex(textIndex.name);
    }
    await collection.createIndex(
      {
        title: "text",
        titleHindi: "text",
        titleRomanized: "text",
        extractedText: "text",
        extractedTextHindi: "text",
        extractedTextRomanized: "text",
        textContent: "text",
        textContentHindi: "text",
        textContentRomanized: "text",
        officialDocType: "text",
        paperType: "text",
        branch: "text",
        year: "text",
        semester: "text",
        session: "text",
        department: "text"
      },
      {
        weights: {
          title: 15, titleHindi: 15, titleRomanized: 12,
          officialDocType: 10, paperType: 8,
          extractedText: 5, extractedTextHindi: 5, extractedTextRomanized: 4,
          textContent: 3, textContentHindi: 3, textContentRomanized: 2,
          branch: 5, year: 4, semester: 4, session: 3, department: 6
        },
        name: "document_text_search_v4"
      }
    );
    console.log("Text indexes created");
  } catch (e) {
    console.log("Text index warning:", e.message);
  }
}

async function seedDemoUsers() {
  try {
    const User = mongoose.model("User");
    for (const userData of DEMO_USERS) {
      const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = new User({
          name: userData.name,
          email: userData.email.toLowerCase(),
          password: hashedPassword,
          role: userData.role,
          department: userData.department,
          branch: userData.branch || null,
          permissions: userData.permissions
        });
        await user.save();
        console.log(`Seeded demo user: ${userData.email}`);
      } else {
        const expectedPerms = ROLE_PERMISSIONS[userData.role] || [];
        const currentPerms = existingUser.permissions || [];
        if (!currentPerms.includes(PERMISSIONS.MANAGE_DRAFTS) ||
            !currentPerms.includes(PERMISSIONS.CREATE_DOCUMENT) ||
            existingUser.department !== userData.department) {
          existingUser.permissions = expectedPerms;
          existingUser.role = userData.role;
          existingUser.department = userData.department;
          existingUser.branch = userData.branch || null;
          await existingUser.save();
          console.log(`Updated permissions for: ${userData.email}`);
        }
      }
    }
  } catch (error) {
    console.error("Seed error:", error.message);
  }
}

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  avatar: { type: String, default: "" },
  role: { type: String, enum: Object.values(ROLES), default: ROLES.STUDENT },
  department: { type: String, enum: [...Object.values(DEPARTMENTS), null], default: null },
  branch: { type: String, default: null },
  permissions: { type: [String], default: [] },
  year: { type: String, default: "" },
  semester: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  titleHindi: { type: String, default: "" },
  titleRomanized: { type: String, default: "" },
  fileUrl: { type: String, required: true },
  fileType: { type: String, default: "" },
  uploadedBy: { type: String, required: true },
  uploadedByRole: { type: String, default: "" },
  category: { type: String, default: "General" },
  docDate: { type: String, default: "" },
  year: { type: String, default: "" },
  semester: { type: String, default: "" },
  branch: { type: String, default: "" },
  paperType: { type: String, default: "" },
  officialDocType: { type: String, default: "" },
  session: { type: String, default: "" },
  storageName: { type: String, default: "" },
  department: { type: String, enum: [...Object.values(DEPARTMENTS), null, ""], default: null },
  createdAt: { type: Date, default: Date.now },
  textContent: { type: String, default: "" },
  textContentHindi: { type: String, default: "" },
  textContentRomanized: { type: String, default: "" },
  extractedText: { type: String, default: "" },
  extractedTextHindi: { type: String, default: "" },
  extractedTextRomanized: { type: String, default: "" },
  language: { type: String, default: "en" },
  pageCount: { type: Number, default: 0 },
  ocrConfidence: { type: Number, default: 0 },
  ocrApplied: { type: Boolean, default: false },
  isScanned: { type: Boolean, default: false },
  searchTerms: { type: [String], default: [] },
  searchTermsHindi: { type: [String], default: [] },
  searchTermsRomanized: { type: [String], default: [] },
  keywords: { type: [String], default: [] },
  keywordsHindi: { type: [String], default: [] },
  keywordsRomanized: { type: [String], default: [] },
  keywordSynonyms: { type: [String], default: [] },
  keywordSynonymsHindi: { type: [String], default: [] },
  embedding: { type: [Number], default: [] },
  processingStatus: { type: String, enum: ["pending", "processing", "completed", "failed"], default: "pending" },
  processingError: { type: String, default: "" },
  pageTexts: { type: [String], default: [] },
  fullTextSearchScore: { type: Number, default: 0 },
  status: { type: String, enum: ["draft", "pending_approval", "approved", "rejected", "published"], default: "pending_approval" },
  approvalStage: { type: String, default: "" },
  approvalChain: { type: [String], default: [] },
  currentApprovalIndex: { type: Number, default: 0 },
  approvedBy: { type: String, default: "" },
  approvedAt: { type: Date, default: null },
  rejectedBy: { type: String, default: "" },
  rejectedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: "" },
  approvalComments: { type: [{ user: String, role: String, comment: String, timestamp: Date, action: String }], default: [] },
  draftCreatedAt: { type: Date, default: null },
  publishedAt: { type: Date, default: null }
});

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

const historySchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  title: { type: String, required: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
  chunkId: { type: mongoose.Schema.Types.ObjectId, ref: "Chunk" },
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
const Document = mongoose.model("Document", documentSchema);
const Chunk = mongoose.model("Chunk", chunkSchema);
const History = mongoose.model("History", historySchema);

function detectLanguage(text) {
  if (!text) return 'en';
  const hindiRegex = /[\u0900-\u097F]/g;
  const hindiCount = (text.match(hindiRegex) || []).length;
  const totalChars = text.replace(/\s/g, '').length || 1;
  if (hindiCount > 0 && (hindiCount / totalChars) > 0.01) return 'hi';
  return 'en';
}

function romanizeHindi(text) {
  if (!text) return '';
  const mapping = {
    '\u0905': 'a', '\u0906': 'aa', '\u0907': 'i', '\u0908': 'ee', '\u0909': 'u', '\u090A': 'oo',
    '\u090F': 'e', '\u0910': 'ai', '\u0913': 'o', '\u0914': 'au', '\u0902': 'an', '\u0903': 'ah',
    '\u0915': 'k', '\u0916': 'kh', '\u0917': 'g', '\u0918': 'gh', '\u0919': 'ng',
    '\u091A': 'ch', '\u091B': 'chh', '\u091C': 'j', '\u091D': 'jh', '\u091E': 'ny',
    '\u091F': 't', '\u0920': 'th', '\u0921': 'd', '\u0922': 'dh', '\u0923': 'n',
    '\u0924': 't', '\u0925': 'th', '\u0926': 'd', '\u0927': 'dh', '\u0928': 'n',
    '\u092A': 'p', '\u092B': 'ph', '\u092C': 'b', '\u092D': 'bh', '\u092E': 'm',
    '\u092F': 'y', '\u0930': 'r', '\u0932': 'l', '\u0935': 'v', '\u0936': 'sh',
    '\u0937': 'sh', '\u0938': 's', '\u0939': 'h', '\u0915\u094D\u0937': 'ksh', '\u0924\u094D\u0930': 'tr',
    '\u091C\u094D\u091E': 'gya', '\u0921\u093C': 'd', '\u0922\u093C': 'dh',
    '\u093E': 'a', '\u093F': 'i', '\u0940': 'ee', '\u0941': 'u', '\u0942': 'oo',
    '\u0947': 'e', '\u0948': 'ai', '\u094B': 'o', '\u094C': 'au', '\u0902': 'n',
    '\u0903': 'h', '\u094D': ''
  };
  let result = '';
  let i = 0;
  while (i < text.length) {
    let char = text[i];
    let nextChar = i + 1 < text.length ? text[i + 1] : '';
    let twoChar = char + nextChar;
    if (mapping[twoChar] !== undefined) {
      result += mapping[twoChar];
      i += 2;
    } else if (mapping[char] !== undefined) {
      result += mapping[char];
      i++;
    } else {
      result += char;
      i++;
    }
  }
  return result;
}

function normalizeText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').replace(/[^a-zA-Z0-9\s\-\.\u0900-\u097F]/g, ' ').trim();
}

function getUniqueWords(text) {
  if (!text) return [];
  const words = text.split(/\s+/).filter(word => word.length > 1);
  const unique = [];
  const seen = new Set();
  for (const word of words) {
    const normalized = word.toLowerCase().trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(word);
    }
  }
  return unique;
}

async function generateEmbedding(text) {
  if (!text || text.length < 5) return [];
  try {
    const cleanText = text.substring(0, 2000).trim();
    if (genAI) {
      const model = genAI.getGenerativeModel({ model: "embedding-001" });
      const result = await model.embedContent(cleanText);
      if (result && result.embedding && result.embedding.values) {
        return result.embedding.values;
      }
      return [];
    }
    if (openai) {
      const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: cleanText
      });
      if (response && response.data && response.data.length > 0) {
        return response.data[0].embedding || [];
      }
      return [];
    }
  } catch (e) {
    console.error("Embedding error:", e.message);
    return [];
  }
  return [];
}

function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  if (!text || text.length < MIN_CHUNK_LENGTH) {
    return text.length > 0 ? [{ text: text.substring(0, 500), index: 0 }] : [];
  }
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let currentChunk = "";
  let chunkIndex = 0;
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= chunkSize) {
      currentChunk += (currentChunk ? " " : "") + sentence;
    } else {
      if (currentChunk.length >= MIN_CHUNK_LENGTH) {
        chunks.push({ text: currentChunk.trim(), index: chunkIndex++ });
        const words = currentChunk.split(/\s+/);
        const overlapWords = words.slice(-Math.floor(overlap / 5));
        currentChunk = overlapWords.join(" ") + " " + sentence;
      } else {
        currentChunk += (currentChunk ? " " : "") + sentence;
      }
    }
  }
  if (currentChunk.length >= MIN_CHUNK_LENGTH) {
    chunks.push({ text: currentChunk.trim(), index: chunkIndex });
  } else if (chunks.length > 0 && currentChunk.length > 0) {
    chunks[chunks.length - 1].text += " " + currentChunk;
  }
  return chunks;
}

async function embedDocumentChunks(document, chunks, metadata) {
  const embeddedChunks = [];
  for (const chunk of chunks) {
    const textToEmbed = chunk.text;
    const embedding = await generateEmbedding(textToEmbed);
    if (embedding && embedding.length > 0) {
      const hindiText = document.extractedTextHindi || "";
      const romanizedText = romanizeHindi(textToEmbed);
      embeddedChunks.push({
        documentId: document._id,
        chunkIndex: chunk.index,
        text: textToEmbed,
        textHindi: hindiText,
        textRomanized: romanizedText,
        pageNumber: metadata.pageNumber || 0,
        embedding: embedding,
        metadata: {
          title: document.title || metadata.title || "",
          category: document.category || metadata.category || "",
          branch: document.branch || metadata.branch || "",
          semester: document.semester || metadata.semester || "",
          year: document.year || metadata.year || "",
          session: document.session || metadata.session || "",
          officialDocType: document.officialDocType || metadata.officialDocType || "",
          paperType: document.paperType || metadata.paperType || "",
          department: document.department || metadata.department || "",
          status: document.status || metadata.status || "published"
        }
      });
    }
  }
  return embeddedChunks;
}

function buildIndexedDocument(title, extractedText, fileUrl, fileType, uploadedBy, uploadedByRole, category, docDate, year, semester, branch, paperType, officialDocType, session, storageName, department, pageTexts, ocrConfidence, ocrApplied, isScanned, status) {
  const finalTitle = title || '';
  const titleLang = detectLanguage(finalTitle);
  const textLang = detectLanguage(extractedText);
  const language = (titleLang === 'hi' || textLang === 'hi') ? 'hi' : 'en';
  const romanizedTitle = romanizeHindi(finalTitle);
  const romanizedText = romanizeHindi(extractedText);
  const normalizedTitle = normalizeText(finalTitle);
  const normalizedText = normalizeText(extractedText);
  const metaBlob = [finalTitle, officialDocType, paperType, category, storageName, year, semester, branch, session, department].filter(Boolean).join(' ');
  const metaBlobRomanized = romanizeHindi(metaBlob);
  let extractedTextHindi = '';
  let searchTermsHindi = [];
  let titleHindi = '';
  let textContentHindi = '';
  let keywordsHindi = [];
  let keywordSynonymsHindi = [];
  if (language === 'hi' || textLang === 'hi' || titleLang === 'hi') {
    extractedTextHindi = normalizedText;
    if (normalizedText) {
      searchTermsHindi = getUniqueWords(`${normalizedText} ${metaBlob}`).slice(0, 1000);
      keywordsHindi = getUniqueWords(`${normalizedText} ${metaBlob}`).slice(0, 200);
      keywordSynonymsHindi = generateHindiSearchVariants(`${normalizedText} ${metaBlob}`);
    }
    if (titleLang === 'hi') titleHindi = normalizedTitle;
    textContentHindi = `${normalizedTitle} ${normalizedText} ${metaBlob}`.trim();
  }
  const searchTerms = normalizedText ? getUniqueWords(`${normalizedText} ${metaBlob}`).slice(0, 1000) : getUniqueWords(metaBlob).slice(0, 1000);
  const romanizedSearchTerms = romanizedText ? getUniqueWords(`${romanizedText} ${metaBlobRomanized}`).slice(0, 1000) : getUniqueWords(metaBlobRomanized).slice(0, 1000);
  const keywords = normalizedText ? getUniqueWords(`${normalizedText} ${metaBlob}`).slice(0, 200) : getUniqueWords(metaBlob).slice(0, 200);
  const keywordSynonyms = normalizedText ? generateEnglishSearchVariants(`${normalizedText} ${metaBlob}`) : generateEnglishSearchVariants(metaBlob);
  const textContent = `${normalizedTitle} ${normalizedText} ${metaBlob}`.trim();
  const textContentRomanized = `${romanizedTitle} ${romanizedText} ${metaBlobRomanized}`.trim();
  return {
    title: normalizedTitle,
    titleHindi: titleHindi || '',
    titleRomanized: romanizedTitle,
    fileUrl, fileType: fileType || "",
    uploadedBy, uploadedByRole: uploadedByRole || "",
    category: category || "General",
    docDate: docDate || "", year: year || "",
    semester: semester || "", branch: branch || "",
    paperType: paperType || "", officialDocType: officialDocType || "",
    session: session || "", storageName: storageName || "",
    department: department || null,
    textContent, textContentHindi: textContentHindi || '',
    textContentRomanized, extractedText: normalizedText,
    extractedTextHindi: extractedTextHindi || '',
    extractedTextRomanized: romanizedText,
    language, searchTerms, searchTermsHindi,
    searchTermsRomanized: romanizedSearchTerms,
    keywords, keywordsHindi, keywordsRomanized: keywordSynonyms,
    keywordSynonyms, keywordSynonymsHindi,
    pageTexts: pageTexts || [],
    ocrConfidence: ocrConfidence || 0,
    ocrApplied: ocrApplied || false,
    isScanned: isScanned || false,
    status: status || "pending_approval"
  };
}

const synonymMap = {
  'eid': ['eid', 'ईद', 'bakrid', 'eid ul azha', 'bakri eid', 'ईद उल अज़हा', 'बकरीद'],
  'hostel': ['hostel', 'छात्रावास', 'होस्टल', 'dormitory', 'residence hall'],
  'holiday': ['holiday', 'छुट्टी', 'अवकाश', 'vacation', 'break', 'leave'],
  'exam': ['exam', 'examination', 'परीक्षा', 'test', 'assessment'],
  'fee': ['fee', 'fees', 'शुल्क', 'payment', 'tuition'],
  'admission': ['admission', 'admissions', 'प्रवेश', 'enrollment', 'registration'],
  'notice': ['notice', 'सूचना', 'announcement', 'notification', 'circular'],
  'result': ['result', 'परिणाम', 'marks', 'grades', 'scorecard'],
  'placement': ['placement', 'placements', 'campus placement', 'recruitment', 'job placement'],
  'scholarship': ['scholarship', 'छात्रवृत्ति', 'financial aid', 'grant', 'fellowship'],
  'internship': ['internship', 'internships', 'training', 'apprenticeship', 'intern'],
  'seminar': ['seminar', 'संगोष्ठी', 'workshop', 'presentation', 'guest lecture'],
  'syllabus': ['syllabus', 'पाठ्यक्रम', 'curriculum', 'course', 'study material'],
  'library': ['library', 'पुस्तकालय', 'reading room', 'study center'],
  'sports': ['sports', 'खेल', 'athletics', 'games', 'physical education'],
  'canteen': ['canteen', 'कैंटीन', 'cafeteria', 'mess', 'food court'],
  'rules': ['rules', 'नियम', 'regulations', 'guidelines', 'policy'],
  'timetable': ['timetable', 'time table', 'schedule', 'routine', 'class schedule'],
  'ramadan': ['ramadan', 'रमज़ान', 'ramzan', 'roza', 'iftaar'],
  'diwali': ['diwali', 'दीपावली', 'deepawali', 'festival of lights'],
  'holi': ['holi', 'होली', 'festival of colors'],
  'bakrid': ['bakrid', 'बकरीद', 'eid ul adha', 'eid ul azha', 'qurbani'],
  'christmas': ['christmas', 'क्रिसमस', 'xmas', 'christmas day'],
  'new year': ['new year', 'नया साल', 'new years', 'new year day'],
  'republic day': ['republic day', 'गणतंत्र दिवस', '26 january'],
  'independence day': ['independence day', 'स्वतंत्रता दिवस', '15 august'],
  'gandhi jayanti': ['gandhi jayanti', 'गांधी जयंती', '2 october']
};

function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase().split(/[\s,.\-_\'\"()\[\]{}:;!?@#$%^&*+=/\\|<>~`]+/).filter(w => w.length > 0);
}

const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being','of','to','in','on','at','for','with',
  'about','me','my','mine','i','you','your','yours','we','us','our','ours','he','she','it','its',
  'they','them','their','this','that','these','those','and','or','but','if','then','than','so',
  'give','giving','gave','show','showing','find','finding','want','wanting','need','needing',
  'please','tell','telling','get','getting','can','could','would','should','do','does','did',
  'from','by','as','all','any','some','have','has','had','will','shall','not','no','yes',
  'there','here','what','which','who','whom','how','when','where','why'
]);

function filterStopWords(tokens) {
  const filtered = tokens.filter(t => !STOP_WORDS.has(t));
  return filtered.length > 0 ? filtered : tokens;
}

function normalizeUnicode(text) {
  if (!text) return '';
  return text.normalize('NFKC');
}

function getSynonymMatches(tokens, searchTokens) {
  const matches = [];
  const tokenSet = new Set(tokens);
  for (const st of searchTokens) {
    for (const [key, synonyms] of Object.entries(synonymMap)) {
      const allTerms = [key, ...synonyms];
      const searchTerm = st.toLowerCase().trim();
      if (allTerms.some(t => t.toLowerCase().trim() === searchTerm)) {
        for (const syn of allTerms) {
          const synLower = syn.toLowerCase().trim();
          if (tokenSet.has(synLower) && !matches.includes(synLower)) {
            matches.push(synLower);
          }
        }
      }
    }
  }
  return matches;
}

function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i-1] === a[j-1]) matrix[i][j] = matrix[i-1][j-1];
      else matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, matrix[i][j-1] + 1, matrix[i-1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const dotProduct = vecA.reduce((sum, val, i) => sum + val * (vecB[i] || 0), 0);
  const normA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

function preprocessQuery(query) {
  let processed = query.trim().toLowerCase();
  processed = normalizeUnicode(processed);
  processed = processed.replace(/[^\w\s\u0900-\u097F]/g, ' ');
  processed = processed.replace(/\s+/g, ' ').trim();
  return processed;
}

function transliterateEnglishToHindi(englishText) {
  const mapping = {
    'eid': 'ईद', 'id': 'ईद', 'e': 'इ', 'i': 'इ', 'ee': 'ई', 'a': 'अ', 'aa': 'आ',
    'u': 'उ', 'oo': 'ऊ', 'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ch': 'च',
    'chh': 'छ', 'j': 'ज', 'jh': 'झ', 't': 'ट', 'th': 'ठ', 'd': 'ड', 'dh': 'ढ',
    'n': 'न', 'p': 'प', 'ph': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म', 'y': 'य',
    'r': 'र', 'l': 'ल', 'v': 'व', 'sh': 'श', 's': 'स', 'h': 'ह', 'ng': 'ंग',
    'ny': 'ञ', 'ksh': 'क्ष', 'tr': 'त्र', 'gya': 'ज्ञ'
  };
  let result = '';
  let i = 0;
  const text = englishText.toLowerCase();
  while (i < text.length) {
    let found = false;
    for (let len = 5; len >= 1; len--) {
      if (i + len <= text.length) {
        const sub = text.substring(i, i + len);
        if (mapping[sub]) {
          result += mapping[sub];
          i += len;
          found = true;
          break;
        }
      }
    }
    if (!found) {
      result += text[i];
      i++;
    }
  }
  return result;
}

function generateHindiSearchVariants(query) {
  const variants = [];
  const original = query.trim().toLowerCase();
  if (!original) return variants;
  variants.push(original);
  const romanized = romanizeHindi(original);
  if (romanized !== original) variants.push(romanized);
  const words = original.split(/\s+/);
  for (const word of words) {
    if (word.length > 1) {
      const wordRomanized = romanizeHindi(word);
      if (wordRomanized !== word) variants.push(wordRomanized);
      if (wordRomanized.length > 1) {
        const variations = [
          wordRomanized,
          wordRomanized.replace(/aa/g, 'a'),
          wordRomanized.replace(/ee/g, 'i'),
          wordRomanized.replace(/oo/g, 'u'),
          wordRomanized.replace(/sh/g, 's'),
          wordRomanized.replace(/ch/g, 'c'),
          wordRomanized.replace(/kh/g, 'k'),
          wordRomanized.replace(/ph/g, 'p'),
          wordRomanized.replace(/bh/g, 'b'),
          wordRomanized.replace(/dh/g, 'd'),
          wordRomanized.replace(/gh/g, 'g'),
          wordRomanized.replace(/jh/g, 'j'),
          wordRomanized.replace(/th/g, 't'),
          wordRomanized.replace(/ng/g, 'n'),
          wordRomanized.replace(/ny/g, 'n'),
          wordRomanized.replace(/ksh/g, 'k')
        ];
        for (const v of variations) {
          if (v !== wordRomanized && !variants.includes(v)) variants.push(v);
        }
      }
    }
  }
  const unique = [];
  const seen = new Set();
  for (const v of variants) {
    const normalized = v.toLowerCase().trim();
    if (!seen.has(normalized) && normalized.length > 0) {
      seen.add(normalized);
      unique.push(v);
    }
  }
  return unique.slice(0, 50);
}

function generateEnglishSearchVariants(query) {
  const variants = [];
  const original = query.trim().toLowerCase();
  if (!original) return variants;
  variants.push(original);
  const words = original.split(/\s+/);
  for (const word of words) {
    if (word.length > 1) {
      variants.push(word);
      if (word.endsWith('s') && word.length > 2) variants.push(word.slice(0, -1));
      if (word.endsWith('es') && word.length > 3) variants.push(word.slice(0, -2));
      if (word.endsWith('ed') && word.length > 3) variants.push(word.slice(0, -2));
      if (word.endsWith('ing') && word.length > 4) variants.push(word.slice(0, -3));
      if (word.endsWith('tion') && word.length > 5) variants.push(word.slice(0, -4) + 't');
      if (word.endsWith('ly') && word.length > 3) variants.push(word.slice(0, -2));
      if (word.endsWith('al') && word.length > 3) variants.push(word.slice(0, -2));
    }
  }
  const romanized = romanizeHindi(original);
  if (romanized !== original) {
    variants.push(romanized);
    const romanizedWords = romanized.split(/\s+/);
    for (const rw of romanizedWords) {
      if (rw.length > 1 && !variants.includes(rw)) variants.push(rw);
    }
  }
  const unique = [];
  const seen = new Set();
  for (const v of variants) {
    const normalized = v.toLowerCase().trim();
    if (!seen.has(normalized) && normalized.length > 0) {
      seen.add(normalized);
      unique.push(v);
    }
  }
  return unique.slice(0, 50);
}

function calculateMetadataScore(chunk, query) {
  let score = 0;
  const q = query.toLowerCase();
  const metadata = chunk.metadata || {};
  const fields = [metadata.title, metadata.category, metadata.branch, metadata.semester, metadata.year, metadata.session, metadata.officialDocType, metadata.paperType, metadata.department];
  for (const field of fields) {
    if (field && field.toLowerCase().includes(q)) score += 0.2;
  }
  return Math.min(score, 1);
}

function calculateEnhancedExactMatchScore(doc, query, processedQuery) {
  let score = 0;
  const originalQuery = query.toLowerCase().trim();
  const queryWords = originalQuery.split(/\s+/).filter(w => w.length > 1);
  const titleLower = (doc.title || '').toLowerCase();
  const titleHindiLower = (doc.titleHindi || '').toLowerCase();
  const titleRomanizedLower = (doc.titleRomanized || '').toLowerCase();
  if (titleLower === originalQuery || titleLower.includes(originalQuery)) score += 10.0;
  if (titleHindiLower.includes(originalQuery)) score += 8.0;
  if (titleRomanizedLower.includes(originalQuery)) score += 6.0;
  let allWordsInTitle = true;
  let matchedCount = 0;
  for (const word of queryWords) {
    if (titleLower.includes(word) || titleHindiLower.includes(word) || titleRomanizedLower.includes(word)) matchedCount++;
    else allWordsInTitle = false;
  }
  if (allWordsInTitle && queryWords.length > 0) score += 5.0 * (matchedCount / queryWords.length);
  else if (matchedCount > 0) score += 2.0 * (matchedCount / queryWords.length);
  const metadataFields = [doc.officialDocType, doc.paperType, doc.category, doc.branch, doc.year, doc.semester, doc.session, doc.department];
  for (const field of metadataFields) {
    if (field && field.toLowerCase().includes(originalQuery)) score += 3.0;
    else if (field) {
      const fieldLower = field.toLowerCase();
      for (const word of queryWords) {
        if (fieldLower.includes(word)) { score += 1.5; break; }
      }
    }
  }
  const filenameLower = (doc.storageName || '').toLowerCase();
  if (filenameLower === originalQuery || filenameLower === originalQuery + '.pdf' || filenameLower === originalQuery + '.docx' || filenameLower === originalQuery + '.doc') score += 6.0;
  else if (filenameLower.includes(originalQuery)) score += 3.0;
  const contentLower = (doc.extractedText || '').toLowerCase();
  const contentHindiLower = (doc.extractedTextHindi || '').toLowerCase();
  if (contentLower.includes(originalQuery)) score += 4.0;
  if (contentHindiLower.includes(originalQuery)) score += 3.0;
  if (originalQuery.includes('elective') || queryWords.some(w => w === 'elective')) {
    const docText = ((doc.extractedText || '') + (doc.title || '')).toLowerCase();
    if (docText.includes('elective')) score += 8.0;
    if (doc.title.toLowerCase().includes('syllabus') || doc.titleHindi.toLowerCase().includes('पाठ्यक्रम') || doc.officialDocType === 'Syllabus') score += 10.0;
  }
  if (originalQuery.includes('syllabus') || queryWords.some(w => w === 'syllabus')) {
    if (doc.title.toLowerCase().includes('syllabus') || doc.titleHindi.toLowerCase().includes('पाठ्यक्रम') || doc.officialDocType === 'Syllabus') score += 10.0;
  }
  const yearMatch = originalQuery.match(/(\d+)(?:st|nd|rd|th)?\s*year/i);
  if (yearMatch && doc.year && doc.year.includes(yearMatch[1])) score += 3.0;
  const semMatch = originalQuery.match(/(\d+)(?:st|nd|rd|th)?\s*semester/i);
  if (semMatch && doc.semester && doc.semester.includes(semMatch[1])) score += 3.0;
  return Math.min(score, 30);
}

function calculateEnhancedKeywordScore(doc, queryTokens, processedQuery) {
  if (!queryTokens || queryTokens.length === 0) return 0;
  let score = 0;
  const allText = `${doc.title || ''} ${doc.titleHindi || ''} ${doc.titleRomanized || ''} ${doc.extractedText || ''} ${doc.extractedTextHindi || ''} ${doc.extractedTextRomanized || ''} ${doc.keywords || []} ${doc.keywordsHindi || []} ${doc.searchTerms || []} ${doc.searchTermsHindi || []}`.toLowerCase();
  const tokens = tokenize(allText);
  const tokenSet = new Set(tokens);
  let matchedCount = 0;
  const importantTerms = ['elective', 'syllabus', 'course', 'curriculum', '1st', '2nd', '3rd', '4th', 'year', 'semester'];
  for (const token of queryTokens) {
    if (tokenSet.has(token)) {
      matchedCount++;
      if (importantTerms.some(term => token.includes(term) || term.includes(token))) matchedCount += 0.5;
    }
  }
  if (matchedCount > 0) score = Math.min(matchedCount / queryTokens.length, 1) * 2.0;
  const synonymMatches = getSynonymMatches(tokens, queryTokens);
  if (synonymMatches.length > 0) score += Math.min(synonymMatches.length * 0.3, 1.0);
  return Math.min(score, 3);
}

function calculatePhraseMatchBonus(doc, query) {
  let bonus = 0;
  const queryLower = query.toLowerCase().trim();
  const titleLower = (doc.title || '').toLowerCase();
  if (titleLower.includes(queryLower)) bonus += 5.0;
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);
  if (queryWords.length >= 2) {
    let foundSequence = 0;
    let lastIndex = -1;
    for (const word of queryWords) {
      const idx = titleLower.indexOf(word, lastIndex + 1);
      if (idx !== -1 && idx > lastIndex) { foundSequence++; lastIndex = idx; }
    }
    if (foundSequence === queryWords.length) bonus += 3.0;
    else if (foundSequence >= 2) bonus += 1.5;
  }
  return bonus;
}

function calculateKeywordBoost(doc, query) {
  let boost = 0;
  const queryLower = query.toLowerCase();
  const docLower = ((doc.extractedText || '') + (doc.title || '')).toLowerCase();
  if (queryLower.includes('elective') && queryLower.includes('syllabus')) {
    if (doc.officialDocType === 'Syllabus' && docLower.includes('elective')) boost += 15.0;
    if (doc.officialDocType === 'Syllabus' && doc.category === 'Official Update') boost += 5.0;
  }
  const yearMatch = queryLower.match(/(\d+)(?:st|nd|rd|th)?\s*year/);
  const semMatch = queryLower.match(/(\d+)(?:st|nd|rd|th)?\s*semester/);
  if (yearMatch && semMatch) {
    if (doc.year && doc.year.includes(yearMatch[1]) && doc.semester && doc.semester.includes(semMatch[1])) boost += 8.0;
  }
  const branches = ['cse', 'cs', 'computer', 'ece', 'ee', 'me', 'ce', 'chemical', 'aai', 'ai'];
  for (const branch of branches) {
    if (queryLower.includes(branch) && doc.branch && doc.branch.toLowerCase().includes(branch)) boost += 3.0;
  }
  return boost;
}

async function semanticSearch(query, filter = {}, limit = SEARCH_RESULTS_LIMIT) {
  const processedQuery = preprocessQuery(query);
  if (!processedQuery || processedQuery.length < 2) return await Document.find(filter).sort({ createdAt: -1 }).limit(limit);
  const queryEmbedding = await generateEmbedding(processedQuery);
  if (!queryEmbedding || queryEmbedding.length === 0) return [];
  const filterQuery = {};
  if (filter.category) filterQuery['metadata.category'] = filter.category;
  if (filter.branch) filterQuery['metadata.branch'] = filter.branch;
  if (filter.semester) filterQuery['metadata.semester'] = filter.semester;
  if (filter.year) filterQuery['metadata.year'] = filter.year;
  if (filter.status) filterQuery['metadata.status'] = filter.status;
  if (filter.department) filterQuery['metadata.department'] = filter.department;
  let chunks = await Chunk.find(filterQuery).limit(200);
  if (chunks.length === 0) return [];
  const scoredChunks = chunks.map(chunk => {
    const similarity = cosineSimilarity(queryEmbedding, chunk.embedding || []);
    const textTokens = tokenize(chunk.text);
    const queryTokens = tokenize(processedQuery);
    const keywordScore = textTokens.filter(t => queryTokens.includes(t)).length / Math.max(queryTokens.length, 1);
    const metadataScore = calculateMetadataScore(chunk, processedQuery);
    const combinedScore = (similarity * 0.6) + (keywordScore * 0.3) + (metadataScore * 0.1);
    return { chunk, similarity, keywordScore, metadataScore, combinedScore };
  });
  scoredChunks.sort((a, b) => b.combinedScore - a.combinedScore);
  const topChunks = scoredChunks.slice(0, limit);
  const documentIds = [...new Set(topChunks.map(sc => sc.chunk.documentId.toString()))];
  const documents = await Document.find({ _id: { $in: documentIds } });
  const docMap = {};
  documents.forEach(doc => { docMap[doc._id.toString()] = doc; });
  return topChunks.map(sc => {
    const doc = docMap[sc.chunk.documentId.toString()];
    if (!doc) return null;
    const docObj = doc.toObject ? doc.toObject() : doc;
    docObj._ranking = {
      score: Math.round(sc.combinedScore * 1000),
      semanticScore: Math.round(sc.similarity * 1000),
      keywordScore: Math.round(sc.keywordScore * 1000),
      metadataScore: Math.round(sc.metadataScore * 1000),
      matchedChunk: sc.chunk.text.substring(0, 300) + (sc.chunk.text.length > 300 ? '...' : ''),
      chunkId: sc.chunk._id
    };
    docObj.relevanceScore = Math.round(sc.combinedScore * 1000);
    docObj.semanticScore = sc.similarity;
    return docObj;
  }).filter(Boolean);
}

async function fullTextSearch(query, filter = {}, limit = SEARCH_RESULTS_LIMIT) {
  const processedQuery = preprocessQuery(query);
  if (!processedQuery || processedQuery.length < 2) return [];
  try {
    const filterConditions = {};
    if (filter.category) filterConditions.category = filter.category;
    if (filter.branch) filterConditions.branch = filter.branch;
    if (filter.semester) filterConditions.semester = filter.semester;
    if (filter.year) filterConditions.year = filter.year;
    if (filter.status) filterConditions.status = filter.status;
    if (filter.department) filterConditions.department = filter.department;
    const textSearchQuery = { $text: { $search: processedQuery } };
    const combinedQuery = Object.keys(filterConditions).length > 0 ? { $and: [textSearchQuery, filterConditions] } : textSearchQuery;
    const results = await Document.find(combinedQuery, { score: { $meta: "textScore" } }).sort({ score: { $meta: "textScore" } }).limit(limit);
    return results.map(doc => {
      const docObj = doc.toObject ? doc.toObject() : doc;
      docObj.fullTextScore = doc._doc ? doc._doc.score : 0;
      docObj.relevanceScore = Math.round((doc._doc ? doc._doc.score : 0) * 100);
      return docObj;
    });
  } catch (e) {
    return [];
  }
}

async function fallbackSearch(query, filter = {}, limit = SEARCH_RESULTS_LIMIT) {
  const processedQuery = preprocessQuery(query);
  const searchTokens = filterStopWords(tokenize(processedQuery));
  const searchConditions = [];
  const escapedQuery = processedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  ['title','titleHindi','titleRomanized','extractedText','extractedTextHindi','extractedTextRomanized','textContent','textContentHindi','textContentRomanized','officialDocType','paperType','category','year','semester','branch','session','department','keywords','keywordsHindi','searchTerms','searchTermsHindi'].forEach(field => {
    searchConditions.push({ [field]: { $regex: escapedQuery, $options: "i" } });
  });
  for (const token of searchTokens) {
    if (token.length < 2) continue;
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    ['title','titleHindi','titleRomanized','extractedText','extractedTextHindi','extractedTextRomanized','textContent','textContentHindi','textContentRomanized'].forEach(field => {
      searchConditions.push({ [field]: { $regex: escapedToken, $options: "i" } });
    });
  }
  const hindiTransliteration = transliterateEnglishToHindi(processedQuery);
  if (hindiTransliteration && hindiTransliteration !== processedQuery) {
    const escapedHindi = hindiTransliteration.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    searchConditions.push({ titleHindi: { $regex: escapedHindi, $options: "i" } });
    searchConditions.push({ extractedTextHindi: { $regex: escapedHindi, $options: "i" } });
    searchConditions.push({ textContentHindi: { $regex: escapedHindi, $options: "i" } });
  }
  const romanizedQuery = romanizeHindi(processedQuery);
  if (romanizedQuery && romanizedQuery !== processedQuery) {
    const escapedRomanized = romanizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    searchConditions.push({ titleRomanized: { $regex: escapedRomanized, $options: "i" } });
    searchConditions.push({ extractedTextRomanized: { $regex: escapedRomanized, $options: "i" } });
    searchConditions.push({ textContentRomanized: { $regex: escapedRomanized, $options: "i" } });
  }
  let dbFilter = { ...filter };
  if (filter.category) dbFilter.category = filter.category;
  if (filter.branch) dbFilter.branch = filter.branch;
  if (filter.semester) dbFilter.semester = filter.semester;
  if (filter.year) dbFilter.year = filter.year;
  if (filter.status) dbFilter.status = filter.status;
  if (filter.department) dbFilter.department = filter.department;
  const finalQuery = searchConditions.length > 0 ? { $or: searchConditions, ...dbFilter } : dbFilter;
  let docs = await Document.find(finalQuery).limit(limit);
  if (docs.length === 0 && processedQuery.length > 2) {
    const chunkMatch = await Chunk.find({
      $text: { $search: processedQuery },
      ...(filter.category ? { 'metadata.category': filter.category } : {}),
      ...(filter.branch ? { 'metadata.branch': filter.branch } : {}),
      ...(filter.department ? { 'metadata.department': filter.department } : {})
    }).limit(limit);
    if (chunkMatch.length > 0) {
      const docIds = [...new Set(chunkMatch.map(c => c.documentId.toString()))];
      docs = await Document.find({ _id: { $in: docIds } });
    }
  }
  return docs.slice(0, limit);
}

async function enhancedHybridSearch(query, filter = {}, limit = SEARCH_RESULTS_LIMIT) {
  const processedQuery = preprocessQuery(query);
  const queryTokens = filterStopWords(tokenize(processedQuery));
  if (!processedQuery || processedQuery.length < 2) return await Document.find(filter).sort({ createdAt: -1 }).limit(limit);
  const [semanticResults, fullTextResults, fallbackResults] = await Promise.all([
    semanticSearch(query, filter, limit * 3),
    fullTextSearch(query, filter, limit * 3),
    fallbackSearch(query, filter, limit * 3)
  ]);
  const resultMap = new Map();
  const scoreMap = new Map();
  const detailMap = new Map();
  for (const doc of semanticResults) {
    const id = doc._id.toString();
    const semanticScore = doc.semanticScore || 0;
    resultMap.set(id, doc);
    scoreMap.set(id, (scoreMap.get(id) || 0) + semanticScore * 3.0);
    detailMap.set(id, { semanticScore: semanticScore * 3.0 });
  }
  for (const doc of fullTextResults) {
    const id = doc._id.toString();
    const textScore = doc.fullTextScore || 0;
    if (!resultMap.has(id)) resultMap.set(id, doc);
    scoreMap.set(id, (scoreMap.get(id) || 0) + textScore * 3.0);
    const details = detailMap.get(id) || {};
    details.textScore = textScore * 3.0;
    detailMap.set(id, details);
  }
  for (const doc of fallbackResults) {
    const id = doc._id.toString();
    if (!resultMap.has(id)) resultMap.set(id, doc);
    const fallbackScore = doc.relevanceScore || 0;
    scoreMap.set(id, (scoreMap.get(id) || 0) + fallbackScore * 0.8);
    const details = detailMap.get(id) || {};
    details.fallbackScore = fallbackScore * 0.8;
    detailMap.set(id, details);
  }
  const finalResults = Array.from(resultMap.values()).map(doc => {
    const id = doc._id.toString();
    const currentScore = scoreMap.get(id) || 0;
    const exactMatchScore = calculateEnhancedExactMatchScore(doc, query, processedQuery);
    const keywordScore = calculateEnhancedKeywordScore(doc, queryTokens, processedQuery);
    const phraseBonus = calculatePhraseMatchBonus(doc, query);
    const keywordBoost = calculateKeywordBoost(doc, query);
    const totalScore = currentScore + (exactMatchScore * 150) + (keywordScore * 75) + phraseBonus + keywordBoost;
    doc.relevanceScore = Math.round(totalScore);
    doc._rankingDetails = {
      ...detailMap.get(id),
      exactMatchScore: exactMatchScore * 150,
      keywordScore: keywordScore * 75,
      phraseBonus, keywordBoost, totalScore
    };
    return doc;
  });
  finalResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  return finalResults.slice(0, limit);
}

function preprocessImage(imagePath) {
  return new Promise((resolve) => {
    try {
      const outputPath = imagePath.replace(/(\.[^.]+)$/, '_processed$1');
      sharp(imagePath).greyscale().normalize().sharpen().threshold(128).toFile(outputPath).then(() => resolve(outputPath)).catch(() => resolve(imagePath));
    } catch (e) { resolve(imagePath); }
  });
}

async function checkTesseractLangs() {
  try {
    const { stdout, stderr } = await exec(`tesseract --list-langs`);
    const output = `${stdout || ""}\n${stderr || ""}`;
    return output.split("\n").map(line => line.trim()).filter(line => line && !line.toLowerCase().startsWith("list of"));
  } catch (e) { return []; }
}

async function ocrImage(imagePath, lang = 'eng') {
  const availableLangs = await checkTesseractLangs();
  const hasHindi = availableLangs.includes('hin');
  const langOption = hasHindi && lang === 'hi' ? 'hin+eng' : 'eng';
  const outputPath = path.join(tempDir, `ocr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  try {
    const processedPath = await preprocessImage(imagePath);
    const { stdout, stderr } = await exec(`tesseract "${processedPath}" "${outputPath}" -l ${langOption} --psm 6 --oem 3 --dpi 300 2>&1`);
    const resultPath = `${outputPath}.txt`;
    let text = '';
    if (fs.existsSync(resultPath)) {
      text = fs.readFileSync(resultPath, 'utf8');
      fs.unlinkSync(resultPath);
    }
    if (processedPath !== imagePath && fs.existsSync(processedPath)) fs.unlinkSync(processedPath);
    const confidenceMatch = stderr.match(/confidence = (\d+\.?\d*)/i);
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 60;
    return { text: text.trim(), confidence };
  } catch (e) { return { text: '', confidence: 0 }; }
}

async function ocrImageWithRetry(imagePath, lang = 'eng', attempts = 2) {
  let lastResult = { text: '', confidence: 0 };
  for (let i = 0; i < attempts; i++) {
    const result = await ocrImage(imagePath, lang);
    lastResult = result;
    if (result.text && result.text.length > 20 && result.confidence >= 50) return result;
    if (i < attempts - 1) await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return lastResult;
}

async function extractPDFText(filePath) {
  let embeddedText = '';
  let pageTexts = [];
  let ocrApplied = false;
  let isScanned = false;
  let ocrConfidence = 0;
  let totalPages = 0;
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    embeddedText = data.text || '';
    totalPages = data.numpages || 0;
    if (embeddedText && embeddedText.trim().length > 50) {
      const words = embeddedText.split(/\s+/).filter(w => w.length > 2);
      if (words.length > 20) {
        const devanagariCount = (embeddedText.match(/[\u0900-\u097F]/g) || []).length;
        const asciiCount = (embeddedText.match(/[a-zA-Z]/g) || []).length;
        if ((devanagariCount + asciiCount) / (embeddedText.length || 1) > 0.4) {
          pageTexts = [embeddedText];
          return { text: embeddedText, pageTexts, ocrApplied: false, isScanned: false, ocrConfidence: 85, totalPages };
        }
      }
    }
  } catch (e) {}
  try {
    const pdfParser = new PDFParser(null, 1);
    const extracted = await new Promise((resolve) => {
      let text = '';
      let pages = [];
      pdfParser.on('pdfParser_dataError', () => resolve({ text: '', pages: [] }));
      pdfParser.on('pdfParser_dataReady', (pdfData) => {
        try {
          if (pdfData && pdfData.Pages) {
            for (let page of pdfData.Pages) {
              let pageText = '';
              if (page.Texts) {
                for (let textItem of page.Texts) {
                  if (textItem.R) {
                    for (let line of textItem.R) {
                      if (line.T) pageText += decodeURIComponent(line.T) + ' ';
                    }
                  }
                }
              }
              if (pageText.trim()) { pages.push(pageText.trim()); text += pageText + ' '; }
            }
          }
        } catch (e) {}
        resolve({ text: text.trim(), pages });
      });
      pdfParser.loadPDF(filePath);
    });
    if (extracted.text && extracted.text.trim().length > 20) {
      pageTexts = extracted.pages;
      return { text: extracted.text, pageTexts, ocrApplied: false, isScanned: false, ocrConfidence: 80, totalPages: extracted.pages.length || totalPages };
    }
  } catch (e) {}
  try {
    const { stdout } = await exec(`pdftotext -layout -nopgbrk "${filePath}" -`);
    if (stdout && stdout.trim().length > 20) {
      const words = stdout.split(/\s+/).filter(w => w.length > 2);
      if (words.length > 5) {
        pageTexts = [stdout];
        return { text: stdout, pageTexts, ocrApplied: false, isScanned: false, ocrConfidence: 85, totalPages: totalPages || 1 };
      }
    }
  } catch (e) {}
  try {
    const tempPdfDir = path.join(tempDir, `pdf_ocr_${Date.now()}`);
    if (!fs.existsSync(tempPdfDir)) fs.mkdirSync(tempPdfDir, { recursive: true });
    await exec(`pdftoppm -png -r 300 "${filePath}" "${path.join(tempPdfDir, 'page')}"`);
    const pageFiles = fs.readdirSync(tempPdfDir).filter(f => f.startsWith('page') && f.endsWith('.png')).sort();
    if (pageFiles.length > 0) {
      let combinedText = '';
      let pageTextsOcr = [];
      let totalConfidence = 0;
      let pageCount = 0;
      for (const pageFile of pageFiles) {
        const pagePath = path.join(tempPdfDir, pageFile);
        try {
          const processedPath = await preprocessImage(pagePath);
          const result = await ocrImageWithRetry(processedPath, 'hi+eng', 3);
          if (result.text && result.text.length > 10) {
            combinedText += result.text + ' ';
            pageTextsOcr.push(result.text);
            totalConfidence += result.confidence;
            pageCount++;
          }
          if (processedPath !== pagePath && fs.existsSync(processedPath)) fs.unlinkSync(processedPath);
        } catch (e) {}
        if (fs.existsSync(pagePath)) fs.unlinkSync(pagePath);
      }
      if (fs.existsSync(tempPdfDir)) fs.rmdirSync(tempPdfDir, { recursive: true });
      if (combinedText.trim()) {
        ocrApplied = true; isScanned = true;
        ocrConfidence = pageCount > 0 ? totalConfidence / pageCount : 60;
        return { text: combinedText.trim(), pageTexts: pageTextsOcr, ocrApplied, isScanned, ocrConfidence, totalPages: pageCount };
      }
    }
    if (fs.existsSync(tempPdfDir)) fs.rmdirSync(tempPdfDir, { recursive: true });
  } catch (e) {}
  if (embeddedText && embeddedText.trim()) {
    return { text: embeddedText, pageTexts: [embeddedText], ocrApplied: false, isScanned: false, ocrConfidence: 70, totalPages: totalPages || 1 };
  }
  return { text: '', pageTexts: [], ocrApplied: false, isScanned: true, ocrConfidence: 0, totalPages: totalPages || 0 };
}

async function extractImageText(filePath) {
  try {
    const result = await ocrImageWithRetry(filePath, 'hi+eng', 2);
    return { text: result.text || '', confidence: result.confidence || 0, ocrApplied: true };
  } catch (e) { return { text: '', confidence: 0, ocrApplied: false }; }
}

async function extractWordText(filePath) {
  let text = '';
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.docx') {
      try {
        const { stdout } = await exec(`python -c "import docx; doc=docx.Document('${filePath}'); print(' '.join([p.text for p in doc.paragraphs]))"`);
        text = stdout || '';
      } catch (e) {}
    } else if (ext === '.doc') {
      try {
        const { stdout } = await exec(`antiword "${filePath}"`);
        text = stdout || '';
      } catch (e) {}
    }
    if (!text) {
      try {
        const { stdout } = await exec(`python -c "import textract; print(textract.process('${filePath}').decode('utf-8'))"`);
        text = stdout || '';
      } catch (e) {}
    }
  } catch (e) {}
  return text ? normalizeText(text) : '';
}

async function extractExcelText(filePath) {
  let text = '';
  try {
    try {
      const { stdout } = await exec(`python -c "import pandas as pd; df=pd.read_excel('${filePath}'); print(df.to_string())"`);
      text = stdout || '';
    } catch (e) {}
    if (!text) {
      try {
        const { stdout } = await exec(`python -c "import textract; print(textract.process('${filePath}').decode('utf-8'))"`);
        text = stdout || '';
      } catch (e) {}
    }
  } catch (e) {}
  return text ? normalizeText(text) : '';
}

async function extractPowerPointText(filePath) {
  let text = '';
  try {
    try {
      const { stdout } = await exec(`python -c "from pptx import Presentation; prs=Presentation('${filePath}'); text=[]; [text.append(shape.text) for slide in prs.slides for shape in slide.shapes if hasattr(shape, 'text')]; print(' '.join(text))"`);
      text = stdout || '';
    } catch (e) {}
    if (!text) {
      try {
        const { stdout } = await exec(`python -c "import textract; print(textract.process('${filePath}').decode('utf-8'))"`);
        text = stdout || '';
      } catch (e) {}
    }
  } catch (e) {}
  return text ? normalizeText(text) : '';
}

function extractTextFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content ? normalizeText(content) : '';
  } catch (e) { return ''; }
}

async function extractFileContent(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();
  let result = { text: '', pageTexts: [], ocrApplied: false, isScanned: false, ocrConfidence: 0, totalPages: 0 };
  try {
    if (ext === '.pdf') {
      const pdfResult = await extractPDFText(filePath);
      result.text = pdfResult.text;
      result.pageTexts = pdfResult.pageTexts;
      result.ocrApplied = pdfResult.ocrApplied;
      result.isScanned = pdfResult.isScanned;
      result.ocrConfidence = pdfResult.ocrConfidence;
      result.totalPages = pdfResult.totalPages;
    } else if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tiff'].includes(ext)) {
      const imageResult = await extractImageText(filePath);
      result.text = imageResult.text;
      result.ocrApplied = imageResult.ocrApplied;
      result.isScanned = true;
      result.ocrConfidence = imageResult.confidence;
      result.totalPages = 1;
      result.pageTexts = [imageResult.text];
    } else if (['.doc', '.docx'].includes(ext)) {
      result.text = await extractWordText(filePath);
      result.totalPages = 1;
      result.pageTexts = [result.text];
    } else if (['.xls', '.xlsx'].includes(ext)) {
      result.text = await extractExcelText(filePath);
      result.totalPages = 1;
      result.pageTexts = [result.text];
    } else if (['.ppt', '.pptx'].includes(ext)) {
      result.text = await extractPowerPointText(filePath);
      result.totalPages = 1;
      result.pageTexts = [result.text];
    } else if (['.txt', '.csv', '.json', '.md'].includes(ext)) {
      result.text = extractTextFile(filePath);
      result.totalPages = 1;
      result.pageTexts = [result.text];
    }
  } catch (e) { result.text = ''; }
  return result;
}

async function generateRAGResponse(query, context) {
  try {
    if (genAI) {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `You are a college document assistant. Answer the user's question based ONLY on the following document excerpts. If the answer is not found in the excerpts, say "I don't have information about that in the uploaded documents." Do not make up information.\n\nDocument excerpts:\n${context}\n\nUser question: ${query}\n\nAnswer:`;
      const result = await model.generateContent(prompt);
      return result.response.text();
    }
    if (openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a college document assistant. Answer based ONLY on the document excerpts provided. If the answer is not found, say you don't have that information." },
          { role: "user", content: `Document excerpts:\n${context}\n\nQuestion: ${query}` }
        ],
        max_tokens: 500
      });
      return response.choices[0].message.content;
    }
  } catch (e) { return "AI service unavailable. Please try again later."; }
  return "AI service not configured. Please set up OpenAI or Gemini API key.";
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 80);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.tiff', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.json', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error("Unsupported file type."));
    cb(null, true);
  }
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, avatar, year, semester, branch } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Missing registration details." });
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(400).json({ message: "Email already registered." });
    const access = resolveAccess(normalizedEmail);
    const hashedPassword = await bcrypt.hash(password, 10);
    let userDepartment = access.department;
    let userBranch = access.branch;
    if (access.role === ROLES.STUDENT && branch) {
      const deptFromBranch = getDepartmentFromBranch(branch);
      if (deptFromBranch) userDepartment = deptFromBranch;
      userBranch = branch;
    }
    const user = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      avatar: avatar || "",
      role: access.role,
      department: userDepartment,
      branch: userBranch,
      permissions: access.permissions,
      year: year || "",
      semester: semester || ""
    });
    await user.save();
    const token = createToken(user);
    res.status(201).json({
      token,
      name: user.name, email: user.email, avatar: user.avatar,
      role: user.role, department: user.department, branch: user.branch,
      permissions: user.permissions,
      year: user.year, semester: user.semester
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during signup." });
  }
});

app.post("/api/auth/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ message: "Invalid email or password." });
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: "Invalid email or password." });
    await syncUserAccess(user);
    const token = createToken(user);
    res.status(200).json({
      token,
      name: user.name, email: user.email, avatar: user.avatar,
      role: user.role, department: user.department, branch: user.branch,
      permissions: user.permissions,
      year: user.year, semester: user.semester
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during signin." });
  }
});

app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    await syncUserAccess(user);
    res.status(200).json({
      name: user.name, email: user.email, avatar: user.avatar,
      role: user.role, department: user.department, branch: user.branch,
      permissions: user.permissions,
      year: user.year, semester: user.semester
    });
  } catch (error) {
    res.status(500).json({ message: "Server error while loading user." });
  }
});

app.put("/api/auth/update-avatar", authenticateToken, async (req, res) => {
  try {
    const { avatar } = req.body;
    const user = await User.findOneAndUpdate({ email: req.user.email }, { avatar: avatar || "" }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found." });
    res.status(200).json({ message: "Avatar updated successfully.", avatar: user.avatar });
  } catch (error) {
    res.status(500).json({ message: "Server error while updating avatar." });
  }
});

app.get("/api/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { department, role } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (role) filter.role = role;
    const users = await User.find(filter).select('-password').sort({ role: 1, department: 1, name: 1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching users." });
  }
});

app.get("/api/users/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: "User not found." });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching user." });
  }
});

app.put("/api/users/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, role, department, branch, permissions } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (name) user.name = name;
    if (role && Object.values(ROLES).includes(role)) {
      user.role = role;
      user.permissions = ROLE_PERMISSIONS[role] || [];
    }
    if (department !== undefined) user.department = department || null;
    if (branch !== undefined) user.branch = branch || null;
    if (permissions && Array.isArray(permissions)) user.permissions = permissions;
    await user.save();
    res.status(200).json({ message: "User updated successfully.", user: { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, branch: user.branch, permissions: user.permissions } });
  } catch (error) {
    res.status(500).json({ message: "Server error while updating user." });
  }
});

app.delete("/api/users/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.role === ROLES.ADMIN) return res.status(403).json({ message: "Cannot delete admin account." });
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error while deleting user." });
  }
});

app.post("/api/documents/upload", authenticateToken, requireFaculty, upload.single("file"), async (req, res) => {
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
    const docData = buildIndexedDocument(
      finalTitle, extractedText, fileUrl, req.file.mimetype || "",
      req.user.email, req.user.role, category, docDate, year || "", semester || "",
      docBranch || "", paperType || "", officialDocType || "", session || "",
      req.file.filename, docDepartment, extractionResult.pageTexts || [],
      extractionResult.ocrConfidence || 0, extractionResult.ocrApplied || false,
      extractionResult.isScanned || false, docStatus
    );
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
});

app.get("/api/documents/drafts", authenticateToken, requireFaculty, async (req, res) => {
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
});

app.get("/api/documents/pending-approval", authenticateToken, requireFaculty, async (req, res) => {
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
});

app.post("/api/documents/:id/approve", authenticateToken, requireFaculty, async (req, res) => {
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
});

app.post("/api/documents/:id/reject", authenticateToken, requireFaculty, async (req, res) => {
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
});

app.post("/api/documents/publish/:id", authenticateToken, requireFaculty, async (req, res) => {
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
});

app.delete("/api/documents/draft/:id", authenticateToken, requireFaculty, async (req, res) => {
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
      const filePath = path.join(uploadDir, doc.storageName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await Chunk.deleteMany({ documentId: doc._id });
    await Document.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Draft deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error while deleting draft." });
  }
});

app.get("/api/documents/draft/:id", authenticateToken, requireFaculty, async (req, res) => {
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
});

app.put("/api/documents/draft/:id", authenticateToken, requireFaculty, async (req, res) => {
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
});

app.get("/api/documents/search", authenticateToken, async (req, res) => {
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

    const resultLimit = parseInt(limit) || SEARCH_RESULTS_LIMIT;

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
});

app.get("/api/documents/debug", authenticateToken, requireAdmin, async (req, res) => {
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
});

app.get("/api/documents/:id", authenticateToken, async (req, res) => {
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
});

app.put("/api/documents/:id", authenticateToken, requireFaculty, async (req, res) => {
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
});

app.delete("/api/documents/:id", authenticateToken, requireFaculty, async (req, res) => {
  try {
    if (!canManageDocuments(req.user)) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions." });
    }
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found." });
    if (!isCollegeWideRole(req.user) && doc.department !== req.user.department) {
      return res.status(403).json({ message: "Access denied. You can only delete documents from your department." });
    }
    if (doc.storageName) {
      const filePath = path.join(uploadDir, doc.storageName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await Chunk.deleteMany({ documentId: doc._id });
    await Document.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Resource removed successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error while deleting document." });
  }
});

app.post("/api/history", authenticateToken, async (req, res) => {
  try {
    const { title, documentId, chunkId } = req.body;
    if (!title) return res.status(400).json({ message: "Missing history details." });
    const newHistory = new History({ email: req.user.email, title, documentId, chunkId });
    await newHistory.save();
    res.status(201).json({ message: "History logged successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error while saving history." });
  }
});

app.get("/api/history/:email", authenticateToken, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    if (req.user.email !== email) return res.status(403).json({ message: "Unauthorized action." });
    const logs = await History.find({ email }).sort({ timestamp: -1 });
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: "Server error while loading history." });
  }
});

app.delete("/api/history/:email", authenticateToken, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    if (req.user.email !== email) return res.status(403).json({ message: "Unauthorized action." });
    await History.deleteMany({ email });
    res.status(200).json({ message: "History cleared successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error while clearing history." });
  }
});

app.post("/api/chat", authenticateToken, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ message: "Question is required." });
    const queryEmbedding = await generateEmbedding(question);
    let context = '';
    let sources = [];
    if (queryEmbedding && queryEmbedding.length > 0) {
      const chunks = await Chunk.find().limit(100);
      const scored = chunks.map(chunk => ({ chunk, similarity: cosineSimilarity(queryEmbedding, chunk.embedding || []) }));
      scored.sort((a, b) => b.similarity - a.similarity);
      const topChunks = scored.slice(0, 5);
      for (const sc of topChunks) {
        if (sc.similarity > 0.3) {
          context += `\n--- ${sc.chunk.metadata.title || 'Document'} ---\n${sc.chunk.text.substring(0, 1500)}\n`;
          sources.push({ title: sc.chunk.metadata.title || 'Document', chunkId: sc.chunk._id });
        }
      }
    }
    if (!context) {
      const searchResults = await fallbackSearch(question, { status: "published" });
      const topDocs = searchResults.slice(0, 3);
      for (const doc of topDocs) {
        const text = doc.extractedText || doc.textContent || '';
        context += `\n--- Document: ${doc.title} (${doc.category || 'General'}) ---\n${text.substring(0, 1500)}\n`;
        sources.push({ title: doc.title, id: doc._id });
      }
    }
    if (!context) return res.status(200).json({ answer: "I don't have information about that in the uploaded documents." });
    const answer = await generateRAGResponse(question, context);
    res.status(200).json({ answer, sources });
  } catch (error) {
    res.status(500).json({ message: "Chat error", error: error.message });
  }
});

app.post("/api/documents/reindex", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const docs = await Document.find({});
    let reindexedCount = 0;
    let chunkCount = 0;
    let errors = [];
    await Chunk.deleteMany({});
    for (const doc of docs) {
      if (doc.storageName) {
        const filePath = path.join(uploadDir, doc.storageName);
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
});

app.get("/api/status", async (req, res) => {
  const docCount = await Document.countDocuments().catch(() => 0);
  const chunkCount = await Chunk.countDocuments().catch(() => 0);
  const userCount = await User.countDocuments().catch(() => 0);
  res.json({
    status: "online",
    version: "3.1.0",
    features: {
      ocr: true,
      semanticSearch: process.env.SEMANTIC_SEARCH_ENABLED === 'true',
      vectorSearch: process.env.VECTOR_SEARCH_ENABLED === 'true',
      chunking: true,
      embeddingModel: EMBEDDING_MODEL,
      embeddingDimension: EMBEDDING_DIMENSION,
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
      chatbot: !!(genAI || openai),
      drafts: true,
      approvalWorkflow: true,
      roleBasedAccess: true,
      departmentIsolation: true,
      branchAccessControl: true,
      cseBranches: CSE_BRANCHES
    },
    roles: Object.values(ROLES),
    departments: Object.values(DEPARTMENTS),
    cseBranches: CSE_BRANCHES,
    storage: "local",
    stats: { documents: docCount, chunks: chunkCount, users: userCount }
  });
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      message: error.code === "LIMIT_FILE_SIZE" ? "File is too large. Maximum size is 50MB." : error.message
    });
  }
  res.status(500).json({ message: error.message || "Server error." });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Storage mode: local`);
  console.log(`OCR DPI: 300`);
  console.log(`AI services: ${genAI || openai ? 'Enabled' : 'Disabled'}`);
  console.log(`Embedding model: ${EMBEDDING_MODEL}`);
  console.log(`Chunk size: ${CHUNK_SIZE}, Overlap: ${CHUNK_OVERLAP}`);
  console.log(`Role-based access control: Enabled`);
  console.log(`Approval workflow: Enabled`);
  console.log(`Departments: ${Object.values(DEPARTMENTS).join(', ')}`);
  console.log(`CSE Branches: ${CSE_BRANCHES.join(', ')}`);
  console.log(`Drafts feature: Enabled`);
  console.log(`Department-based access control: Enabled`);
  const docCount = await Document.countDocuments().catch(() => 0);
  const chunkCount = await Chunk.countDocuments().catch(() => 0);
  const userCount = await User.countDocuments().catch(() => 0);
  console.log(`Existing documents: ${docCount}, chunks: ${chunkCount}, users: ${userCount}`);
});
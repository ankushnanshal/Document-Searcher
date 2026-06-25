require("dotenv").config();
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
const os = require('os');
const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static(__dirname));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/eduvault";
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const uploadDir = path.join(__dirname, "uploads", "documents");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch((err) => console.error("MongoDB connection error:", err.message));
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  avatar: { type: String, default: "" },
  role: { type: String, enum: ["student", "admin"], default: "student" },
  year: { type: String, default: "" },
  semester: { type: String, default: "" },
  branch: { type: String, default: "" }
});
const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileType: { type: String, default: "" },
  uploadedBy: { type: String, required: true },
  category: { type: String, default: "General" },
  docDate: { type: String, default: "" },
  year: { type: String, default: "" },
  semester: { type: String, default: "" },
  branch: { type: String, default: "" },
  paperType: { type: String, default: "" },
  officialDocType: { type: String, default: "" },
  storageName: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  textContent: { type: String, default: "" },
  extractedText: { type: String, default: "" },
  searchTerms: { type: [String], default: [] }
});
documentSchema.index({ title: 'text', extractedText: 'text', textContent: 'text' });
const historySchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  title: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
const User = mongoose.model("User", userSchema);
const Document = mongoose.model("Document", documentSchema);
const History = mongoose.model("History", historySchema);
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "ankushadmin@gmail.com")
  .split(",")
  .map((email) => email.toLowerCase().trim())
  .filter(Boolean);
function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(String(email || "").toLowerCase().trim());
}
function createToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid or expired token." });
  }
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admin role required." });
  }
  next();
}
function getPdfToTextPath() {
  const platform = os.platform();
  if (platform === 'win32') {
    const possiblePaths = [
      'C:\\poppler\\bin\\pdftotext.exe',
      'C:\\Program Files\\poppler\\bin\\pdftotext.exe',
      'pdftotext'
    ];
    for (const p of possiblePaths) {
      try {
        if (fs.existsSync(p) || p === 'pdftotext') return p;
      } catch (e) {}
    }
    return 'pdftotext';
  }
  return 'pdftotext';
}
function getTesseractPath() {
  const platform = os.platform();
  if (platform === 'win32') {
    const possiblePaths = [
      'C:\\Program Files\\Tesseract-OCR\\tesseract.exe',
      'C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe',
      'tesseract'
    ];
    for (const p of possiblePaths) {
      try {
        if (fs.existsSync(p) || p === 'tesseract') return p;
      } catch (e) {}
    }
    return 'tesseract';
  }
  return 'tesseract';
}
async function extractTextFromPDF(filePath) {
  try {
    const pdftotext = getPdfToTextPath();
    const { stdout, stderr } = await exec(`"${pdftotext}" "${filePath}" -`);
    if (stderr && !stderr.includes('error')) {
      console.log("PDF extraction warning:", stderr);
    }
    return stdout || '';
  } catch (error) {
    console.error("PDF extraction error:", error.message);
    try {
      const { stdout } = await exec(`python -c "import PyPDF2; pdf=open('${filePath}','rb'); reader=PyPDF2.PdfReader(pdf); print(' '.join([page.extract_text() for page in reader.pages]))"`);
      return stdout || '';
    } catch (e) {
      console.error("PyPDF2 fallback error:", e.message);
      return '';
    }
  }
}
async function extractTextFromWord(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.docx') {
      try {
        const { stdout } = await exec(`python -c "import docx; doc=docx.Document('${filePath}'); print(' '.join([p.text for p in doc.paragraphs]))"`);
        return stdout || '';
      } catch (e) {
        console.error("python-docx error:", e.message);
      }
    }
    try {
      const { stdout } = await exec(`python -c "import textract; print(textract.process('${filePath}').decode('utf-8'))"`);
      return stdout || '';
    } catch (e) {
      console.error("textract error:", e.message);
    }
    return '';
  } catch (error) {
    console.error("Word extraction error:", error.message);
    return '';
  }
}
function extractTextFromTXT(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error("TXT extraction error:", error.message);
    return '';
  }
}
function extractTextFromCSV(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    return lines.map(line => line.replace(/,/g, ' ')).join(' ');
  } catch (error) {
    console.error("CSV extraction error:", error.message);
    return '';
  }
}
function extractTextFromJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    return JSON.stringify(data).replace(/[{},:"\[\]]/g, ' ').replace(/\s+/g, ' ');
  } catch (error) {
    console.error("JSON extraction error:", error.message);
    return '';
  }
}
async function extractTextFromImage(filePath) {
  try {
    const tesseract = getTesseractPath();
    try {
      await exec(`"${tesseract}" --version`);
    } catch (e) {
      console.log("Tesseract not installed. Image OCR skipped.");
      return '';
    }
    const outputPath = path.join(__dirname, `ocr_${Date.now()}`);
    await exec(`"${tesseract}" "${filePath}" "${outputPath}"`);
    const ocrResultPath = `${outputPath}.txt`;
    if (fs.existsSync(ocrResultPath)) {
      const content = fs.readFileSync(ocrResultPath, 'utf8');
      fs.unlinkSync(ocrResultPath);
      return content;
    }
    return '';
  } catch (error) {
    console.error("Image OCR error:", error.message);
    return '';
  }
}
async function extractTextFromExcel(filePath) {
  try {
    try {
      const { stdout } = await exec(`python -c "import pandas as pd; df=pd.read_excel('${filePath}'); print(df.to_string())"`);
      return stdout || '';
    } catch (e) {
      console.error("pandas excel error:", e.message);
    }
    return '';
  } catch (error) {
    console.error("Excel extraction error:", error.message);
    return '';
  }
}
async function extractTextFromPowerPoint(filePath) {
  try {
    try {
      const { stdout } = await exec(`python -c "from pptx import Presentation; prs=Presentation('${filePath}'); text=[]; [text.append(shape.text) for slide in prs.slides for shape in slide.shapes if hasattr(shape, 'text')]; print(' '.join(text))"`);
      return stdout || '';
    } catch (e) {
      console.error("python-pptx error:", e.message);
    }
    return '';
  } catch (error) {
    console.error("PowerPoint extraction error:", error.message);
    return '';
  }
}
async function extractTextFromFile(filePath, fileType) {
  const ext = path.extname(filePath).toLowerCase();
  let extractedText = '';
  try {
    switch (ext) {
      case '.pdf':
        extractedText = await extractTextFromPDF(filePath);
        break;
      case '.doc':
      case '.docx':
        extractedText = await extractTextFromWord(filePath);
        break;
      case '.txt':
        extractedText = extractTextFromTXT(filePath);
        break;
      case '.csv':
        extractedText = extractTextFromCSV(filePath);
        break;
      case '.json':
        extractedText = extractTextFromJSON(filePath);
        break;
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif':
      case '.webp':
        extractedText = await extractTextFromImage(filePath);
        break;
      case '.xls':
      case '.xlsx':
        extractedText = await extractTextFromExcel(filePath);
        break;
      case '.ppt':
      case '.pptx':
        extractedText = await extractTextFromPowerPoint(filePath);
        break;
      default:
        extractedText = '';
    }
  } catch (error) {
    console.error(`Text extraction error for ${filePath}:`, error.message);
    return '';
  }
  if (extractedText) {
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/[^a-zA-Z0-9\s\-\.]/g, ' ')
      .trim();
  }
  return extractedText;
}
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname);
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .slice(0, 80);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: function(req, file, cb) {
    const allowedExtensions = [
      ".pdf",
      ".png",
      ".jpg",
      ".jpeg",
      ".webp",
      ".gif",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".txt",
      ".csv",
      ".json"
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error("Unsupported file type."));
    }
    cb(null, true);
  }
});
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, avatar, year, semester, branch } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing registration details." });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = isAdminEmail(normalizedEmail) ? "admin" : "student";
    const user = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      avatar: avatar || "",
      role: assignedRole,
      year: assignedRole === "student" ? year || "" : "",
      semester: assignedRole === "student" ? semester || "" : "",
      branch: assignedRole === "student" ? branch || "" : ""
    });
    await user.save();
    const token = createToken(user);
    return res.status(201).json({
      token,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      year: user.year,
      semester: user.semester,
      branch: user.branch
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Server error during signup." });
  }
});
app.post("/api/auth/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials." });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid credentials." });
    }
    const shouldBeAdmin = isAdminEmail(user.email);
    if (shouldBeAdmin && user.role !== "admin") {
      user.role = "admin";
      user.year = "";
      user.semester = "";
      user.branch = "";
      await user.save();
    }
    if (!shouldBeAdmin && user.role === "admin") {
      user.role = "student";
      await user.save();
    }
    const token = createToken(user);
    return res.status(200).json({
      token,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      year: user.year,
      semester: user.semester,
      branch: user.branch
    });
  } catch (error) {
    console.error("Signin error:", error);
    return res.status(500).json({ message: "Server error during signin." });
  }
});
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.status(200).json({
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      year: user.year,
      semester: user.semester,
      branch: user.branch
    });
  } catch (error) {
    console.error("Me error:", error);
    return res.status(500).json({ message: "Server error while loading user." });
  }
});
app.put("/api/auth/update-avatar", authenticateToken, async (req, res) => {
  try {
    const { email, avatar } = req.body;
    const normalizedEmail = String(email || "").toLowerCase().trim();
    if (req.user.email !== normalizedEmail) {
      return res.status(403).json({ message: "Unauthorized action." });
    }
    const user = await User.findOneAndUpdate(
      { email: req.user.email },
      { avatar: avatar || "" },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.status(200).json({
      message: "Avatar updated successfully.",
      avatar: user.avatar
    });
  } catch (error) {
    console.error("Avatar update error:", error);
    return res.status(500).json({ message: "Server error while updating avatar." });
  }
});
app.post("/api/documents/upload", authenticateToken, requireAdmin, upload.single("file"), async (req, res) => {
  try {
    const { title, category, docDate, year, semester, branch, paperType, officialDocType } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }
    const finalTitle = title || req.file.originalname;
    if (!finalTitle.trim()) {
      return res.status(400).json({ message: "Missing title data." });
    }
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/documents/${req.file.filename}`;
    const filePath = req.file.path;
    const extractedText = await extractTextFromFile(filePath, req.file.mimetype);
    const searchTerms = extractedText 
      ? extractedText.split(/\s+/).filter(word => word.length > 2).slice(0, 1000)
      : [];
    const textContent = `${finalTitle} ${extractedText}`.trim();
    const newDoc = new Document({
      title: finalTitle,
      fileUrl,
      fileType: req.file.mimetype || "",
      uploadedBy: req.user.email,
      category: category || "General",
      docDate: docDate || "",
      year: year || "",
      semester: semester || "",
      branch: branch || "",
      paperType: paperType || "",
      officialDocType: officialDocType || "",
      storageName: req.file.filename,
      textContent: textContent,
      extractedText: extractedText,
      searchTerms: searchTerms
    });
    await newDoc.save();
    return res.status(201).json({
      message: "Document uploaded and indexed successfully.",
      id: newDoc._id,
      fileUrl,
      extractedTextLength: extractedText.length
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Upload error:", error);
    return res.status(500).json({
      message: error.message || "Server error while uploading document."
    });
  }
});
app.get("/api/documents/search", authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    let docs = [];
    if (!query || query.trim() === '') {
      docs = await Document.find().sort({ createdAt: -1 }).limit(100);
      return res.status(200).json(docs);
    }
    const searchTerm = query.trim();
    const searchWords = searchTerm.split(/\s+/).filter(w => w.length > 2);
    const searchRegex = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordRegexes = searchWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    try {
      const textResults = await Document.find(
        { $text: { $search: searchTerm } },
        { score: { $meta: "textScore" } }
      ).sort({ score: { $meta: "textScore" } }).limit(50);
      const textIds = textResults.map(d => d._id.toString());
      const orConditions = [
        { title: { $regex: searchRegex, $options: "i" } },
        { extractedText: { $regex: searchRegex, $options: "i" } },
        { textContent: { $regex: searchRegex, $options: "i" } }
      ];
      if (wordRegexes.length > 1) {
        const wordConditions = wordRegexes.map(w => ({
          title: { $regex: w, $options: "i" }
        }));
        orConditions.push({ $and: wordConditions.map(w => ({ title: { $regex: w, $options: "i" } })) });
      }
      const regexResults = await Document.find({
        $and: [
          { _id: { $nin: textIds } },
          { $or: orConditions }
        ]
      }).sort({ createdAt: -1 }).limit(50);
      const combined = [...textResults, ...regexResults];
      const uniqueDocs = [];
      const seen = new Set();
      for (const doc of combined) {
        const id = doc._id.toString();
        if (!seen.has(id)) {
          seen.add(id);
          uniqueDocs.push(doc);
        }
      }
      docs = uniqueDocs;
    } catch (textError) {
      console.error("Text search error, using regex only:", textError.message);
      const orConditions = [
        { title: { $regex: searchRegex, $options: "i" } },
        { extractedText: { $regex: searchRegex, $options: "i" } },
        { textContent: { $regex: searchRegex, $options: "i" } }
      ];
      if (wordRegexes.length > 1) {
        const wordConditions = wordRegexes.map(w => ({
          title: { $regex: w, $options: "i" }
        }));
        orConditions.push({ $and: wordConditions });
      }
      docs = await Document.find({
        $or: orConditions
      }).sort({ createdAt: -1 }).limit(100);
    }
    if (docs.length === 0 && searchWords.length > 0) {
      const wordOrConditions = searchWords.map(w => ({
        title: { $regex: w, $options: "i" }
      }));
      docs = await Document.find({
        $or: wordOrConditions
      }).sort({ createdAt: -1 }).limit(50);
    }
    return res.status(200).json(docs);
  } catch (error) {
    console.error("Search endpoint error:", error);
    try {
      const fallback = await Document.find({
        title: { $regex: req.query.query || '', $options: "i" }
      }).sort({ createdAt: -1 }).limit(50);
      return res.status(200).json(fallback);
    } catch (fallbackError) {
      return res.status(500).json({ message: "Search failed", error: error.message });
    }
  }
});
app.get("/api/documents/:id", authenticateToken, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: "Document not found." });
    }
    return res.status(200).json(doc);
  } catch (error) {
    console.error("Get document error:", error);
    return res.status(500).json({ message: "Server error while fetching document." });
  }
});
app.put("/api/documents/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, category, docDate, year, semester, branch, paperType, officialDocType } = req.body;
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: "Document not found." });
    }
    if (title !== undefined) doc.title = title;
    if (category !== undefined) doc.category = category;
    if (docDate !== undefined) doc.docDate = docDate;
    if (year !== undefined) doc.year = year;
    if (semester !== undefined) doc.semester = semester;
    if (branch !== undefined) doc.branch = branch;
    if (paperType !== undefined) doc.paperType = paperType;
    if (officialDocType !== undefined) doc.officialDocType = officialDocType;
    doc.textContent = `${doc.title} ${doc.extractedText || ''}`.trim();
    await doc.save();
    return res.status(200).json({
      message: "Document updated successfully.",
      doc
    });
  } catch (error) {
    console.error("Update document error:", error);
    return res.status(500).json({ message: "Server error while updating document." });
  }
});
app.delete("/api/documents/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: "Document not found." });
    }
    if (doc.storageName) {
      const filePath = path.join(uploadDir, doc.storageName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    await Document.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: "Resource removed successfully." });
  } catch (error) {
    console.error("Delete document error:", error);
    return res.status(500).json({ message: "Server error while deleting document." });
  }
});
app.post("/api/history", authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ message: "Missing history details." });
    }
    const newHistory = new History({
      email: req.user.email,
      title
    });
    await newHistory.save();
    return res.status(201).json({ message: "History logged successfully." });
  } catch (error) {
    console.error("History save error:", error);
    return res.status(500).json({ message: "Server error while saving history." });
  }
});
app.get("/api/history/:email", authenticateToken, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    if (req.user.email !== email) {
      return res.status(403).json({ message: "Unauthorized action." });
    }
    const logs = await History.find({ email }).sort({ timestamp: -1 });
    return res.status(200).json(logs);
  } catch (error) {
    console.error("History fetch error:", error);
    return res.status(500).json({ message: "Server error while loading history." });
  }
});
app.delete("/api/history/:email", authenticateToken, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    if (req.user.email !== email) {
      return res.status(403).json({ message: "Unauthorized action." });
    }
    await History.deleteMany({ email });
    return res.status(200).json({ message: "History cleared successfully." });
  } catch (error) {
    console.error("History clear error:", error);
    return res.status(500).json({ message: "Server error while clearing history." });
  }
});
app.post("/api/documents/reindex", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const docs = await Document.find({});
    let reindexedCount = 0;
    for (const doc of docs) {
      if (doc.storageName) {
        const filePath = path.join(uploadDir, doc.storageName);
        if (fs.existsSync(filePath)) {
          const extractedText = await extractTextFromFile(filePath, doc.fileType);
          if (extractedText) {
            doc.extractedText = extractedText;
            doc.textContent = `${doc.title} ${extractedText}`.trim();
            doc.searchTerms = extractedText.split(/\s+/).filter(word => word.length > 2).slice(0, 1000);
            await doc.save();
            reindexedCount++;
          }
        }
      }
    }
    return res.status(200).json({
      message: `Re-indexed ${reindexedCount} documents successfully.`,
      total: docs.length,
      reindexed: reindexedCount
    });
  } catch (error) {
    console.error("Re-index error:", error);
    return res.status(500).json({ message: "Server error during re-indexing." });
  }
});
app.get("/api/documents/debug", authenticateToken, async (req, res) => {
  try {
    const total = await Document.countDocuments();
    const sample = await Document.find().limit(5);
    const indexes = await Document.collection.indexes();
    return res.json({
      totalDocuments: total,
      sample: sample.map(d => ({ 
        title: d.title, 
        hasExtractedText: !!d.extractedText,
        extractedTextLength: d.extractedText ? d.extractedText.length : 0,
        category: d.category,
        textContentLength: d.textContent ? d.textContent.length : 0
      })),
      indexes: indexes.map(i => ({ 
        name: i.name, 
        key: i.key,
        isTextIndex: i.textIndexVersion ? true : false
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File is too large. Maximum size is 50MB." });
    }
    return res.status(400).json({ message: error.message });
  }
  return res.status(500).json({
    message: error.message || "Server error."
  });
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
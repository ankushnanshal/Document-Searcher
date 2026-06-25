require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
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
  createdAt: { type: Date, default: Date.now }
});

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

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname);
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
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
      storageName: req.file.filename
    });

    await newDoc.save();

    return res.status(201).json({
      message: "Document uploaded successfully.",
      id: newDoc._id,
      fileUrl
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

app.get("/api/documents", authenticateToken, async (req, res) => {
  try {
    const search = String(req.query.search || "");
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const queryFilter = {};

    if (search) {
      queryFilter.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { branch: { $regex: search, $options: "i" } },
        { semester: { $regex: search, $options: "i" } },
        { paperType: { $regex: search, $options: "i" } },
        { officialDocType: { $regex: search, $options: "i" } }
      ];
    }

    const totalDocs = await Document.countDocuments(queryFilter);

    const docs = await Document.find(queryFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      docs,
      totalDocs,
      hasMore: skip + docs.length < totalDocs
    });
  } catch (error) {
    console.error("Fetch documents error:", error);
    return res.status(500).json({ message: "Server error while loading documents." });
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
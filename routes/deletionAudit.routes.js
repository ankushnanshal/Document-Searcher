const express = require("express");
const router = express.Router();
const { authenticateToken, requireCollegeWideAccess } = require("../middleware/auth");
const { getDeletionAudit } = require("../controllers/deletionController");

router.get("/", authenticateToken, requireCollegeWideAccess, getDeletionAudit);

module.exports = router;
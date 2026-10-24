const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { signup, signin, getMe, updateAvatar } = require("../controllers/authController");

router.post("/signup", signup);
router.post("/signin", signin);
router.get("/me", authenticateToken, getMe);
router.put("/update-avatar", authenticateToken, updateAvatar);

module.exports = router;
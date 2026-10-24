const express = require("express");
const router = express.Router();
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const { getUsers, getUserById, updateUser, deleteUser } = require("../controllers/userController");

router.get("/", authenticateToken, requireAdmin, getUsers);
router.get("/:id", authenticateToken, requireAdmin, getUserById);
router.put("/:id", authenticateToken, requireAdmin, updateUser);
router.delete("/:id", authenticateToken, requireAdmin, deleteUser);

module.exports = router;
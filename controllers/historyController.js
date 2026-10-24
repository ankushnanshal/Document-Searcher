const { History } = require("../models/History");

async function addHistory(req, res) {
  try {
    const { title, documentId, chunkId } = req.body;
    if (!title) return res.status(400).json({ message: "Missing history details." });
    const newHistory = new History({ email: req.user.email, title, documentId, chunkId });
    await newHistory.save();
    res.status(201).json({ message: "History logged successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error while saving history." });
  }
}

async function getHistory(req, res) {
  try {
    const email = req.params.email.toLowerCase().trim();
    if (req.user.email !== email) return res.status(403).json({ message: "Unauthorized action." });
    const logs = await History.find({ email }).sort({ timestamp: -1 });
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: "Server error while loading history." });
  }
}

async function clearHistory(req, res) {
  try {
    const email = req.params.email.toLowerCase().trim();
    if (req.user.email !== email) return res.status(403).json({ message: "Unauthorized action." });
    await History.deleteMany({ email });
    res.status(200).json({ message: "History cleared successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error while clearing history." });
  }
}

module.exports = { addHistory, getHistory, clearHistory };
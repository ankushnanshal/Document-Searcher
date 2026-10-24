const { Chunk } = require("../models/Chunk");
const { generateEmbedding, generateRAGResponse } = require("../utils/aiUtils");
const { cosineSimilarity } = require("../utils/textUtils");
const { fallbackSearch } = require("../services/searchService");

async function chat(req, res) {
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
}

module.exports = { chat };
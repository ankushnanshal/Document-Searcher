const env = require("../config/env");

async function generateEmbedding(text) {
  if (!text || text.length < 5) return [];
  try {
    const cleanText = text.substring(0, 2000).trim();
    if (env.genAI) {
      const model = env.genAI.getGenerativeModel({ model: "embedding-001" });
      const result = await model.embedContent(cleanText);
      if (result && result.embedding && result.embedding.values) {
        return result.embedding.values;
      }
      return [];
    }
    if (env.openai) {
      const response = await env.openai.embeddings.create({
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

async function generateRAGResponse(query, context) {
  try {
    if (env.genAI) {
      const model = env.genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `You are a college document assistant. Answer the user's question based ONLY on the following document excerpts. If the answer is not found in the excerpts, say "I don't have information about that in the uploaded documents." Do not make up information.\n\nDocument excerpts:\n${context}\n\nUser question: ${query}\n\nAnswer:`;
      const result = await model.generateContent(prompt);
      return result.response.text();
    }
    if (env.openai) {
      const response = await env.openai.chat.completions.create({
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

module.exports = { generateEmbedding, generateRAGResponse };
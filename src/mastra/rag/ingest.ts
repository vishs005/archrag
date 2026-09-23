import fs from "fs";
import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";
import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import "dotenv/config";
import { Pinecone } from "@pinecone-database/pinecone";

// 1. Read our architecture document
const text = fs.readFileSync(
  "knowledge/event-driven-architecture.md",
  "utf-8"
);

const cleanedText = text.replace(/^---[\s\S]*?---\s*/, "");
const doc = MDocument.fromText(cleanedText);
const chunks = await doc.chunk({
  strategy: "recursive",
  maxSize: 512,
  overlap: 50,
});

chunks.forEach((chunk) => {
  chunk.metadata = {
    source: "event-driven-architecture.md",
    title: "Event-Driven Architecture Style",
    category: "architecture",
    sourceUrl:
      "https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven",
  };
});

const { embeddings } = await embedMany({
  model: new ModelRouterEmbeddingModel(
    "openai/text-embedding-3-small"
  ),
  values: chunks.map((chunk) => chunk.text),
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const index = pinecone.index("archrag");
const records = chunks.map((chunk, i) => ({
  id: chunk.id_,
  values: embeddings[i],
  metadata: {
    text: chunk.text,
    ...chunk.metadata,
  },
}));

await index.upsert({
  records,
});
console.log(`Uploaded ${records.length} records to Pinecone`);
console.log(
  "Pinecone key loaded:",
  !!process.env.PINECONE_API_KEY
);
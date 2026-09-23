import "dotenv/config";
import { embed, generateText } from "ai";
import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import { Pinecone } from "@pinecone-database/pinecone";
import { openai } from "@ai-sdk/openai";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const index = pinecone.index("archrag");
export async function askArchRAG(question: string) {
  // question embedding
  const { embedding } = await embed({
    model: new ModelRouterEmbeddingModel(
      "openai/text-embedding-3-small"
    ),
    value: question,
  });

  // Pinecone search
  const results = await index.query({
    vector: embedding,
    topK: 5,
    includeMetadata: true,
  });

  // Build context
  const context = results.matches
    .map((match) => match.metadata?.text)
    .filter(Boolean)
    .join("\n\n---\n\n");

  // Generate grounded answer
  const { text: answer } = await generateText({
    model: openai("gpt-5-mini"),
    prompt: `
You are an architecture assistant.

Answer the question using only the provided context.

If the context does not contain enough information to answer,
say "I don't know based on the available documentation."

Question:
${question}

Context:
${context}
`,
  });
  const sources = Array.from(
  new Map(
    results.matches.map((match) => [
      match.metadata?.sourceUrl,
      {
        title: match.metadata?.title,
        url: match.metadata?.sourceUrl,
      },
    ])
  ).values()
);

const retrieval = results.matches.map((match) => ({
  score: match.score,
  text: match.metadata?.text,
  source: match.metadata?.title,
}));

  return {
  answer,
  sources,
  retrieval,
};
}



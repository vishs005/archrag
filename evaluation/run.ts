import fs from "fs";
import { askArchRAG } from "../src/mastra/rag/retrieve";

type EvaluationQuestion = {
  id: number;
  question: string;
  expected: "answerable" | "unanswerable";
};

const questions: EvaluationQuestion[] = JSON.parse(
  fs.readFileSync("evaluation/questions.json", "utf-8")
);

const results = [];

for (const item of questions) {
  console.log(`Running question ${item.id}/15...`);

  const result = await askArchRAG(item.question);

  const topScore = result.retrieval[0]?.score ?? 0;

  results.push({
    id: item.id,
    question: item.question,
    expected: item.expected,
    topScore,
    answer: result.answer,
    sources: result.sources,
    retrieval: result.retrieval,
  });
}

fs.writeFileSync(
  "evaluation/results.json",
  JSON.stringify(results, null, 2)
);

console.log("\nEvaluation complete.");
console.log("Results saved to evaluation/results.json");
# 🏗️ ArchRAG — Architecture Decision Assistant

ArchRAG is an open-source Retrieval-Augmented Generation (RAG) assistant that helps engineers find and understand architecture guidance from technical documentation.

Instead of relying on an LLM's general knowledge, ArchRAG retrieves relevant sections from a curated architecture knowledge base and generates answers grounded in those documents, with source citations and retrieval details.

🌐 **Live Demo:** https://archrag-vish.streamlit.app/

## 🎯 Problem

Engineering teams accumulate architecture guidance across documentation, ADRs, standards, design documents, and knowledge bases.

As the documentation grows, answering seemingly simple questions becomes difficult:

* What architecture pattern should we use?
* What did the documentation say about this approach?
* Why was a particular architecture chosen?
* What are the trade-offs?
* Where is the supporting documentation?

Traditional keyword search can struggle when the user's terminology doesn't exactly match the documentation.

ArchRAG explores how RAG can provide a semantic search and question-answering layer over engineering documentation while keeping answers grounded in the underlying sources.

## 💡 Use Case

ArchRAG helps software engineers answer technical architecture questions from a curated collection of architecture documentation through a conversational interface.

The initial knowledge base contains Microsoft Azure Architecture Center documentation about event-driven architecture.

Example questions include:

* What are the main components of an event-driven architecture?
* What is the role of an event producer?
* What are the two primary event-driven architecture topologies?
* What are the benefits of event-driven architecture?
* When is event-driven architecture a good choice?
* Can event-driven architecture be combined with other architecture styles?

If the available documentation does not contain enough information to answer a question, ArchRAG is instructed to say:

> I don't know based on the available documentation.

## 🏗️ Architecture

The application consists of two primary pipelines.

### Ingestion Pipeline

```text
Architecture Documentation
          ↓
      Load Document
          ↓
     Clean Content
          ↓
        Chunk
   512 chars / 50 overlap
          ↓
 OpenAI Embeddings
 text-embedding-3-small
          ↓
       Pinecone
    Vector Database
```

### Query Pipeline

```text
User Question
      ↓
Streamlit UI
      ↓
Mastra /ask API
      ↓
Question Embedding
      ↓
Pinecone Vector Search
      ↓
Retrieve Top 5 Chunks
      ↓
Question + Retrieved Context
      ↓
GPT-5-mini
      ↓
Grounded Answer
      ↓
Sources + Retrieval Details
```

## 🧰 Technology Stack

| Component        | Technology                          |
| ---------------- | ----------------------------------- |
| RAG framework    | Mastra                              |
| Language         | TypeScript                          |
| Embeddings       | OpenAI `text-embedding-3-small`     |
| Vector database  | Pinecone                            |
| Generation model | GPT-5-mini                          |
| Backend          | Mastra API                          |
| Backend hosting  | Render                              |
| UI               | Streamlit                           |
| UI hosting       | Streamlit Community Cloud           |
| Source corpus    | Microsoft Azure Architecture Center |

## 📚 Knowledge Base

The initial version uses the Microsoft Azure Architecture Center's **Event-Driven Architecture Style** documentation.

During ingestion, ArchRAG:

1. Loads the Markdown document.
2. Removes YAML front matter.
3. Splits the document using recursive chunking.
4. Adds metadata to each chunk.
5. Generates an embedding for every chunk.
6. Stores the vectors and metadata in Pinecone.

Metadata includes:

```text
source
title
category
sourceUrl
```

This metadata allows retrieved evidence to be connected back to its original documentation.

## ✂️ Chunking Strategy

The current configuration uses:

```text
Strategy: Recursive
Chunk size: 512
Overlap: 50
```

Overlap helps preserve context when an important concept crosses a chunk boundary.

The initial document produces approximately 52 chunks.

## 🔎 Retrieval

When a user submits a question:

1. The question is converted into an embedding using the same embedding model used during ingestion.
2. Pinecone performs cosine-similarity vector search.
3. The five most relevant chunks are retrieved.
4. Their text is combined into the context supplied to the LLM.

Current configuration:

```text
Embedding model: text-embedding-3-small
Dimensions: 1536
Similarity: cosine
topK: 5
```

## 🧠 Grounded Generation

The retrieved chunks are provided to GPT-5-mini along with instructions to answer only from the supplied context.

The generation prompt also instructs the model to respond with:

> I don't know based on the available documentation.

when the retrieved context does not contain sufficient evidence.

This separates four important RAG concepts:

```text
Retrieval    → Find the evidence
Grounding    → Answer using the evidence
Citation     → Show where the evidence came from
Observability → Inspect what happened internally
```

## 🔍 Retrieval Observability

ArchRAG exposes retrieval details in the UI.

For each retrieved chunk, users can inspect:

* similarity score
* source
* retrieved text

This makes it possible to investigate whether an incorrect answer was caused by generation or by poor retrieval.

## 🧪 Evaluation

ArchRAG was evaluated using a small 15-question test set.

The evaluation contains:

```text
10 questions answerable from the documentation
5 deliberately out-of-scope questions
```

The out-of-scope questions test whether the assistant correctly refuses to answer when supporting evidence isn't available.

### Baseline

The initial configuration retrieved:

```text
topK = 3
```

Expected behavior was observed for:

```text
13 / 15 questions
86.7%
```

Two answerable questions failed because the necessary evidence was outside the top three retrieved chunks.

### Retrieval Improvement

Rather than changing the model or prompt, the retrieval results were inspected.

The analysis showed that relevant supporting evidence existed in Pinecone but wasn't included in the context sent to the LLM.

Retrieval depth was therefore changed from:

```text
topK = 3
```

to:

```text
topK = 5
```

The same 15-question evaluation was then rerun.

Result:

```text
15 / 15 questions produced the expected behavior
```

All ten answerable questions received grounded answers, while all five out-of-scope questions continued to trigger the fallback response.

This experiment demonstrates an important RAG principle:

> Improving retrieval can sometimes improve answer quality without changing the LLM.

The result should not be interpreted as 100% general accuracy; it represents performance on this small project-specific evaluation set.

## 🚀 Running Locally

### Prerequisites

* Node.js
* npm
* Python
* OpenAI API key
* Pinecone API key

Clone the repository and install dependencies:

```bash
npm install
```

Create a `.env` file:

```text
OPENAI_API_KEY=your-key
PINECONE_API_KEY=your-key
```

Ingest the knowledge base:

```bash
npx tsx src/mastra/rag/ingest.ts
```

Start the Mastra backend:

```bash
npm run dev
```

The API will be available locally at:

```text
http://localhost:4111/ask
```

Run the Streamlit application:

```bash
cd streamlit
pip install -r requirements.txt
streamlit run app.py
```

## 🧪 Running the Evaluation

From the project root:

```bash
npx tsx evaluation/run.ts
```

The evaluation results are written to:

```text
evaluation/results.json
```

These results include the generated answer, retrieved chunks, similarity scores, sources, and expected behavior for each question.

## ⚠️ Current Limitations

ArchRAG is intentionally a small first implementation.

Current limitations include:

* The knowledge base currently contains only one architecture document.
* Retrieval currently uses dense semantic vector search only.
* There is no BM25/keyword retrieval.
* There is no reranking stage.
* The evaluation dataset contains only 15 questions.
* No metadata-based version filtering is currently performed.
* Similarity thresholds have not been calibrated against a larger evaluation dataset.
* Chunk boundaries can still separate related information.
* Retrieved sources may still be displayed even when the assistant returns the fallback response.

## 🔮 Future Improvements

Future versions could add:

* Multiple architecture documents
* Architecture Decision Records (ADRs)
* Hybrid retrieval using dense vectors + BM25
* Reranking
* Query rewriting
* Metadata filtering
* Document versioning
* Larger automated evaluation datasets
* Retrieval and generation metrics
* Authentication and document-level access control
* Conflict detection between architecture decisions

A particularly useful extension would be **architecture conflict detection**.

For example, if an older document recommends synchronous REST communication while a newer architecture decision recommends asynchronous events, ArchRAG could retrieve both decisions, compare their metadata and dates, and explain that the guidance has changed.

## 📁 Project Structure

```text
archrag/
├── knowledge/
│   └── event-driven-architecture.md
│
├── evaluation/
│   ├── questions.json
│   ├── results.json
│   └── run.ts
│
├── src/
│   └── mastra/
│       ├── rag/
│       │   ├── ingest.ts
│       │   └── retrieve.ts
│       └── index.ts
│
├── streamlit/
│   ├── app.py
│   └── requirements.txt
│
├── package.json
└── README.md
```

## 🎓 Key Learnings

Building ArchRAG reinforced several lessons about production-oriented RAG systems:

**Retrieval quality matters as much as generation quality.**

A capable LLM cannot answer from evidence it never receives.

**Chunking and retrieval configuration are connected.**

Chunk size, overlap, embedding model, and retrieval depth influence what context ultimately reaches the model.

**Evaluation should drive optimization.**

The change from `topK=3` to `topK=5` came from examining retrieval failures rather than arbitrarily changing parameters.

**Fallback behavior matters.**

A useful RAG system should be able to recognize when its knowledge base does not contain sufficient information.

**Observability makes RAG debugging possible.**

Looking at retrieved chunks and similarity scores helps distinguish retrieval failures from generation failures.

## 🌐 Live Demo

Try ArchRAG:

https://archrag-vish.streamlit.app/

---

Built as part of an exploration of Retrieval-Augmented Generation, context engineering, vector search, grounding, evaluation, and AI application architecture.

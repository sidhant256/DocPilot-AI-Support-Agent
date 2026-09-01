# DocPilot — AI Support Agent

An AI-powered support assistant that answers questions from a knowledge base and can take real actions — looking up orders and creating support tickets — instead of just chatting.

## What it does

DocPilot combines retrieval-augmented generation (RAG) with an agentic workflow:
- Answers are grounded in a document knowledge base, not just the model's training data.
- The agent decides for itself whether a question needs a tool call (order lookup, ticket creation) or can be answered from docs alone.
- If nothing relevant is found, it says so instead of guessing.

## Architecture
User question
|
v
[ retrieve ] --> pgvector similarity search over locally-embedded docs
|
v
[ decide ] --> does this need a tool, or is context enough?
|
+--> [ callTool ] --> lookup_order / create_support_ticket
|
v
[ respond ] --> packages retrieved context + tool result
|
v
API route (Next.js) --> streamText (AI SDK + Groq) --> streamed answer in the UI


The retrieval/decision/tool-calling logic is orchestrated with **LangGraph**, as an explicit graph of nodes and edges. Final answer generation is handled separately by the **AI SDK**, streamed directly to the browser — keeping orchestration and generation cleanly decoupled.

## Tech stack

- **Frontend**: Next.js, React, AI SDK (`useChat`, streaming)
- **Agent orchestration**: LangGraph (nodes, conditional edges), LangChain
- **LLM**: Groq (`openai/gpt-oss-120b`)
- **Retrieval**: pgvector (Postgres) + local embeddings via Ollama (`nomic-embed-text`)
- **Tools**: order lookup, support ticket creation

## Running locally

1. Start Postgres with pgvector:
```bash
   docker compose up -d
```
2. Pull the embedding model:
```bash
   ollama pull nomic-embed-text
```
3. Copy `.env.local.example` to `.env.local` and add your Groq API key.
4. Ingest the sample documents:
```bash
   npx tsx scripts/ingest.ts
```
5. Run the app:
```bash
   npm run dev
```

## What I'd improve next

- Replace the regex-based `decide` node with an LLM call for more flexible intent detection.
- Add real document ingestion (PDFs, Markdown files) instead of hardcoded sample docs.
- Persist chat history per user session.
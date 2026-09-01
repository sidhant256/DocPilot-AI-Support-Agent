import { Pool } from "pg";

const OLLAMA_URL = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
const EMBED_MODEL = "nomic-embed-text";

export interface RetrievedChunk {
  content: string;
  source: string;
  similarity: number;
}

export async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });

  if (!res.ok) {
    throw new Error(`Ollama embedding request failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { embedding: number[] };
  return data.embedding;
}

export async function retrieveRelevantChunks(
  pool: Pool,
  query: string,
  topK = 3
): Promise<RetrievedChunk[]> {
  const queryVector = await embedQuery(query);
//   console.log(`Embedded query into a ${queryVector.length}-dim vector.`);

  const vectorLiteral = `[${queryVector.join(",")}]`;

  const sql = `SELECT
       content,
       metadata->>'source' AS source,
       1 - (embedding <=> $1::vector) AS similarity
     FROM documents
     ORDER BY embedding <=> $1::vector
     LIMIT $2`;

  const result = await pool.query(sql, [vectorLiteral, topK]);
//   console.log(`Raw SQL result: ${result.rowCount} row(s).`);

  return result.rows.map((row) => ({
    content: row.content,
    source: row.source,
    similarity: row.similarity,
  }));
}
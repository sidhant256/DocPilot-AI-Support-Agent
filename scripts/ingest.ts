import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: ".env.local" });

const OLLAMA_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const EMBED_MODEL = "nomic-embed-text";

const sampleDocs = [
  {
    source: "shipping-policy.md",
    content:
      "Standard shipping takes 5-7 business days within the country. " +
      "Express shipping takes 1-2 business days and costs an additional $15. " +
      "We do not currently ship internationally.",
  },
  {
    source: "return-policy.md",
    content:
      "Items can be returned within 30 days of delivery for a full refund. " +
      "The item must be unused and in its original packaging. " +
      "To start a return, contact support with your order ID.",
  },
  {
    source: "account-help.md",
    content:
      "To reset your password, click 'Forgot password' on the login page " +
      "and follow the emailed link. Password reset links expire after 1 hour. " +
      "If you don't receive the email, check your spam folder first.",
  },
  {
    source: "order-status.md",
    content:
      "You can check your order status by logging into your account and " +
      "visiting the 'My Orders' page. Orders show as Processing, Shipped, " +
      "or Delivered. Tracking numbers appear once an order ships.",
  },
];

function chunkText(text: string, maxChars = 300): string[] {
  const sentences = text.split(/(?<=[.])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current.trim().length > 0) chunks.push(current.trim());
  return chunks;
}

async function embed(text: string): Promise<number[]> {
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

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log("Clearing existing documents...");
  await pool.query("DELETE FROM documents");

  let totalChunks = 0;

  for (const doc of sampleDocs) {
    const chunks = chunkText(doc.content);
    console.log(`\n${doc.source}: ${chunks.length} chunk(s)`);

    for (const chunk of chunks) {
      const vector = await embed(chunk);
      const vectorLiteral = `[${vector.join(",")}]`;

      await pool.query(
        `INSERT INTO documents (content, metadata, embedding) VALUES ($1, $2, $3)`,
        [chunk, JSON.stringify({ source: doc.source }), vectorLiteral]
      );

      totalChunks++;
      console.log(`  embedded chunk (${vector.length} dims): "${chunk.slice(0, 60)}..."`);
    }
  }

  console.log(`\nDone. Inserted ${totalChunks} chunks into pgvector.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
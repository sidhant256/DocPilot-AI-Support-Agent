import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Pool } from "pg";
import { retrieveRelevantChunks } from "../lib/retrieve";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log("Connecting to:", process.env.DATABASE_URL);
  const plainCheck = await pool.query("SELECT id, content FROM documents");
  console.log(`Plain query (no vector) found ${plainCheck.rows.length} row(s).
`);

  const question = process.argv[2] ?? "How long does shipping take?";
  console.log(`Question: "${question}"\n`);

  try {
    const chunks = await retrieveRelevantChunks(pool, question);
    console.log(`Got ${chunks.length} chunk(s) back.\n`);

    chunks.forEach((chunk, i) => {
      console.log(`${i + 1}. [${chunk.source}] similarity=${chunk.similarity.toFixed(3)}`);
      console.log(`   "${chunk.content}"\n`);
    });
  } catch (err) {
    console.error("Query threw an error:", err);
  }

  await pool.end();
}
main().catch((err) => {
  console.error("Retrieval test failed:", err);
  process.exit(1);
});

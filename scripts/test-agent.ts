import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Pool } from "pg";
import { buildAgent } from "../lib/agent";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const agent = buildAgent(pool);

  const questions = [
    "How long does shipping take?",
    "What's the status of order ORD-1001?",
    "I want to speak to a human about my broken item.",
  ];

  for (const question of questions) {
    console.log(`\n=== Question: "${question}" ===`);
    const result = await agent.invoke({ question });
    console.log(result.answer);
  }

  await pool.end();
}

main().catch((err) => {
  console.error("Agent test failed:", err);
  process.exit(1);
});
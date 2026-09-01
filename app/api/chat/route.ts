import { streamText, UIMessage, convertToModelMessages } from "ai";
import { groq } from "@ai-sdk/groq";
import { Pool } from "pg";
import { buildAgent } from "@/lib/agent";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const lastUserMessage = messages[messages.length - 1];
  const question = lastUserMessage.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join(" ");

  const agent = buildAgent(pool);
  const result = await agent.invoke({ question });

  const { retrievedChunks, toolResult } = result.context;
  const contextText = retrievedChunks
    .map((c) => `- (${c.source}) ${c.content}`)
    .join("\n");

  const systemPrompt = `You are DocPilot, a support assistant. Answer the user's question using ONLY the context below. If a tool result is provided, lead with it. If the context doesn't contain the answer, say you don't know rather than guessing.

${toolResult ? `Tool result: ${toolResult}\n` : ""}
Relevant docs:
${contextText || "(no relevant docs found)"}`;

  const result_ = streamText({
    model: groq("openai/gpt-oss-120b"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  });

  return result_.toUIMessageStreamResponse();
}
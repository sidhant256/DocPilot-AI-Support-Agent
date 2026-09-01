import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
import { Pool } from "pg";
import { retrieveRelevantChunks, RetrievedChunk } from "./retrieve";
import { lookupOrder, createSupportTicket } from "./tools";

const AgentState = Annotation.Root({
  question: Annotation<string>,
  retrievedChunks: Annotation<RetrievedChunk[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  toolResult: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  context: Annotation<{ retrievedChunks: RetrievedChunk[]; toolResult: string | null }>({
    reducer: (_prev, next) => next,
    default: () => ({ retrievedChunks: [], toolResult: null }),
  }),
});

type Pending =
  | { kind: "none" }
  | { kind: "lookup_order"; orderId: string }
  | { kind: "create_ticket"; summary: string };

function detectToolNeed(question: string): Pending {
  const orderMatch = question.match(/ORD-\d+/i);
  if (orderMatch) {
    return { kind: "lookup_order", orderId: orderMatch[0].toUpperCase() };
  }
  if (/speak to (a )?human|talk to (a )?person|create a ticket|file a complaint/i.test(question)) {
    return { kind: "create_ticket", summary: question };
  }
  return { kind: "none" };
}

export function buildAgent(pool: Pool) {
  const graph = new StateGraph(AgentState)
    .addNode("retrieve", async (state) => {
      const chunks = await retrieveRelevantChunks(pool, state.question);
      return { retrievedChunks: chunks };
    })
    .addNode("decide", async (state) => {
      return state;
    })
    .addNode("callTool", async (state) => {
      const pending = detectToolNeed(state.question);

      if (pending.kind === "lookup_order") {
        const order = lookupOrder(pending.orderId);
        const toolResult = order
          ? `Order ${order.id} status: ${order.status}.${
              order.trackingNumber ? ` Tracking: ${order.trackingNumber}.` : ""
            }`
          : `No order found with ID ${pending.orderId}.`;
        return { toolResult };
      }

      if (pending.kind === "create_ticket") {
        const { ticketId } = createSupportTicket(pending.summary);
        return { toolResult: `Created support ticket ${ticketId}. Our team will follow up by email.` };
      }

      return { toolResult: null };
    })
    .addNode("respond", async (state) => {
      return {
        context: {
          retrievedChunks: state.retrievedChunks,
          toolResult: state.toolResult,
        },
      };
    })
    .addEdge(START, "retrieve")
    .addEdge("retrieve", "decide")
    .addConditionalEdges("decide", (state) => {
      const pending = detectToolNeed(state.question);
      return pending.kind === "none" ? "respond" : "callTool";
    })
    .addEdge("callTool", "respond")
    .addEdge("respond", END);

  return graph.compile();
}
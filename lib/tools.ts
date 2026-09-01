export interface Order {
  id: string;
  status: "Processing" | "Shipped" | "Delivered";
  trackingNumber: string | null;
}

const fakeOrders: Record<string, Order> = {
  "ORD-1001": { id: "ORD-1001", status: "Shipped", trackingNumber: "1Z999AA10123456784" },
  "ORD-1002": { id: "ORD-1002", status: "Processing", trackingNumber: null },
  "ORD-1003": { id: "ORD-1003", status: "Delivered", trackingNumber: "1Z999AA10123456999" },
};

export function lookupOrder(orderId: string): Order | null {
  return fakeOrders[orderId] ?? null;
}

export function createSupportTicket(summary: string): { ticketId: string } {
  const ticketId = `TICKET-${Math.floor(1000 + Math.random() * 9000)}`;
  console.log(`[tool] Created support ticket ${ticketId}: "${summary}"`);
  return { ticketId };
}
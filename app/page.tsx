"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";

export default function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();

  return (
    <div className="mx-auto flex h-screen max-w-2xl flex-col p-4">
      <h1 className="mb-4 text-xl font-semibold">DocPilot</h1>

      <div className="flex-1 space-y-4 overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === "user" ? "text-right" : "text-left"}
          >
            <div
              className={
                "inline-block rounded-lg px-3 py-2 " +
                (message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900")
              }
            >
              {message.parts.map((part, i) =>
                part.type === "text" ? <span key={i}>{part.text}</span> : null
              )}
            </div>
          </div>
        ))}
        {status === "streaming" && (
          <div className="text-left text-sm text-gray-400">DocPilot is typing...</div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput("");
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about shipping, returns, or your order..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          disabled={status === "streaming"}
        >
          Send
        </button>
      </form>
    </div>
  );
}
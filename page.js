"use client";

import { useState } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(event) {
    event.preventDefault();
    const question = input.trim();

    if (!question || busy) return;
    if (!BACKEND) {
      setError("Backend URL is missing. Configure frontend/.env.local and restart Next.js.");
      return;
    }

    const nextMessages = [...messages, { role: "user", content: question }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setError("");
    setBusy(true);

    try {
      const response = await fetch(`${BACKEND.replace(/\/$/, "")}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Backend returned ${response.status}: ${body}`);
      }
      if (!response.body) throw new Error("The server returned no response stream.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const eventText of events) {
          const dataLine = eventText
            .split("\n")
            .find((line) => line.startsWith("data:"));
          if (!dataLine) continue;

          const raw = dataLine.slice(5).trim();
          if (!raw) continue;

          let payload;
          try {
            payload = JSON.parse(raw);
          } catch {
            continue;
          }

          if (payload.type === "delta" && payload.text) {
            setMessages((current) => {
              const updated = [...current];
              const last = updated.length - 1;
              updated[last] = {
                ...updated[last],
                content: updated[last].content + payload.text,
              };
              return updated;
            });
          } else if (payload.type === "error") {
            throw new Error(payload.message || "Streaming request failed.");
          }
        }
      }
    } catch (err) {
      setError(err.message || "Unable to contact the backend.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="header">
        <div className="brandMark">AI</div>
        <div>
          <h1>MyAI V2</h1>
          <p>Groq-powered streaming assistant</p>
        </div>
        <span className="live"><i /> Streaming demo</span>
      </header>

      <section className="chatPanel">
        <div className="intro">
          <span className="eyebrow">GENAI LABS · V2 STREAMING</span>
          <h2>Ask. Watch. Learn.</h2>
          <p>Responses appear progressively as the model generates them.</p>
        </div>

        <div className="messages" aria-live="polite">
          {messages.length === 0 && (
            <div className="empty">
              <div className="spark">✳</div>
              <strong>Start a conversation</strong>
              <span>Try: “Explain how Docker containers work.”</span>
            </div>
          )}
          {messages.map((message, index) => (
            <article className={`message ${message.role}`} key={index}>
              <div className="role">{message.role === "user" ? "YOU" : "MYAI"}</div>
              <div className="bubble">
                {message.content || (busy && message.role === "assistant" ? <span className="typing">Generating<span>...</span></span> : "")}
                {busy && message.role === "assistant" && index === messages.length - 1 && message.content && <span className="cursor" />}
              </div>
            </article>
          ))}
        </div>

        {error && <div className="error">{error}</div>}

        <form className="composer" onSubmit={sendMessage}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask anything..."
            rows={2}
            disabled={busy}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button type="submit" disabled={busy || !input.trim()}>
            {busy ? "Streaming..." : "Send"} <span>↗</span>
          </button>
        </form>
        <p className="hint">Enter to send · Shift + Enter for a new line</p>
      </section>
      <footer>MyAI V2 · FastAPI + Next.js + Groq API</footer>
    </main>
  );
}

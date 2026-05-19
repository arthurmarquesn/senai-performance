"use client";

import { useState } from "react";
import { Bot, Loader2, Send, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const suggestions = [
  "Faça um resumo geral do sistema.",
  "Quantos alunos estão cadastrados?",
  "Quais turmas existem?",
  "Quais são os simulados recentes?",
  "Quantas redações foram corrigidas?",
];

export function AiChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou o assistente pedagógico da plataforma. Posso ajudar com perguntas sobre turmas, simulados, alunos e redações.",
    },
  ]);

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  async function askAi(value?: string) {
    const text = (value ?? question).trim();

    if (!text || loading) return;

    setQuestion("");
    setLoading(true);

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        content: text,
      },
    ]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: text,
        }),
      });

      const data = await response.json();

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.answer || data.error || "Não consegui responder.",
        },
      ]);
    } catch {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: "Erro ao conectar com o assistente.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-6">
      <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <Bot size={24} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-zinc-900">
              Chat pedagógico
            </h2>

            <p className="text-sm text-zinc-500">
              Pergunte em linguagem natural.
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <Bot size={18} />
                </div>
              )}

              <div
                className={`prose prose-sm max-w-3xl rounded-2xl px-5 py-4 leading-relaxed prose-p:my-2 prose-ul:my-2 prose-li:my-1 ${
                  message.role === "user"
                    ? "bg-red-600 text-white"
                    : "bg-zinc-100 text-zinc-700"
                }`}
              >
                <ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    h1: ({ children }) => (
      <h1 className="mb-3 text-xl font-bold">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-2 mt-4 text-lg font-bold">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-2 mt-3 font-bold">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="mb-3 leading-relaxed last:mb-0">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="mb-3 ml-5 list-disc space-y-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-3 ml-5 list-decimal space-y-1">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">{children}</li>
    ),
    strong: ({ children }) => (
      <strong className="font-bold text-zinc-900">{children}</strong>
    ),
  }}
>
  {message.content}
</ReactMarkdown>
              </div>

              {message.role === "user" && (
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                  <User size={18} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <Loader2 size={18} className="animate-spin" />
              Pensando...
            </div>
          )}
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => askAi(item)}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                askAi();
              }
            }}
            placeholder="Ex: Faça um resumo geral do sistema..."
            className="flex-1 rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          />

          <button
            type="button"
            onClick={() => askAi()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Send size={18} />
            Enviar
          </button>
        </div>
      </div>
    </section>
  );
}
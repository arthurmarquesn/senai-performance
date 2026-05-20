"use client";

import { useState } from "react";
import { MarkdownResponse } from "@/components/MarkdownResponse";

type Props = {
  bookId: string;
};

const quickPrompts = [
  "Como essa obra pode cair no ENEM?",
  "Como usar essa obra em redação?",
  "Explique os conceitos principais.",
  "Faça um resumo inteligente da obra.",
  "Quais críticas sociais essa obra faz?",
  "Compare essa obra com a sociedade atual.",
  "Quais temas filosóficos aparecem aqui?",
  "Me dê repertórios socioculturais usando essa obra.",
];

export function BookAIChat({
  bookId,
}: Props) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");

  async function sendMessage(customMessage?: string) {
    const finalMessage = customMessage || message;

    if (!finalMessage.trim()) return;

    setLoading(true);

    try {
      const req = await fetch("/api/leituras/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: finalMessage,
          bookId,
        }),
      });

      const data = await req.json();

      setResponse(
        data.response ||
          data.error ||
          "Não consegui responder."
      );

      setMessage(finalMessage);
    } catch (error) {
      console.error(error);

      setResponse("Erro ao conectar com Alfred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="mb-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-zinc-900">
              Alfred IA
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Converse sobre vestibulares, filosofia,
              literatura e redação.
            </p>
          </div>

          <span className="rounded-full bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
            IA Contextual
          </span>
        </div>
      </div>

      <div className="mb-8">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Perguntas rápidas
        </p>

        <div className="flex flex-wrap gap-3">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={loading}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Pergunte algo sobre a obra..."
          className="min-h-[140px] rounded-2xl border border-zinc-200 p-5 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
        />

        <button
          onClick={() => sendMessage()}
          disabled={loading}
          className="rounded-2xl bg-red-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {loading
            ? "Alfred está pensando..."
            : "Perguntar ao Alfred"}
        </button>

        {response && (
          <div className="rounded-[28px] border border-zinc-200 bg-zinc-50 p-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-zinc-900">
                Resposta do Alfred
              </h3>

              <span className="rounded-full bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
                IA Pedagógica
              </span>
            </div>

            <div className="prose prose-zinc max-w-none">
              <MarkdownResponse content={response} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
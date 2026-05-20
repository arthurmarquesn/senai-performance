"use client";

import { useState } from "react";
import { MarkdownResponse } from "@/components/MarkdownResponse";

const quickThemes = [
  "Manipulação social através das redes",
  "Desigualdade social no Brasil",
  "Crise na educação brasileira",
  "Saúde mental na sociedade moderna",
  "Violência urbana",
  "Impactos da tecnologia",
  "Democracia e participação política",
  "Alienação social",
  "Consumismo contemporâneo",
  "Meio ambiente e sustentabilidade",
  "Preconceito estrutural",
  "Individualismo na sociedade",
];

export function RepertorioClient() {
  const [theme, setTheme] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGenerate(customTheme?: string) {
    const finalTheme = customTheme || theme;

    if (!finalTheme.trim()) return;

    setLoading(true);

    try {
      const req = await fetch("/api/redacao/repertorio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          theme: finalTheme,
        }),
      });

      const data = await req.json();

      setResponse(
        data.response ||
          data.error ||
          "Não foi possível gerar repertórios."
      );

      setTheme(finalTheme);
    } catch (error) {
      console.error(error);

      setResponse("Erro ao conectar com Alfred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-[32px] border border-zinc-200 bg-white p-10 shadow-sm">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-zinc-900">
            Gerador de repertório
          </h1>

          <p className="mt-3 max-w-3xl text-zinc-500">
            Alfred gera repertórios socioculturais inteligentes
            para redações ENEM e vestibulares.
          </p>
        </div>

        <div className="mb-8">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Sugestões rápidas
          </p>

          <div className="flex flex-wrap gap-3">
            {quickThemes.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleGenerate(item)}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5">
          <textarea
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            placeholder="Ex: manipulação social através das redes"
            className="min-h-[160px] rounded-2xl border border-zinc-200 p-5 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          />

          <button
            type="button"
            onClick={() => handleGenerate()}
            disabled={loading}
            className="rounded-2xl bg-red-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {loading
              ? "Alfred está pensando..."
              : "Gerar repertórios"}
          </button>

          {response && (
            <div className="rounded-[28px] border border-zinc-200 bg-zinc-50 p-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900">
                  Repertórios gerados
                </h2>

                <span className="rounded-full bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
                  Alfred IA
                </span>
              </div>

              <MarkdownResponse content={response} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
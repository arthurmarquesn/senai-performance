"use client";

import { useState } from "react";
import { Construction, X } from "lucide-react";

export function UnderConstructionBanner({ pageName }: { pageName: string }) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-3xl border border-amber-200 bg-white p-8 shadow-2xl">
        {/* Botão fechar */}
        <button
          onClick={() => setVisible(false)}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        {/* Ícone */}
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
          <Construction size={32} className="text-amber-600" />
        </div>

        {/* Texto */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-zinc-900">Página em construção</h2>
          <p className="mt-2 text-sm font-semibold text-amber-600">{pageName}</p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            Esta funcionalidade está sendo desenvolvida e estará disponível em breve.
            Fique ligado nas próximas atualizações!
          </p>
        </div>

        {/* Botão de fechar principal */}
        <button
          onClick={() => setVisible(false)}
          className="mt-6 w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 hover:shadow-lg hover:shadow-amber-500/20"
        >
          Entendido, continue navegando
        </button>
      </div>
    </div>
  );
}

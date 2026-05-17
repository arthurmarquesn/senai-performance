"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-xl bg-red-600 px-5 py-3 text-sm font-medium text-white print:hidden"
    >
      Imprimir / Salvar PDF
    </button>
  );
}
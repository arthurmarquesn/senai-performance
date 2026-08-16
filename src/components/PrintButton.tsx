"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="performance-primary-action rounded-lg px-5 py-3 text-sm font-semibold text-white print:hidden"
    >
      Imprimir / Salvar PDF
    </button>
  );
}

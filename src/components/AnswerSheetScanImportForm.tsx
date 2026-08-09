"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FileUp, Loader2 } from "lucide-react";

import {
  importAnswerSheetScans,
  type ImportAnswerSheetScansState,
} from "@/app/simulados/[id]/actions";

type AnswerSheetScanImportFormProps = {
  examId: string;
  examApplicationId: string;
};

const initialState: ImportAnswerSheetScansState = {
  status: "idle",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <FileUp size={15} />
      )}
      {pending ? "Importando..." : "Importar"}
    </button>
  );
}

export function AnswerSheetScanImportForm({
  examId,
  examApplicationId,
}: AnswerSheetScanImportFormProps) {
  const [state, action] = useActionState(
    importAnswerSheetScans,
    initialState
  );

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="examApplicationId" value={examApplicationId} />

      <div className="grid gap-2">
        <label
          htmlFor={`scanPdf-${examApplicationId}`}
          className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500"
        >
          Gabaritos digitalizados
        </label>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            id={`scanPdf-${examApplicationId}`}
            name="scanPdf"
            type="file"
            accept="application/pdf,.pdf"
            required
            className="performance-field min-w-0 rounded-xl border px-3 py-2 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-zinc-700"
          />
          <SubmitButton />
        </div>
      </div>

      {state.status === "success" && state.summary && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-800">
          <p className="font-semibold">Importação concluída</p>
          <div className="mt-2 grid gap-1">
            <p>Arquivo: {state.summary.sourceFileName}</p>
            <p>Páginas detectadas: {state.summary.totalPages}</p>
            <p>Páginas registradas: {state.summary.registeredPages}</p>
            <p>Status: Recebido</p>
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
          {state.message}
        </div>
      )}
    </form>
  );
}

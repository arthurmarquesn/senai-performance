"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, ScanSearch } from "lucide-react";

import {
  processSingleAnswerSheetScan,
  type ProcessAnswerSheetScanState,
} from "@/app/simulados/[id]/actions";

type AnswerSheetScanProcessFormProps = {
  examId: string;
  scanId: string;
};

const initialState: ProcessAnswerSheetScanState = {
  status: "idle",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <ScanSearch size={14} />
      )}
      {pending ? "Lendo..." : "Ler respostas"}
    </button>
  );
}

export function AnswerSheetScanProcessForm({
  examId,
  scanId,
}: AnswerSheetScanProcessFormProps) {
  const [state, action] = useActionState(
    processSingleAnswerSheetScan,
    initialState
  );

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="scanId" value={scanId} />

      <SubmitButton />

      {state.status === "success" && state.summary && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-2 text-xs text-green-800">
          <p className="font-semibold">
            Leitura concluida: pagina {state.summary.pageNumber}
          </p>
          {state.summary.studentName && <p>{state.summary.studentName}</p>}
          <p>{state.summary.persistedAnswers} questao(oes) persistida(s)</p>
          <p>
            Detectadas: {state.summary.detected} - Em branco:{" "}
            {state.summary.blank}
          </p>
          <p>
            Multiplas: {state.summary.multiple} - Incertas:{" "}
            {state.summary.uncertain}
          </p>
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs font-medium text-red-700">
          {state.message}
        </div>
      )}
    </form>
  );
}

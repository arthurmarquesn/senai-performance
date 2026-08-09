"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Rows3 } from "lucide-react";

import {
  processAnswerSheetScanBatchAction,
  type ProcessAnswerSheetScanBatchState,
} from "@/app/simulados/[id]/actions";

type AnswerSheetScanBatchProcessFormProps = {
  examId: string;
  examApplicationId: string;
  batchId: string;
  hasDetectedAnswers: boolean;
};

const initialState: ProcessAnswerSheetScanBatchState = {
  status: "idle",
};

function SubmitButton({ hasDetectedAnswers }: { hasDetectedAnswers: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Rows3 size={14} />}
      {pending
        ? "Processando lote..."
        : hasDetectedAnswers
          ? "Reprocessar respostas do lote"
          : "Processar respostas do lote"}
    </button>
  );
}

export function AnswerSheetScanBatchProcessForm({
  examId,
  examApplicationId,
  batchId,
  hasDetectedAnswers,
}: AnswerSheetScanBatchProcessFormProps) {
  const [state, action] = useActionState(
    processAnswerSheetScanBatchAction,
    initialState
  );

  return (
    <form
      action={action}
      className="grid gap-2"
      onSubmit={(event) => {
        if (
          hasDetectedAnswers &&
          !window.confirm(
            "Este lote ja possui leituras. Reprocessar folhas sem revisao humana?"
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="examApplicationId" value={examApplicationId} />
      <input type="hidden" name="batchId" value={batchId} />

      <SubmitButton hasDetectedAnswers={hasDetectedAnswers} />

      {state.status === "success" && state.summary && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-2 text-xs text-green-800">
          <p className="font-semibold">Processamento optico concluido</p>
          <p>{state.summary.totalPages} pagina(s)</p>
          <p>Elegiveis: {state.summary.eligiblePages}</p>
          <p>Processadas agora: {state.summary.processedNow}</p>
          <p>Processadas no banco: {state.summary.processedPages}</p>
          <p>Requerem revisao: {state.summary.reviewRequiredPages}</p>
          <p>Confirmadas previamente: {state.summary.previouslyConfirmed}</p>
          <p>Protegidas: {state.summary.protectedPages}</p>
          <p>Falhas tecnicas: {state.summary.technicalFailures}</p>
          <p>DetectedAnswer total: {state.summary.detectedAnswerTotal}</p>
          <p>Tempo: {(state.summary.durationMs / 1000).toFixed(1)}s</p>
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

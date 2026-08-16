"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";

import {
  completeBatchReviewAction,
  type CompleteBatchReviewState,
} from "@/app/simulados/[id]/leituras/lotes/[batchId]/actions";

type AnswerSheetBatchCompleteFormProps = {
  examId: string;
  batchId: string;
  totalPages: number;
  confirmedPages: number;
  reviewedAnswers: number;
  canComplete: boolean;
  pendingCount: number;
};

const initialState: CompleteBatchReviewState = {
  status: "idle",
};

function SubmitButton({
  canComplete,
  totalPages,
}: {
  canComplete: boolean;
  totalPages: number;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || !canComplete}
      className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
      {pending ? "Concluindo..." : `Concluir lote de leitura (${totalPages})`}
    </button>
  );
}

export function AnswerSheetBatchCompleteForm({
  examId,
  batchId,
  totalPages,
  confirmedPages,
  reviewedAnswers,
  canComplete,
  pendingCount,
}: AnswerSheetBatchCompleteFormProps) {
  const [state, action] = useActionState(completeBatchReviewAction, initialState);

  return (
    <form
      action={action}
      className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
      onSubmit={(event) => {
        if (
          !window.confirm(
            `As ${totalPages} folhas processadas serao marcadas como leitura concluida. Deseja continuar?`
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="batchId" value={batchId} />

      <div>
        <p className="text-sm font-semibold text-zinc-950">Leitura do lote</p>
        <p className="text-sm text-zinc-600">
          {confirmedPages} / {totalPages} folhas concluidas
        </p>
        <p className="text-xs text-zinc-500">
          {reviewedAnswers} decisao(oes) humana(s) registradas.
        </p>
      </div>

      {!canComplete && (
        <p className="text-xs font-medium text-amber-700">
          Ainda existem {pendingCount} folha(s) com problema estrutural ou leitura incompleta.
        </p>
      )}

      <SubmitButton canComplete={canComplete} totalPages={totalPages} />

      {state.status !== "idle" && (
        <div
          className={`rounded-lg border p-2 text-xs font-medium ${
            state.status === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <p>{state.message}</p>
          {state.summary && (
            <p>
              {state.summary.confirmedPages} folhas confirmadas,{" "}
              {state.summary.reviewedAnswers}/{state.summary.expectedAnswers}{" "}
              decisao(oes) humana(s) registradas. Status: {state.summary.status}.
            </p>
          )}
        </div>
      )}
    </form>
  );
}

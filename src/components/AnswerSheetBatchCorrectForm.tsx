"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";

import {
  correctBatchAction,
  type CorrectBatchState,
} from "@/app/simulados/[id]/leituras/lotes/[batchId]/actions";

type AnswerSheetBatchCorrectFormProps = {
  examId: string;
  batchId: string;
  totalAnswerSheets: number;
  correctedAnswerSheets: number;
  canCorrect: boolean;
};

const initialState: CorrectBatchState = {
  status: "idle",
};

function SubmitButton({ canCorrect }: { canCorrect: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || !canCorrect}
      className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
      {pending ? "Corrigindo..." : "Corrigir provas do lote"}
    </button>
  );
}

export function AnswerSheetBatchCorrectForm({
  examId,
  batchId,
  totalAnswerSheets,
  correctedAnswerSheets,
  canCorrect,
}: AnswerSheetBatchCorrectFormProps) {
  const [state, action] = useActionState(correctBatchAction, initialState);
  const totalCorrected =
    state.summary?.correctedAnswerSheetsAfter ?? correctedAnswerSheets;

  return (
    <form
      action={action}
      className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Todas as respostas deste lote ja foram confirmadas.\n\nA correcao criara os resultados oficiais dos alunos com base no gabarito cadastrado.\n\nDeseja continuar?"
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="batchId" value={batchId} />

      <div>
        <p className="text-sm font-semibold text-zinc-950">Correcao das provas</p>
        <p className="text-sm text-zinc-600">
          {totalCorrected} / {totalAnswerSheets} provas corrigidas
        </p>
        <p className="text-xs text-zinc-500">
          O progresso e derivado do status CORRECTED das folhas.
        </p>
      </div>

      {!canCorrect && (
        <p className="text-xs font-medium text-amber-700">
          A correcao em lote exige leitura do lote CONFIRMED.
        </p>
      )}

      <SubmitButton canCorrect={canCorrect} />

      {state.status !== "idle" && (
        <div
          className={`grid gap-2 rounded-lg border p-2 text-xs font-medium ${
            state.status === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <p>{state.message}</p>
          {state.summary && (
            <>
              <p>
                {state.summary.totalScans} folhas. Corrigidas agora:{" "}
                {state.summary.corrected}. Ja corrigidas:{" "}
                {state.summary.alreadyCorrected}. Protegidas:{" "}
                {state.summary.protectedExistingResult}. Divergentes:{" "}
                {state.summary.divergent}. Falhas tecnicas: {state.summary.failed}.
              </p>
              <p>
                Total corrigido: {state.summary.correctedAnswerSheetsAfter}/
                {state.summary.totalAnswerSheets}. Tempo: {state.summary.elapsedMs}ms.
              </p>
              {state.summary.issues.length > 0 && (
                <div className="grid gap-1">
                  {state.summary.issues.slice(0, 8).map((issue) => (
                    <p key={`${issue.scanId}-${issue.kind}`}>
                      Pagina {issue.pageNumber}: {issue.kind} - {issue.reason}
                    </p>
                  ))}
                  {state.summary.issues.length > 8 && (
                    <p>Mais {state.summary.issues.length - 8} ocorrencia(s).</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </form>
  );
}

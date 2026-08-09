"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, ScanQrCode } from "lucide-react";

import {
  identifyAnswerSheetScans,
  type IdentifyAnswerSheetScansState,
} from "@/app/simulados/[id]/actions";

type AnswerSheetScanIdentifyFormProps = {
  examId: string;
  examApplicationId: string;
  batchId: string;
};

const initialState: IdentifyAnswerSheetScansState = {
  status: "idle",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <ScanQrCode size={14} />
      )}
      {pending ? "Identificando..." : "Identificar folhas"}
    </button>
  );
}

export function AnswerSheetScanIdentifyForm({
  examId,
  examApplicationId,
  batchId,
}: AnswerSheetScanIdentifyFormProps) {
  const [state, action] = useActionState(
    identifyAnswerSheetScans,
    initialState
  );

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="examApplicationId" value={examApplicationId} />
      <input type="hidden" name="batchId" value={batchId} />

      <SubmitButton />

      {state.status === "success" && state.summary && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-2 text-xs text-green-800">
          <p className="font-semibold">Identificação concluída</p>
          <p>{state.summary.totalPages} página(s)</p>
          <p>Identificadas: {state.summary.identifiedPages}</p>
          <p>Requerem revisão: {state.summary.reviewRequiredPages}</p>
          <p>Falhas: {state.summary.failedPages}</p>
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

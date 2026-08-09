"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, CheckCircle2, Loader2 } from "lucide-react";

import {
  completeScanReviewAction,
  confirmClearReadingsAction,
  correctConfirmedScanAction,
  reviewQuestionAction,
  type CompleteScanReviewState,
  type ConfirmClearReadingsState,
  type CorrectConfirmedScanState,
  type ReviewQuestionState,
} from "@/app/simulados/[id]/leituras/[scanId]/actions";

const alternatives = ["A", "B", "C", "D", "E"] as const;
const blankValue = "__BLANK__";

function PendingIcon({ pending }: { pending: boolean }) {
  return pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />;
}

function ReviewSubmitButtons({ current }: { current: string | null | undefined }) {
  const { pending } = useFormStatus();

  return (
    <div className="flex flex-wrap gap-2">
      {alternatives.map((alternative) => (
        <button
          key={alternative}
          type="submit"
          name="finalAnswer"
          value={alternative}
          disabled={pending}
          className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
            current === alternative
              ? "border-red-600 bg-red-600 text-white"
              : "border-zinc-200 bg-white text-zinc-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          }`}
        >
          {alternative}
        </button>
      ))}
      <button
        type="submit"
        name="finalAnswer"
        value={blankValue}
        disabled={pending}
        className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
          current === null
            ? "border-amber-500 bg-amber-50 text-amber-800"
            : "border-zinc-200 bg-white text-zinc-700 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800"
        }`}
      >
        Em branco
      </button>
    </div>
  );
}

export function ReviewQuestionForm({
  examId,
  scanId,
  question,
  currentFinalAnswer,
}: {
  examId: string;
  scanId: string;
  question: number;
  currentFinalAnswer: string | null | undefined;
}) {
  const initialState: ReviewQuestionState = {
    status: "idle",
  };
  const [state, action] = useActionState(reviewQuestionAction, initialState);

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="scanId" value={scanId} />
      <input type="hidden" name="question" value={question} />

      <ReviewSubmitButtons current={currentFinalAnswer} />

      {state.status !== "idle" && (
        <p
          className={`text-xs font-medium ${
            state.status === "success" ? "text-green-700" : "text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

export function ConfirmClearReadingsForm({
  examId,
  scanId,
}: {
  examId: string;
  scanId: string;
}) {
  const initialState: ConfirmClearReadingsState = {
    status: "idle",
  };
  const [state, action] = useActionState(confirmClearReadingsAction, initialState);

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="scanId" value={scanId} />

      <ConfirmButton label="Confirmar leituras claras" />

      {state.status !== "idle" && (
        <p
          className={`text-xs font-medium ${
            state.status === "success" ? "text-green-700" : "text-red-700"
          }`}
        >
          {state.message}
          {state.summary ? ` Pendentes: ${state.summary.pending}.` : ""}
        </p>
      )}
    </form>
  );
}

function ConfirmButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <PendingIcon pending={pending} />
      {pending ? "Processando..." : label}
    </button>
  );
}

export function CompleteScanReviewForm({
  examId,
  scanId,
}: {
  examId: string;
  scanId: string;
}) {
  const initialState: CompleteScanReviewState = {
    status: "idle",
  };
  const [state, action] = useActionState(completeScanReviewAction, initialState);

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="scanId" value={scanId} />

      <button
        type="submit"
        className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
      >
        <CheckCircle2 size={16} />
        Concluir revisao da folha
      </button>

      {state.status !== "idle" && (
        <p
          className={`text-xs font-medium ${
            state.status === "success" ? "text-green-700" : "text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

export function CorrectConfirmedScanForm({
  examId,
  scanId,
  canCorrect,
  alreadyCorrected,
  resultHref,
}: {
  examId: string;
  scanId: string;
  canCorrect: boolean;
  alreadyCorrected: boolean;
  resultHref: string | null;
}) {
  const initialState: CorrectConfirmedScanState = {
    status: "idle",
  };
  const [state, action] = useActionState(correctConfirmedScanAction, initialState);

  return (
    <form
      action={action}
      className="grid gap-2"
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Esta acao transformara as respostas confirmadas desta folha em resultado oficial do simulado."
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="scanId" value={scanId} />

      <button
        type="submit"
        disabled={!canCorrect}
        className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CheckCircle2 size={16} />
        {alreadyCorrected ? "Prova corrigida" : "Corrigir prova"}
      </button>

      {!canCorrect && (
        <p className="text-xs font-medium text-amber-700">
          Corrija apenas folhas CONFIRMED de lotes CONFIRMED.
        </p>
      )}

      {resultHref && (
        <a
          href={resultHref}
          className="text-xs font-semibold text-red-700 underline-offset-2 hover:underline"
        >
          Ver resultado oficial
        </a>
      )}

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
              {state.summary.studentAnswers} respostas oficiais. Acertos:{" "}
              {state.summary.correctAnswers}/{state.summary.validQuestions}.
              Anuladas: {state.summary.canceledQuestions}. Em branco:{" "}
              {state.summary.blankAnswers}.
            </p>
          )}
        </div>
      )}
    </form>
  );
}

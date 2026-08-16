"use client";

import { useActionState, useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";

import {
  completeScanReviewAction,
  correctConfirmedScanAction,
  type CompleteScanReviewState,
  type CorrectConfirmedScanState,
} from "@/app/simulados/[id]/leituras/[scanId]/actions";

const alternatives = ["A", "B", "C", "D", "E"] as const;
type ReviewAlternative = (typeof alternatives)[number];

type ReviewQuestionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function ReviewSubmitButtons({
  current,
  pending,
  onSelect,
}: {
  current: string | null | undefined;
  pending: boolean;
  onSelect: (answer: ReviewAlternative | null) => void;
}) {

  return (
    <div className="flex flex-wrap gap-2">
      {alternatives.map((alternative) => (
        <button
          key={alternative}
          type="button"
          onClick={() => onSelect(alternative)}
          disabled={pending}
          className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-70 ${
            current === alternative
              ? "border-red-700 bg-red-700 text-white ring-2 ring-red-200"
              : "border-zinc-200 bg-white text-zinc-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          }`}
        >
          {alternative}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onSelect(null)}
        disabled={pending}
        className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-70 ${
          current === null
            ? "border-amber-600 bg-amber-500 text-white ring-2 ring-amber-200"
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
  const [selectedAnswer, setSelectedAnswer] = useState<string | null | undefined>(
    currentFinalAnswer
  );
  const [state, setState] = useState<ReviewQuestionState>({
    status: "idle",
  });
  const [isPending, startTransition] = useTransition();

  function saveReviewAnswer(finalAnswer: ReviewAlternative | null) {
    const previousAnswer = selectedAnswer;

    setSelectedAnswer(finalAnswer);
    startTransition(async () => {
      setState({
        status: "idle",
      });

      const response = await fetch(
        `/simulados/${examId}/leituras/${scanId}/questoes/${question}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            finalAnswer,
          }),
        }
      );
      const result = (await response.json().catch(() => null)) as
        | ReviewQuestionState
        | null;

      if (!response.ok || result?.status !== "success") {
        setSelectedAnswer(previousAnswer);
        setState({
          status: "error",
          message: result?.message ?? "Nao foi possivel revisar a questao.",
        });
        return;
      }

      setState(result);
    });
  }

  return (
    <div className="grid gap-2">
      <ReviewSubmitButtons
        current={selectedAnswer}
        pending={isPending}
        onSelect={saveReviewAnswer}
      />

      <p className="text-xs text-zinc-500">
        Opcao atual: {selectedAnswer === undefined ? "pendente" : selectedAnswer ?? "em branco"}
      </p>

      {state.status !== "idle" && (
        <p
          className={`text-xs font-medium ${
            state.status === "success" ? "text-green-700" : "text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}
    </div>
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
        Concluir leitura da folha
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
            "Esta acao criara o resultado oficial com base na resposta efetiva de cada questao."
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
          Corrija apenas folhas identificadas, normalizadas e ja lidas pela optica.
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

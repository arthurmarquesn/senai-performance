"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, RotateCcw, Save } from "lucide-react";

import {
  saveAnswerKeyBatch,
  type AnswerKeyBatchItem,
} from "@/app/simulados/[id]/actions";
import { cx } from "@/components/design-system";

type Alternative = "A" | "B" | "C" | "D" | "E";

type AnswerKeyEditorItem = {
  question: number;
  answer: Alternative | null;
  canceled: boolean;
};

type AnswerKeyEditorProps = {
  examId: string;
  totalQuestions: number;
  initialAnswerKey: AnswerKeyEditorItem[];
};

const alternatives: Alternative[] = ["A", "B", "C", "D", "E"];

function buildState(
  totalQuestions: number,
  items: AnswerKeyEditorItem[]
): AnswerKeyEditorItem[] {
  const byQuestion = new Map(
    items.map((item) => [item.question, item] as const)
  );

  return Array.from({ length: totalQuestions }, (_, index) => {
    const question = index + 1;
    const item = byQuestion.get(question);

    return {
      question,
      answer: item?.answer ?? null,
      canceled: item?.canceled ?? false,
    };
  });
}

function areItemsEqual(
  first: AnswerKeyEditorItem[],
  second: AnswerKeyEditorItem[]
) {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((item, index) => {
    const other = second[index];

    return (
      other !== undefined &&
      item.question === other.question &&
      item.answer === other.answer &&
      item.canceled === other.canceled
    );
  });
}

function toBatchItems(
  items: AnswerKeyEditorItem[]
): AnswerKeyBatchItem[] {
  return items
    .filter(
      (
        item
      ): item is AnswerKeyEditorItem & {
        answer: Alternative;
      } => item.answer !== null
    )
    .map((item) => ({
      question: item.question,
      answer: item.answer,
      canceled: item.canceled,
    }));
}

export function AnswerKeyEditor({
  examId,
  totalQuestions,
  initialAnswerKey,
}: AnswerKeyEditorProps) {
  const initialItems = useMemo(
    () => buildState(totalQuestions, initialAnswerKey),
    [totalQuestions, initialAnswerKey]
  );

  const [baseline, setBaseline] =
    useState<AnswerKeyEditorItem[]>(initialItems);

  const [items, setItems] =
    useState<AnswerKeyEditorItem[]>(initialItems);

  const [statusMessage, setStatusMessage] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const dirty = !areItemsEqual(items, baseline);

  const dirtyCount = items.reduce((count, item, index) => {
    const original = baseline[index];

    if (!original) {
      return count + 1;
    }

    const changed =
      item.answer !== original.answer ||
      item.canceled !== original.canceled;

    return changed ? count + 1 : count;
  }, 0);

  const answeredCount = items.filter(
    (item) => item.answer !== null
  ).length;

  const canceledCount = items.filter(
    (item) => item.canceled
  ).length;

  function clearFeedback() {
    setStatusMessage(null);
    setErrorMessage(null);
  }

  function selectAnswer(
    question: number,
    answer: Alternative
  ) {
    setItems((current) =>
      current.map((item) =>
        item.question === question
          ? {
              ...item,
              answer,
            }
          : item
      )
    );

    clearFeedback();
  }

  function toggleCanceled(question: number) {
    setItems((current) =>
      current.map((item) => {
        if (
          item.question !== question ||
          item.answer === null
        ) {
          return item;
        }

        return {
          ...item,
          canceled: !item.canceled,
        };
      })
    );

    clearFeedback();
  }

  function resetChanges() {
    if (isPending) {
      return;
    }

    setItems(baseline);
    setErrorMessage(null);
    setStatusMessage("Alterações descartadas.");
  }

  function saveChanges() {
    if (!dirty || isPending) {
      return;
    }

    const submittedItems = items.map((item) => ({
      ...item,
    }));

    const batchItems = toBatchItems(submittedItems);

    setErrorMessage(null);
    setStatusMessage(null);

    startTransition(async () => {
      const result = await saveAnswerKeyBatch({
        examId,
        items: batchItems,
      });

      if (result.status === "error") {
        setErrorMessage(result.message);
        return;
      }

      const savedState = buildState(
        totalQuestions,
        result.savedItems
      );

      setBaseline(savedState);

      setItems((current) => {
        /*
         * Se o professor não alterou nada enquanto o salvamento
         * estava ocorrendo, sincronizamos com o servidor.
         *
         * Se ele continuou editando, preservamos o draft atual.
         */
        if (areItemsEqual(current, submittedItems)) {
          return savedState;
        }

        return current;
      });

      setStatusMessage("Gabarito salvo com sucesso.");
    });
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p
              className={cx(
                "text-sm font-semibold",
                dirty
                  ? "text-orange-700"
                  : "text-zinc-900"
              )}
            >
              {dirty
                ? "Alterações não salvas"
                : "Gabarito sincronizado"}
            </p>

            <span className="text-xs text-zinc-500">
              {answeredCount}/{totalQuestions} respondidas
            </span>

            {canceledCount > 0 && (
              <span className="text-xs font-medium text-amber-700">
                {canceledCount} anulada(s)
              </span>
            )}
          </div>

          {dirty && (
            <p className="mt-1 text-xs text-zinc-500">
              {dirtyCount} questão(ões) alterada(s)
            </p>
          )}

          {statusMessage && (
            <p className="mt-2 text-xs font-semibold text-green-700">
              {statusMessage}
            </p>
          )}

          {errorMessage && (
            <p className="mt-2 text-xs font-semibold text-rose-700">
              {errorMessage}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={resetChanges}
            disabled={!dirty || isPending}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={15} />
            Descartar
          </button>

          <button
            type="button"
            onClick={saveChanges}
            disabled={!dirty || isPending}
            className="performance-primary-action inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Save size={15} className="animate-pulse" />
                Salvando...
              </>
            ) : (
              <>
                <Check size={15} />
                Salvar alterações
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.question}
            className={cx(
              "grid min-w-0 grid-cols-[78px_1fr_auto] items-center gap-3 rounded-lg border px-3 py-2.5",
              item.canceled
                ? "border-amber-200 bg-amber-50"
                : "border-zinc-200 bg-white"
            )}
          >
            <p className="whitespace-nowrap text-sm font-semibold text-zinc-900">
              Q{String(item.question).padStart(2, "0")}
            </p>

            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {alternatives.map((alternative) => {
                const selected =
                  item.answer === alternative;

                return (
                  <button
                    key={alternative}
                    type="button"
                    aria-label={`Questão ${item.question}, alternativa ${alternative}`}
                    aria-pressed={selected}
                    onClick={() =>
                      selectAnswer(
                        item.question,
                        alternative
                      )
                    }
                    className={cx(
                      "flex h-8 min-w-8 items-center justify-center rounded-md border px-2.5 text-xs font-bold transition",
                      selected
                        ? "border-red-600 bg-red-600 text-white shadow-sm"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                    )}
                  >
                    {alternative}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() =>
                toggleCanceled(item.question)
              }
              disabled={item.answer === null}
              aria-pressed={item.canceled}
              className={cx(
                "inline-flex min-h-8 items-center justify-center rounded-md px-2.5 text-xs font-semibold transition",
                item.canceled
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "border border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800",
                item.answer === null &&
                  "cursor-not-allowed opacity-40"
              )}
            >
              {item.canceled ? "Anulada" : "Anular"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
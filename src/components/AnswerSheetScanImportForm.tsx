"use client";

import { useActionState } from "react";
import {
  CheckCircle2,
  FileUp,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";

import {
  importAnswerSheetScans,
  type ImportAnswerSheetScansState,
} from "@/app/simulados/[id]/actions";

const initialState: ImportAnswerSheetScansState = {
  status: "idle",
};

export function AnswerSheetScanImportForm({
  examId,
  examApplicationId,
}: {
  examId: string;
  examApplicationId: string;
}) {
  const [state, formAction, isPending] =
    useActionState(
      importAnswerSheetScans,
      initialState
    );

  const summary = state.summary;

  return (
    <div className="grid gap-3">
      <form
        action={formAction}
        className="grid gap-3"
      >
        <input
          type="hidden"
          name="examId"
          value={examId}
        />

        <input
          type="hidden"
          name="examApplicationId"
          value={examApplicationId}
        />

        <div className="grid gap-2">
          <label
            htmlFor={`scanPdf-${examApplicationId}`}
            className="text-xs font-semibold text-zinc-700"
          >
            PDF preenchido
          </label>

          <input
            id={`scanPdf-${examApplicationId}`}
            name="scanPdf"
            type="file"
            accept="application/pdf,.pdf"
            required
            disabled={isPending}
            className="
              performance-field
              block
              w-full
              rounded-xl
              border
              border-zinc-200
              bg-white
              px-3
              py-2
              text-xs
              text-zinc-700
              outline-none
              transition
              file:mr-3
              file:rounded-lg
              file:border-0
              file:bg-zinc-100
              file:px-3
              file:py-1.5
              file:text-xs
              file:font-semibold
              file:text-zinc-700
              hover:file:bg-zinc-200
              focus:border-red-400
              focus:ring-4
              focus:ring-red-500/10
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="
            performance-primary-action
            inline-flex
            min-h-10
            w-full
            items-center
            justify-center
            gap-2
            rounded-xl
            px-4
            py-2.5
            text-xs
            font-semibold
            text-white
            transition
            disabled:cursor-wait
            disabled:opacity-70
          "
        >
          {isPending ? (
            <>
              <LoaderCircle
                size={16}
                className="animate-spin"
              />

              Processando gabaritos...
            </>
          ) : (
            <>
              <FileUp size={16} />

              Importar e processar
            </>
          )}
        </button>

        {isPending && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
            <div className="flex items-start gap-2.5">
              <LoaderCircle
                size={17}
                className="mt-0.5 shrink-0 animate-spin text-red-600"
              />

              <div>
                <p className="text-xs font-semibold text-zinc-900">
                  Processamento em andamento
                </p>

                <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                  Identificando os alunos, lendo as
                  marcações e registrando as respostas.
                  Isso pode levar alguns segundos.
                </p>
              </div>
            </div>
          </div>
        )}
      </form>

      {!isPending &&
        state.status === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3">
            <div className="flex items-start gap-2.5">
              <TriangleAlert
                size={17}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>
                <p className="text-xs font-semibold text-red-800">
                  Não foi possível processar o PDF
                </p>

                {state.message && (
                  <p className="mt-1 text-[11px] leading-5 text-red-700">
                    {state.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      {!isPending &&
        state.status === "success" &&
        summary && (
          <div
            className={
              summary.occurrencePages > 0
                ? "rounded-xl border border-amber-200 bg-amber-50 px-3 py-3"
                : "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3"
            }
          >
            <div className="flex items-start gap-2.5">
              {summary.occurrencePages > 0 ? (
                <TriangleAlert
                  size={17}
                  className="mt-0.5 shrink-0 text-amber-700"
                />
              ) : (
                <CheckCircle2
                  size={17}
                  className="mt-0.5 shrink-0 text-emerald-700"
                />
              )}

              <div className="min-w-0 flex-1">
                <p
                  className={
                    summary.occurrencePages > 0
                      ? "text-xs font-semibold text-amber-900"
                      : "text-xs font-semibold text-emerald-900"
                  }
                >
                  {summary.occurrencePages > 0
                    ? "Processamento concluído com ocorrências"
                    : "Processamento concluído"}
                </p>

                <p
                  className={
                    summary.occurrencePages > 0
                      ? "mt-1 truncate text-[11px] text-amber-800"
                      : "mt-1 truncate text-[11px] text-emerald-800"
                  }
                >
                  {summary.sourceFileName}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white/70 px-2.5 py-2">
                    <p className="text-sm font-semibold text-zinc-900">
                      {summary.totalPages}
                    </p>

                    <p className="text-[10px] text-zinc-500">
                      folhas
                    </p>
                  </div>

                  <div className="rounded-lg bg-white/70 px-2.5 py-2">
                    <p className="text-sm font-semibold text-zinc-900">
                      {summary.identifiedPages}
                    </p>

                    <p className="text-[10px] text-zinc-500">
                      identificadas
                    </p>
                  </div>

                  <div className="rounded-lg bg-white/70 px-2.5 py-2">
                    <p className="text-sm font-semibold text-zinc-900">
                      {summary.processedPages}
                    </p>

                    <p className="text-[10px] text-zinc-500">
                      processadas
                    </p>
                  </div>

                  <div className="rounded-lg bg-white/70 px-2.5 py-2">
                    <p className="text-sm font-semibold text-zinc-900">
                      {summary.detectedAnswerTotal}
                    </p>

                    <p className="text-[10px] text-zinc-500">
                      respostas
                    </p>
                  </div>
                </div>

                {summary.occurrencePages > 0 && (
                  <p className="mt-3 text-[11px] font-medium text-amber-900">
                    {summary.occurrencePages} ocorrência(s)
                    de processamento. As demais folhas
                    foram registradas normalmente.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
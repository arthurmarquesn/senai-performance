import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ListChecks,
  Target,
} from "lucide-react";

import { cx } from "@/components/design-system";

import {
  getTeacherQuestions,
  type TeacherQuestionAnalysis,
} from "@/lib/teacher/questions";

type TeacherQuestionsSectionProps = {
  teacherProfileId: string;

  classRoomId?: string;
  examId?: string;

  order?: string;
};

function formatPercentage(
  value: number,
) {
  return `${value.toLocaleString(
    "pt-BR",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    },
  )}%`;
}

function QuestionReference({
  question,
}: {
  question:
    | TeacherQuestionAnalysis
    | null;
}) {
  if (!question) {
    return (
      <span className="text-sm font-semibold text-zinc-400">
        —
      </span>
    );
  }

  return (
    <div>
      <p className="text-lg font-bold text-zinc-950">
        Q
        {String(
          question.question,
        ).padStart(
          2,
          "0",
        )}
      </p>

      <p className="mt-0.5 max-w-[180px] truncate text-xs text-zinc-500">
        {question.examTitle}
      </p>
    </div>
  );
}

export async function TeacherQuestionsSection({
  teacherProfileId,
  classRoomId,
  examId,
  order,
}: TeacherQuestionsSectionProps) {
  const data =
    await getTeacherQuestions(
      teacherProfileId,
      {
        classRoomId,
        examId,
      },
    );

  let questions =
    [...data.questions];

  if (
    order === "maior-acerto"
  ) {
    questions.sort(
      (left, right) =>
        right.percentage -
          left.percentage ||
        left.question -
          right.question,
    );
  } else if (
    order === "questao"
  ) {
    questions.sort(
      (left, right) =>
        left.examTitle.localeCompare(
          right.examTitle,
          "pt-BR",
        ) ||
        left.question -
          right.question,
    );
  } else {
    /*
     * Padrão:
     * questões com menor percentual primeiro.
     */
    questions.sort(
      (left, right) =>
        left.percentage -
          right.percentage ||
        left.question -
          right.question,
    );
  }

  return (
    <div className="grid gap-5">
      {/* =====================================================
          FILTROS
      ====================================================== */}

      <form
        method="get"
        className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 lg:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">
            Turma
          </span>

          <select
            name="turma"
            defaultValue={
              classRoomId ??
              ""
            }
            className="min-h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
          >
            <option value="">
              Todas as turmas
            </option>

            {data.classRooms.map(
              (classRoom) => (
                <option
                  key={
                    classRoom.id
                  }
                  value={
                    classRoom.id
                  }
                >
                  {
                    classRoom.name
                  }
                </option>
              ),
            )}
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">
            Simulado
          </span>

          <select
            name="simulado"
            defaultValue={
              examId ?? ""
            }
            className="min-h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
          >
            <option value="">
              Todos os simulados
            </option>

            {data.exams.map(
              (exam) => (
                <option
                  key={exam.id}
                  value={exam.id}
                >
                  {exam.title}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">
            Ordenar
          </span>

          <select
            name="ordem"
            defaultValue={
              order ??
              "menor-acerto"
            }
            className="min-h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
          >
            <option value="menor-acerto">
              Maior dificuldade
            </option>

            <option value="maior-acerto">
              Maior acerto
            </option>

            <option value="questao">
              Número da questão
            </option>
          </select>
        </label>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="performance-primary-action min-h-10 rounded-lg px-4 text-sm font-semibold text-white"
          >
            Aplicar
          </button>

          {(classRoomId ||
            examId ||
            (order &&
              order !==
                "menor-acerto")) && (
            <a
              href="/professor/questoes"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100"
            >
              Limpar
            </a>
          )}
        </div>
      </form>

      {/* =====================================================
          CARDS
      ====================================================== */}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
                Questões analisadas
              </p>

              <p className="mt-2 text-2xl font-bold text-zinc-950">
                {
                  data.totalQuestions
                }
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
              <ListChecks
                size={17}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
                Acerto médio
              </p>

              <p className="mt-2 text-2xl font-bold text-zinc-950">
                {formatPercentage(
                  data.averagePercentage,
                )}
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-700">
              <BarChart3
                size={17}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-700">
                Maior dificuldade
              </p>

              <QuestionReference
                question={
                  data.hardestQuestion
                }
              />

              {data.hardestQuestion && (
                <p className="mt-1 text-xs font-semibold text-amber-700">
                  {formatPercentage(
                    data
                      .hardestQuestion
                      .percentage,
                  )}{" "}
                  de acerto
                </p>
              )}
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle
                size={17}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700">
                Maior acerto
              </p>

              <QuestionReference
                question={
                  data.easiestQuestion
                }
              />

              {data.easiestQuestion && (
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  {formatPercentage(
                    data
                      .easiestQuestion
                      .percentage,
                  )}{" "}
                  de acerto
                </p>
              )}
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2
                size={17}
              />
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          LISTA DE QUESTÕES
      ====================================================== */}

      {questions.length === 0 ? (
        <section className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
            <ListChecks
              size={20}
            />
          </div>

          <h2 className="mt-4 text-base font-semibold text-zinc-950">
            Nenhuma questão disponível
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">
            Não existem questões corrigidas da sua disciplina para a seleção atual.
          </p>
        </section>
      ) : (
        <section className="grid gap-3">
          {questions.map(
            (question) => {
              const alternatives =
                [
                  "A",
                  "B",
                  "C",
                  "D",
                  "E",
                ] as const;

              const strongestWrongAlternative =
                alternatives
                  .filter(
                    (
                      alternative,
                    ) =>
                      alternative !==
                      question.correctAnswer,
                  )
                  .sort(
                    (
                      left,
                      right,
                    ) =>
                      question
                        .alternatives[
                        right
                      ] -
                      question
                        .alternatives[
                        left
                      ],
                  )[0];

              const strongestWrongCount =
                question
                  .alternatives[
                  strongestWrongAlternative
                ];

              return (
                <article
                  key={`${question.examId}:${question.question}`}
                  className="rounded-xl border border-zinc-200 bg-white p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    {/* Identificação */}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex h-10 min-w-10 items-center justify-center rounded-lg bg-zinc-950 px-2 text-sm font-bold text-white">
                          Q
                          {String(
                            question.question,
                          ).padStart(
                            2,
                            "0",
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-950">
                            {
                              question.examTitle
                            }
                          </p>

                          <p className="mt-0.5 text-xs text-zinc-500">
                            Gabarito:{" "}
                            <strong className="text-zinc-800">
                              {
                                question.correctAnswer
                              }
                            </strong>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Métricas */}

                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                          Acerto
                        </p>

                        <p className="mt-1 text-lg font-bold text-zinc-950">
                          {formatPercentage(
                            question.percentage,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                          Corretas
                        </p>

                        <p className="mt-1 text-lg font-bold text-zinc-950">
                          {
                            question.correctAnswers
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                          Erradas
                        </p>

                        <p className="mt-1 text-lg font-bold text-zinc-950">
                          {
                            question.wrongAnswers
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                          Em branco
                        </p>

                        <p className="mt-1 text-lg font-bold text-zinc-950">
                          {
                            question.blankAnswers
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Barra de acerto */}

                  <div className="mt-5">
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={cx(
                          "h-full rounded-full",
                          question.percentage <
                            50
                            ? "bg-amber-500"
                            : "bg-red-600",
                        )}
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(
                              100,
                              question.percentage,
                            ),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Alternativas */}

                  <div className="mt-5">
                    <div className="flex items-center gap-2">
                      <Target
                        size={15}
                        className="text-zinc-400"
                      />

                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">
                        Distribuição das alternativas
                      </p>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-5">
                      {alternatives.map(
                        (
                          alternative,
                        ) => {
                          const count =
                            question
                              .alternatives[
                              alternative
                            ];

                          const alternativePercentage =
                            question.totalAnswers >
                            0
                              ? (count /
                                  question.totalAnswers) *
                                100
                              : 0;

                          const isCorrect =
                            alternative ===
                            question.correctAnswer;

                          return (
                            <div
                              key={
                                alternative
                              }
                              className={cx(
                                "rounded-lg border p-3",
                                isCorrect
                                  ? "border-emerald-200 bg-emerald-50"
                                  : "border-zinc-200 bg-zinc-50",
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={cx(
                                    "flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold",
                                    isCorrect
                                      ? "bg-emerald-600 text-white"
                                      : "bg-white text-zinc-700 ring-1 ring-zinc-200",
                                  )}
                                >
                                  {
                                    alternative
                                  }
                                </span>

                                <span className="text-sm font-bold text-zinc-950">
                                  {
                                    count
                                  }
                                </span>
                              </div>

                              <p className="mt-2 text-xs text-zinc-500">
                                {formatPercentage(
                                  alternativePercentage,
                                )}
                              </p>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>

                  {/* Insight simples */}

                  {question.wrongAnswers >
                    0 &&
                    strongestWrongCount >
                      0 && (
                      <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                        <p className="text-xs leading-5 text-zinc-600">
                          Distrator mais escolhido:{" "}
                          <strong className="text-zinc-900">
                            {
                              strongestWrongAlternative
                            }
                          </strong>
                          , com{" "}
                          <strong className="text-zinc-900">
                            {
                              strongestWrongCount
                            }
                          </strong>{" "}
                          resposta(s).
                        </p>
                      </div>
                    )}
                </article>
              );
            },
          )}
        </section>
      )}
    </div>
  );
}
import {
  ArrowLeftRight,
  CheckCircle2,
  ListChecks,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { cx } from "@/components/design-system";

import {
  getTeacherPerformance,
} from "@/lib/teacher/performance";

type TeacherCompareSectionProps = {
  teacherProfileId: string;

  classRoomAId?: string;
  classRoomBId?: string;

  examId?: string;
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

function formatDifference(
  value: number,
) {
  const absoluteValue =
    Math.abs(value);

  const formatted =
    absoluteValue.toLocaleString(
      "pt-BR",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      },
    );

  if (value > 0) {
    return `+${formatted} p.p.`;
  }

  if (value < 0) {
    return `-${formatted} p.p.`;
  }

  return "0 p.p.";
}

function ComparisonDifference({
  value,
}: {
  value: number;
}) {
  if (
    Math.abs(value) <
    0.01
  ) {
    return (
      <span className="text-xs font-semibold text-zinc-500">
        Mesmo desempenho
      </span>
    );
  }

  const positive =
    value > 0;

  const Icon =
    positive
      ? TrendingUp
      : TrendingDown;

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 text-xs font-semibold",
        positive
          ? "text-emerald-700"
          : "text-amber-700",
      )}
    >
      <Icon size={13} />

      {formatDifference(
        value,
      )}
    </span>
  );
}

type ComparisonCardProps = {
  label: string;

  valueA: string;
  valueB: string;

  classRoomAName: string;
  classRoomBName: string;

  difference?: number;

  icon:
    | typeof Users
    | typeof CheckCircle2
    | typeof ListChecks;
};

function ComparisonCard({
  label,
  valueA,
  valueB,
  classRoomAName,
  classRoomBName,
  difference,
  icon: Icon,
}: ComparisonCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
          {label}
        </p>

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
          <Icon size={15} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <p className="truncate text-xs font-medium text-zinc-500">
            {classRoomAName}
          </p>

          <p className="mt-1 text-xl font-bold text-zinc-950">
            {valueA}
          </p>
        </div>

        <ArrowLeftRight
          size={15}
          className="text-zinc-300"
        />

        <div className="text-right">
          <p className="truncate text-xs font-medium text-zinc-500">
            {classRoomBName}
          </p>

          <p className="mt-1 text-xl font-bold text-zinc-950">
            {valueB}
          </p>
        </div>
      </div>

      {difference !==
        undefined && (
        <div className="mt-3 border-t border-zinc-100 pt-3">
          <p className="mb-1 text-[11px] text-zinc-400">
            Diferença A − B
          </p>

          <ComparisonDifference
            value={
              difference
            }
          />
        </div>
      )}
    </div>
  );
}

export async function TeacherCompareSection({
  teacherProfileId,
  classRoomAId,
  classRoomBId,
  examId,
}: TeacherCompareSectionProps) {
  /*
   * Primeiro buscamos a visão geral somente
   * para montar as opções de turma e simulado.
   */
  const generalPerformance =
    await getTeacherPerformance(
      teacherProfileId,
    );

  const classRoomA =
    generalPerformance.classRooms.find(
      (classRoom) =>
        classRoom.id ===
        classRoomAId,
    ) ?? null;

  const classRoomB =
    generalPerformance.classRooms.find(
      (classRoom) =>
        classRoom.id ===
        classRoomBId,
    ) ?? null;

  const hasValidComparison =
    classRoomA !== null &&
    classRoomB !== null &&
    classRoomA.id !==
      classRoomB.id;

  /*
   * Só executamos as duas análises completas
   * quando há duas turmas válidas e diferentes.
   */
  const [
    performanceA,
    performanceB,
  ] = hasValidComparison
    ? await Promise.all([
        getTeacherPerformance(
          teacherProfileId,
          {
            classRoomId:
              classRoomA.id,
            examId,
          },
        ),

        getTeacherPerformance(
          teacherProfileId,
          {
            classRoomId:
              classRoomB.id,
            examId,
          },
        ),
      ])
    : [null, null];

  /*
   * ======================================================
   * QUESTÕES COMPARÁVEIS
   * ======================================================
   *
   * A chave inclui examId + question.
   *
   * Assim Q12 de dois simulados diferentes
   * nunca é tratada como a mesma questão.
   */
  const questionComparison =
    performanceA &&
    performanceB
      ? performanceA.questions
          .map(
            (questionA) => {
              const questionB =
                performanceB.questions.find(
                  (item) =>
                    item.examId ===
                      questionA.examId &&
                    item.question ===
                      questionA.question,
                );

              if (!questionB) {
                return null;
              }

              return {
                examId:
                  questionA.examId,

                examTitle:
                  questionA.examTitle,

                question:
                  questionA.question,

                percentageA:
                  questionA.percentage,

                percentageB:
                  questionB.percentage,

                difference:
                  questionA.percentage -
                  questionB.percentage,
              };
            },
          )
          .filter(
            (
              item,
            ): item is NonNullable<
              typeof item
            > =>
              item !== null,
          )
          .sort(
            (left, right) =>
              Math.abs(
                right.difference,
              ) -
                Math.abs(
                  left.difference,
                ) ||
              left.examTitle.localeCompare(
                right.examTitle,
                "pt-BR",
              ) ||
              left.question -
                right.question,
          )
      : [];

  const complementaryA =
    performanceA
      ? performanceA.students.filter(
          (student) =>
            student.band
              ?.requiresComplementaryActivity,
        ).length
      : 0;

  const complementaryB =
    performanceB
      ? performanceB.students.filter(
          (student) =>
            student.band
              ?.requiresComplementaryActivity,
        ).length
      : 0;

  const bands =
    performanceA &&
    performanceB
      ? performanceA.bands.map(
          (bandA) => {
            const bandB =
              performanceB.bands.find(
                (item) =>
                  item.id ===
                  bandA.id,
              );

            return {
              id:
                bandA.id,

              name:
                bandA.name,

              minPercentage:
                bandA.minPercentage,

              maxPercentage:
                bandA.maxPercentage,

              requiresComplementaryActivity:
                bandA.requiresComplementaryActivity,

              studentCountA:
                bandA.studentCount,

              studentCountB:
                bandB?.studentCount ??
                0,
            };
          },
        )
      : [];

  return (
    <div className="grid gap-5">
      {/* =====================================================
          FILTROS
      ====================================================== */}

      <form
        method="get"
        className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 lg:grid-cols-[1fr_auto_1fr_1fr_auto]"
      >
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">
            Turma A
          </span>

          <select
            name="turmaA"
            defaultValue={
              classRoomAId ??
              ""
            }
            className="min-h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
          >
            <option value="">
              Selecione
            </option>

            {generalPerformance.classRooms.map(
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

        <div className="hidden items-end pb-2 lg:flex">
          <ArrowLeftRight
            size={18}
            className="text-zinc-400"
          />
        </div>

        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">
            Turma B
          </span>

          <select
            name="turmaB"
            defaultValue={
              classRoomBId ??
              ""
            }
            className="min-h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
          >
            <option value="">
              Selecione
            </option>

            {generalPerformance.classRooms.map(
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

            {generalPerformance.exams.map(
              (exam) => (
                <option
                  key={
                    exam.id
                  }
                  value={
                    exam.id
                  }
                >
                  {
                    exam.title
                  }
                </option>
              ),
            )}
          </select>
        </label>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="performance-primary-action min-h-10 rounded-lg px-4 text-sm font-semibold text-white"
          >
            Comparar
          </button>

          {(classRoomAId ||
            classRoomBId ||
            examId) && (
            <a
              href="/professor/comparar"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100"
            >
              Limpar
            </a>
          )}
        </div>
      </form>

      {/* =====================================================
          SEM SELEÇÃO
      ====================================================== */}

      {!classRoomA ||
      !classRoomB ? (
        <section className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
            <ArrowLeftRight
              size={21}
            />
          </div>

          <h2 className="mt-4 text-base font-semibold text-zinc-950">
            Selecione duas turmas
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">
            Escolha duas turmas para comparar o desempenho delas exclusivamente nas questões da sua disciplina.
          </p>
        </section>
      ) : classRoomA.id ===
        classRoomB.id ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm font-semibold text-amber-800">
            Selecione duas turmas diferentes para realizar a comparação.
          </p>
        </section>
      ) : !performanceA ||
        !performanceB ? null : (
        <>
          {/* =================================================
              CABEÇALHO DA COMPARAÇÃO
          ================================================== */}

          <section className="grid items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 md:grid-cols-[1fr_auto_1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
                Turma A
              </p>

              <p className="mt-1 text-xl font-bold text-zinc-950">
                {
                  classRoomA.name
                }
              </p>
            </div>

            <div className="flex justify-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-700 ring-1 ring-red-100">
                <ArrowLeftRight
                  size={19}
                />
              </div>
            </div>

            <div className="text-left md:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
                Turma B
              </p>

              <p className="mt-1 text-xl font-bold text-zinc-950">
                {
                  classRoomB.name
                }
              </p>
            </div>
          </section>

          {/* =================================================
              MÉTRICAS
          ================================================== */}

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ComparisonCard
              label="Média"
              valueA={formatPercentage(
                performanceA.averagePercentage,
              )}
              valueB={formatPercentage(
                performanceB.averagePercentage,
              )}
              classRoomAName={
                classRoomA.name
              }
              classRoomBName={
                classRoomB.name
              }
              difference={
                performanceA.averagePercentage -
                performanceB.averagePercentage
              }
              icon={
                CheckCircle2
              }
            />

            <ComparisonCard
              label="Alunos"
              valueA={String(
                performanceA.totalStudents,
              )}
              valueB={String(
                performanceB.totalStudents,
              )}
              classRoomAName={
                classRoomA.name
              }
              classRoomBName={
                classRoomB.name
              }
              icon={Users}
            />

            <ComparisonCard
              label="Acertos"
              valueA={`${performanceA.correctAnswers}/${performanceA.totalAnswers}`}
              valueB={`${performanceB.correctAnswers}/${performanceB.totalAnswers}`}
              classRoomAName={
                classRoomA.name
              }
              classRoomBName={
                classRoomB.name
              }
              icon={
                CheckCircle2
              }
            />

            <ComparisonCard
              label="Atividade complementar"
              valueA={String(
                complementaryA,
              )}
              valueB={String(
                complementaryB,
              )}
              classRoomAName={
                classRoomA.name
              }
              classRoomBName={
                classRoomB.name
              }
              icon={Users}
            />
          </section>

          {/* =================================================
              FAIXAS
          ================================================== */}

          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                Faixas de desempenho
              </p>

              <h2 className="mt-1 text-base font-semibold text-zinc-950">
                Distribuição das turmas
              </h2>
            </div>

            {bands.length ===
            0 ? (
              <div className="mt-5 rounded-lg border border-dashed border-zinc-200 p-4">
                <p className="text-sm text-zinc-500">
                  Nenhuma faixa de desempenho foi configurada.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {bands.map(
                  (band) => {
                    const maximum =
                      Math.max(
                        band.studentCountA,
                        band.studentCountB,
                        1,
                      );

                    return (
                      <div
                        key={
                          band.id
                        }
                        className={cx(
                          "rounded-lg border p-4",
                          band.requiresComplementaryActivity
                            ? "border-amber-200 bg-amber-50/50"
                            : "border-zinc-200",
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">
                              {
                                band.name
                              }
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-500">
                              {
                                band.minPercentage
                              }
                              % a{" "}
                              {
                                band.maxPercentage
                              }
                              %
                            </p>
                          </div>

                          {band.requiresComplementaryActivity && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                              Atividade complementar
                            </span>
                          )}
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-medium text-zinc-500">
                                {
                                  classRoomA.name
                                }
                              </span>

                              <strong className="text-sm text-zinc-900">
                                {
                                  band.studentCountA
                                }
                              </strong>
                            </div>

                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                              <div
                                className="h-full rounded-full bg-red-600"
                                style={{
                                  width: `${
                                    (band.studentCountA /
                                      maximum) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-medium text-zinc-500">
                                {
                                  classRoomB.name
                                }
                              </span>

                              <strong className="text-sm text-zinc-900">
                                {
                                  band.studentCountB
                                }
                              </strong>
                            </div>

                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                              <div
                                className="h-full rounded-full bg-zinc-700"
                                style={{
                                  width: `${
                                    (band.studentCountB /
                                      maximum) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </section>

          {/* =================================================
              QUESTÃO POR QUESTÃO
          ================================================== */}

          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                  Questões
                </p>

                <h2 className="mt-1 text-base font-semibold text-zinc-950">
                  Maiores diferenças de desempenho
                </h2>
              </div>

              <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-600">
                {
                  questionComparison.length
                }{" "}
                questão(ões)
              </span>
            </div>

            {questionComparison.length ===
            0 ? (
              <div className="p-8 text-center">
                <ListChecks
                  size={21}
                  className="mx-auto text-zinc-400"
                />

                <p className="mt-3 text-sm font-semibold text-zinc-800">
                  Nenhuma questão comparável
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  As duas turmas ainda não possuem resultados em comum para a seleção atual.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-[90px_minmax(190px,1fr)_130px_130px_150px] gap-4 bg-zinc-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                    <span>
                      Questão
                    </span>

                    <span>
                      Simulado
                    </span>

                    <span>
                      {
                        classRoomA.name
                      }
                    </span>

                    <span>
                      {
                        classRoomB.name
                      }
                    </span>

                    <span>
                      Diferença
                    </span>
                  </div>

                  {questionComparison.map(
                    (
                      question,
                    ) => (
                      <div
                        key={`${question.examId}:${question.question}`}
                        className="grid grid-cols-[90px_minmax(190px,1fr)_130px_130px_150px] items-center gap-4 border-t border-zinc-100 px-5 py-3.5"
                      >
                        <strong className="text-sm text-zinc-950">
                          Q
                          {String(
                            question.question,
                          ).padStart(
                            2,
                            "0",
                          )}
                        </strong>

                        <span className="truncate text-sm text-zinc-600">
                          {
                            question.examTitle
                          }
                        </span>

                        <span className="text-sm font-bold text-zinc-950">
                          {formatPercentage(
                            question.percentageA,
                          )}
                        </span>

                        <span className="text-sm font-bold text-zinc-950">
                          {formatPercentage(
                            question.percentageB,
                          )}
                        </span>

                        <ComparisonDifference
                          value={
                            question.difference
                          }
                        />
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
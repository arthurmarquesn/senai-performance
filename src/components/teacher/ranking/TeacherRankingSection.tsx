import {
  Award,
  Medal,
  Trophy,
  Users,
} from "lucide-react";

import { cx } from "@/components/design-system";

import {
  getTeacherPerformance,
} from "@/lib/teacher/performance";

type TeacherRankingSectionProps = {
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

function getPositionLabel(
  position: number,
) {
  return `${position}º`;
}

function RankingPosition({
  position,
}: {
  position: number;
}) {
  if (position === 1) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
        <Trophy size={18} />
      </div>
    );
  }

  if (position === 2) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-200 text-zinc-700">
        <Medal size={18} />
      </div>
    );
  }

  if (position === 3) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
        <Award size={18} />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-sm font-bold text-zinc-600">
      {getPositionLabel(
        position,
      )}
    </div>
  );
}

export async function TeacherRankingSection({
  teacherProfileId,
  classRoomId,
  examId,
  order,
}: TeacherRankingSectionProps) {
  const performance =
    await getTeacherPerformance(
      teacherProfileId,
      {
        classRoomId,
        examId,
      },
    );

  let students =
    [...performance.students];

  if (order === "menor") {
    students.sort(
      (left, right) =>
        left.percentage -
          right.percentage ||
        left.studentName.localeCompare(
          right.studentName,
          "pt-BR",
        ),
    );
  } else if (
    order === "nome"
  ) {
    students.sort(
      (left, right) =>
        left.studentName.localeCompare(
          right.studentName,
          "pt-BR",
        ),
    );
  } else {
    students.sort(
      (left, right) =>
        right.percentage -
          left.percentage ||
        right.correctAnswers -
          left.correctAnswers ||
        left.studentName.localeCompare(
          right.studentName,
          "pt-BR",
        ),
    );
  }

  const bestStudent =
    students.length > 0
      ? students[0]
      : null;

  const average =
    performance.averagePercentage;

  const aboveAverage =
    performance.students.filter(
      (student) =>
        student.percentage >=
        average,
    ).length;

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

            {performance.classRooms.map(
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

            {performance.exams.map(
              (exam) => (
                <option
                  key={exam.id}
                  value={exam.id}
                >
                  {
                    exam.title
                  }
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
              "maior"
            }
            className="min-h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
          >
            <option value="maior">
              Maior desempenho
            </option>

            <option value="menor">
              Menor desempenho
            </option>

            <option value="nome">
              Nome
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
                "maior")) && (
            <a
              href="/professor/ranking"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100"
            >
              Limpar
            </a>
          )}
        </div>
      </form>

      {/* =====================================================
          RESUMO
      ====================================================== */}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
            Alunos no ranking
          </p>

          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-2xl font-bold text-zinc-950">
              {
                performance.totalStudents
              }
            </p>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
              <Users
                size={17}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
            Média da disciplina
          </p>

          <p className="mt-2 text-2xl font-bold text-zinc-950">
            {formatPercentage(
              performance.averagePercentage,
            )}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
            Acima da média
          </p>

          <p className="mt-2 text-2xl font-bold text-zinc-950">
            {
              aboveAverage
            }
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-700">
            Melhor desempenho
          </p>

          {bestStudent ? (
            <>
              <p className="mt-2 truncate text-sm font-bold text-zinc-950">
                {
                  bestStudent.studentName
                }
              </p>

              <p className="mt-1 text-xl font-bold text-amber-700">
                {formatPercentage(
                  bestStudent.percentage,
                )}
              </p>
            </>
          ) : (
            <p className="mt-2 text-2xl font-bold text-zinc-400">
              —
            </p>
          )}
        </div>
      </section>

      {/* =====================================================
          RANKING
      ====================================================== */}

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Classificação
            </p>

            <h2 className="mt-1 text-base font-semibold text-zinc-950">
              Ranking da disciplina
            </h2>
          </div>

          <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
            Somente questões da disciplina
          </span>
        </div>

        {students.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
              <Trophy
                size={20}
              />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-zinc-900">
              Nenhum resultado disponível
            </h3>

            <p className="mt-1 text-sm text-zinc-500">
              O ranking será preenchido quando houver resultados corrigidos da sua disciplina.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {students.map(
              (
                student,
                index,
              ) => {
                const position =
                  index + 1;

                return (
                  <div
                    key={
                      student.studentId
                    }
                    className={cx(
                      "grid gap-4 px-5 py-4 md:grid-cols-[56px_minmax(220px,1fr)_140px_140px_160px]",
                      position <= 3 &&
                        order !== "menor" &&
                        order !== "nome"
                        ? "bg-zinc-50/70"
                        : "bg-white",
                    )}
                  >
                    {/* POSIÇÃO */}

                    <div className="flex items-center">
                      <RankingPosition
                        position={
                          position
                        }
                      />
                    </div>

                    {/* ALUNO */}

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-950">
                        {
                          student.studentName
                        }
                      </p>

                      <p className="mt-0.5 text-xs text-zinc-500">
                        {
                          student.classRoomName
                        }
                      </p>
                    </div>

                    {/* ACERTOS */}

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400 md:hidden">
                        Acertos
                      </p>

                      <p className="text-sm font-semibold text-zinc-700">
                        {
                          student.correctAnswers
                        }
                        /
                        {
                          student.totalQuestions
                        }
                      </p>
                    </div>

                    {/* DESEMPENHO */}

                    <div className="grid gap-1.5">
                      <p className="text-sm font-bold text-zinc-950">
                        {formatPercentage(
                          student.percentage,
                        )}
                      </p>

                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-red-600"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(
                                100,
                                student.percentage,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* FAIXA */}

                    <div className="flex items-center">
                      <span
                        className={cx(
                          "w-fit rounded-full px-2.5 py-1 text-xs font-semibold",
                          student.band
                            ?.requiresComplementaryActivity
                            ? "bg-amber-100 text-amber-800"
                            : "bg-zinc-100 text-zinc-700",
                        )}
                      >
                        {student.band?.name ??
                          "Sem faixa"}
                      </span>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </section>

      {/* =====================================================
          REGRA PEDAGÓGICA
      ====================================================== */}

      {students.length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs leading-5 text-zinc-500">
            O ranking considera exclusivamente as questões vinculadas à disciplina do seu perfil pedagógico. Questões anuladas não participam do cálculo.
          </p>
        </section>
      )}
    </div>
  );
}
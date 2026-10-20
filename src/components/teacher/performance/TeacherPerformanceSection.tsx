import {
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  GraduationCap,
  TrendingUp,
  Users,
} from "lucide-react";

import { cx } from "@/components/design-system";
import {
  getTeacherPerformance,
} from "@/lib/teacher/performance";

type TeacherPerformanceSectionProps = {
  teacherProfileId: string;
  classRoomId?: string;
  examId?: string;
};

function formatPercentage(value: number) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof BarChart3;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">
            {value}
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            {helper}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700 ring-1 ring-red-100">
          <Icon size={17} />
        </div>
      </div>
    </div>
  );
}

export async function TeacherPerformanceSection({
  teacherProfileId,
  classRoomId,
  examId,
}: TeacherPerformanceSectionProps) {
  const performance =
    await getTeacherPerformance(
      teacherProfileId,
      {
        classRoomId,
        examId,
      },
    );

  const hardestQuestions =
    performance.questions.slice(0, 6);

  const complementaryStudents =
    performance.students.filter(
      (student) =>
        student.band
          ?.requiresComplementaryActivity,
    ).length;

  return (
    <div className="grid gap-5">
      <form
        method="get"
        className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-[1fr_1fr_auto]"
      >
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">
            Turma
          </span>

          <select
            name="turma"
            defaultValue={classRoomId ?? ""}
            className="min-h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
          >
            <option value="">
              Todas as turmas
            </option>

            {performance.classRooms.map(
              (classRoom) => (
                <option
                  key={classRoom.id}
                  value={classRoom.id}
                >
                  {classRoom.name}
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
            defaultValue={examId ?? ""}
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
                  {exam.title}
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
            Aplicar filtros
          </button>

          {(classRoomId || examId) && (
            <a
              href="/professor/desempenho"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100"
            >
              Limpar
            </a>
          )}
        </div>
      </form>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Média da disciplina"
          value={formatPercentage(
            performance.averagePercentage,
          )}
          helper="Percentual de acertos nas questões válidas da sua disciplina."
          icon={TrendingUp}
        />

        <StatCard
          label="Acertos"
          value={`${performance.correctAnswers.toLocaleString("pt-BR")} / ${performance.totalAnswers.toLocaleString("pt-BR")}`}
          helper="Acertos somados em todas as respostas consideradas."
          icon={CheckCircle2}
        />

        <StatCard
          label="Alunos"
          value={String(
            performance.totalStudents,
          )}
          helper={
            complementaryStudents > 0
              ? `${complementaryStudents} em faixa de atividade complementar.`
              : "Alunos com resultado disponível nos filtros atuais."
          }
          icon={Users}
        />

        <StatCard
          label="Questões"
          value={String(
            performance.totalQuestions,
          )}
          helper={`${performance.totalExams} simulado(s) considerado(s).`}
          icon={BookOpenCheck}
        />
      </section>

      {performance.totalAnswers === 0 ? (
        <section className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
            <BarChart3 size={20} />
          </div>

          <h2 className="mt-4 text-base font-semibold text-zinc-950">
            Ainda não há resultados para esta seleção
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">
            Assim que houver provas corrigidas com questões vinculadas à sua disciplina, os indicadores serão calculados automaticamente.
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                    Evolução
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-zinc-950">
                    Desempenho por simulado
                  </h2>
                </div>

                <TrendingUp
                  size={18}
                  className="text-zinc-400"
                />
              </div>

              <div className="mt-5 grid gap-4">
                {performance.evolution.map(
                  (item) => (
                    <div
                      key={item.examId}
                      className="grid gap-2"
                    >
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-zinc-800">
                            {item.examTitle}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {item.students} aluno(s)
                          </p>
                        </div>

                        <span className="shrink-0 font-bold text-zinc-950">
                          {formatPercentage(
                            item.percentage,
                          )}
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-red-600"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(
                                100,
                                item.percentage,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                  Faixas
                </p>
                <h2 className="mt-1 text-base font-semibold text-zinc-950">
                  Distribuição dos alunos
                </h2>
              </div>

              {performance.bands.length === 0 ? (
                <div className="mt-5 rounded-lg border border-dashed border-zinc-200 p-4">
                  <p className="text-sm font-semibold text-zinc-700">
                    Nenhuma faixa configurada
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Configure sua régua em “Faixas de desempenho” para classificar os alunos automaticamente.
                  </p>
                </div>
              ) : (
                <div className="mt-5 grid gap-3">
                  {performance.bands.map(
                    (band) => (
                      <div
                        key={band.id}
                        className={cx(
                          "rounded-lg border p-3",
                          band.requiresComplementaryActivity
                            ? "border-amber-200 bg-amber-50"
                            : "border-zinc-200 bg-zinc-50",
                        )}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">
                              {band.name}
                            </p>
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {band.minPercentage}% a{" "}
                              {band.maxPercentage}%
                            </p>
                          </div>

                          <span className="text-xl font-bold text-zinc-950">
                            {band.studentCount}
                          </span>
                        </div>

                        {band.requiresComplementaryActivity && (
                          <p className="mt-2 text-xs font-semibold text-amber-700">
                            Atividade complementar
                          </p>
                        )}
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                    Atenção pedagógica
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-zinc-950">
                    Questões com maior dificuldade
                  </h2>
                </div>

                <GraduationCap
                  size={18}
                  className="text-zinc-400"
                />
              </div>

              <div className="mt-4 grid gap-2">
                {hardestQuestions.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    Nenhuma questão disponível.
                  </p>
                ) : (
                  hardestQuestions.map(
                    (question) => (
                      <div
                        key={`${question.examId}:${question.question}`}
                        className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-900">
                            Q{String(
                              question.question,
                            ).padStart(
                              2,
                              "0",
                            )}
                          </p>
                          <p className="truncate text-xs text-zinc-500">
                            {question.examTitle}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold text-zinc-950">
                            {formatPercentage(
                              question.percentage,
                            )}
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            {question.correctAnswers}/
                            {question.totalAnswers}
                          </p>
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                  Alunos
                </p>
                <h2 className="mt-1 text-base font-semibold text-zinc-950">
                  Visão rápida do desempenho
                </h2>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200">
                <div className="grid grid-cols-[1fr_110px_120px] gap-3 bg-zinc-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                  <span>Aluno</span>
                  <span>Desempenho</span>
                  <span>Faixa</span>
                </div>

                {performance.students
                  .slice(0, 8)
                  .map(
                    (student) => (
                      <div
                        key={student.studentId}
                        className="grid grid-cols-[1fr_110px_120px] items-center gap-3 border-t border-zinc-100 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-800">
                            {student.studentName}
                          </p>
                          <p className="truncate text-xs text-zinc-400">
                            {student.classRoomName}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm font-bold text-zinc-950">
                            {formatPercentage(
                              student.percentage,
                            )}
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            {student.correctAnswers}/
                            {student.totalQuestions}
                          </p>
                        </div>

                        <span
                          className={cx(
                            "w-fit rounded-full px-2 py-1 text-[11px] font-semibold",
                            student.band
                              ?.requiresComplementaryActivity
                              ? "bg-amber-100 text-amber-800"
                              : "bg-zinc-100 text-zinc-600",
                          )}
                        >
                          {student.band?.name ??
                            "Sem faixa"}
                        </span>
                      </div>
                    ),
                  )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
import {
  AlertTriangle,
  Search,
  UserRoundCheck,
  Users,
} from "lucide-react";

import { cx } from "@/components/design-system";
import {
  getTeacherPerformance,
} from "@/lib/teacher/performance";

type TeacherStudentsSectionProps = {
  teacherProfileId: string;
  classRoomId?: string;
  examId?: string;
  search?: string;
  situation?: string;
  order?: string;
};

function formatPercentage(value: number) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}

export async function TeacherStudentsSection({
  teacherProfileId,
  classRoomId,
  examId,
  search,
  situation,
  order,
}: TeacherStudentsSectionProps) {
  const performance =
    await getTeacherPerformance(
      teacherProfileId,
      {
        classRoomId,
        examId,
      },
    );

  const normalizedSearch =
    search?.trim().toLocaleLowerCase(
      "pt-BR",
    ) ?? "";

  let students =
    performance.students.filter(
      (student) => {
        if (
          normalizedSearch &&
          !student.studentName
            .toLocaleLowerCase("pt-BR")
            .includes(normalizedSearch)
        ) {
          return false;
        }

        if (
          situation ===
            "atividade-complementar" &&
          !student.band
            ?.requiresComplementaryActivity
        ) {
          return false;
        }

        if (
          situation ===
            "sem-faixa" &&
          student.band !== null
        ) {
          return false;
        }

        return true;
      },
    );

  students = [...students].sort(
    (left, right) => {
      if (order === "menor") {
        return (
          left.percentage -
            right.percentage ||
          left.studentName.localeCompare(
            right.studentName,
            "pt-BR",
          )
        );
      }

      if (order === "nome") {
        return left.studentName.localeCompare(
          right.studentName,
          "pt-BR",
        );
      }

      return (
        right.percentage -
          left.percentage ||
        left.studentName.localeCompare(
          right.studentName,
          "pt-BR",
        )
      );
    },
  );

  const complementaryCount =
    performance.students.filter(
      (student) =>
        student.band
          ?.requiresComplementaryActivity,
    ).length;

  const withoutBandCount =
    performance.students.filter(
      (student) =>
        student.band === null,
    ).length;

  return (
    <div className="grid gap-5">
      <form
        method="get"
        className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 xl:grid-cols-[1fr_1fr_1fr_1fr_1.2fr_auto]"
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

        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">
            Situação
          </span>

          <select
            name="situacao"
            defaultValue={situation ?? ""}
            className="min-h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
          >
            <option value="">
              Todos
            </option>

            <option value="atividade-complementar">
              Atividade complementar
            </option>

            <option value="sem-faixa">
              Sem faixa
            </option>
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">
            Ordenar
          </span>

          <select
            name="ordem"
            defaultValue={order ?? "maior"}
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

        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">
            Buscar aluno
          </span>

          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />

            <input
              type="search"
              name="busca"
              defaultValue={search ?? ""}
              placeholder="Nome do aluno"
              className="min-h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-red-300 focus:ring-2 focus:ring-red-100"
            />
          </div>
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
            search ||
            situation ||
            (order && order !== "maior")) && (
            <a
              href="/professor/alunos"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100"
            >
              Limpar
            </a>
          )}
        </div>
      </form>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
                Alunos analisados
              </p>
              <p className="mt-2 text-2xl font-bold text-zinc-950">
                {performance.totalStudents}
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
              <Users size={17} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-700">
                Atividade complementar
              </p>
              <p className="mt-2 text-2xl font-bold text-zinc-950">
                {complementaryCount}
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle size={17} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
                Sem classificação
              </p>
              <p className="mt-2 text-2xl font-bold text-zinc-950">
                {withoutBandCount}
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
              <UserRoundCheck size={17} />
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Acompanhamento individual
            </p>

            <h2 className="mt-1 text-base font-semibold text-zinc-950">
              Desempenho dos alunos
            </h2>
          </div>

          <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-600">
            {students.length} resultado(s)
          </span>
        </div>

        {students.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-zinc-800">
              Nenhum aluno encontrado.
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Ajuste os filtros ou aguarde novos resultados corrigidos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-[minmax(220px,1.5fr)_150px_130px_170px_150px] gap-4 bg-zinc-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                <span>Aluno</span>
                <span>Turma</span>
                <span>Acertos</span>
                <span>Desempenho</span>
                <span>Faixa</span>
              </div>

              {students.map(
                (student) => (
                  <div
                    key={student.studentId}
                    className="grid grid-cols-[minmax(220px,1.5fr)_150px_130px_170px_150px] items-center gap-4 border-t border-zinc-100 px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {student.studentName}
                      </p>

                      {student.band
                        ?.requiresComplementaryActivity && (
                        <p className="mt-0.5 text-xs font-medium text-amber-700">
                          Requer atividade complementar
                        </p>
                      )}
                    </div>

                    <span className="text-sm font-medium text-zinc-600">
                      {student.classRoomName}
                    </span>

                    <span className="text-sm font-semibold text-zinc-700">
                      {student.correctAnswers}/
                      {student.totalQuestions}
                    </span>

                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-zinc-950">
                          {formatPercentage(
                            student.percentage,
                          )}
                        </span>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className={cx(
                            "h-full rounded-full",
                            student.band
                              ?.requiresComplementaryActivity
                              ? "bg-amber-500"
                              : "bg-red-600",
                          )}
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
                ),
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
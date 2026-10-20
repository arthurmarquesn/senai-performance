
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  GraduationCap,
  ListChecks,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { TeacherAreaNav } from "@/components/teacher/TeacherAreaNav";
import { getTeacherContext } from "@/lib/teacher/teacher-context";
import { getTeacherOverviewMetrics } from "@/lib/teacher/teacher-metrics";

function formatPercent(value: number | null) {
  if (value === null) return "—";

  return `${value.toFixed(1).replace(".", ",")}%`;
}

function formatPp(value: number | null) {
  if (value === null) return "—";

  const prefix = value > 0 ? "+" : "";

  return `${prefix}${value.toFixed(1).replace(".", ",")} p.p.`;
}

function Evolution({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="text-xs text-slate-400">
        Sem comparação anterior
      </span>
    );
  }

  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
        <TrendingUp size={14} />
        {formatPp(value)}
      </span>
    );
  }

  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
        <TrendingDown size={14} />
        {formatPp(value)}
      </span>
    );
  }

  return (
    <span className="text-xs font-medium text-slate-500">
      Sem variação
    </span>
  );
}

export default async function ProfessorPage() {
  const {
    user,
    teacherProfile,
    subjectLabel,
    areaLabel,
    isPortuguese,
  } = await getTeacherContext();

  if (!teacherProfile || !subjectLabel || !areaLabel) {
    return (
      <AppLayout>
        <div className="mx-auto w-full max-w-[1440px] py-8">
          <div className="mb-3 h-1 w-10 rounded-full bg-[#F97316]" />

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Área do Professor
            <span className="text-[#F97316]">.</span>
          </h1>

          <div className="mt-8 flex max-w-2xl items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <CircleAlert
              size={24}
              className="mt-0.5 shrink-0 text-amber-700"
            />

            <div>
              <h2 className="font-bold text-amber-950">
                Perfil pedagógico não configurado
              </h2>

              <p className="mt-2 text-sm leading-6 text-amber-900">
                Não encontramos uma disciplina vinculada
                ao usuário {user.name}. Configure o seu
                perfil pedagógico para acessar as
                análises pedagógicas.
              </p>

              <div className="mt-5 flex items-center gap-3">
                <Link
                  href="/professor/perfil"
                  className="inline-flex items-center justify-center rounded-xl bg-[#EA580C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#C2410C]"
                >
                  Configurar perfil
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const metrics = await getTeacherOverviewMetrics(
    teacherProfile.subject
  );

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1440px] pb-12">
        {/* Cabeçalho */}
        <header className="mb-7">
          <div className="mb-3 h-1 w-10 rounded-full bg-[#F97316]" />

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-[34px]">
                {subjectLabel}
                <span className="text-[#F97316]">.</span>
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                {user.name} · {areaLabel}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <BookOpen size={17} className="text-[#EA580C]" />
              {metrics.summary.exams} simulados analisados
            </div>
          </div>
        </header>

        {/* Navegação específica do professor */}
        <div className="mb-8">
          <TeacherAreaNav isPortuguese={isPortuguese} />
        </div>

        {/* Indicadores */}
        <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
          <MetricCard
            title="Média de acertos"
            value={formatPercent(metrics.summary.accuracy)}
            icon={<BarChart3 size={21} />}
            featured
          />

          <MetricCard
            title="Evolução"
            value={formatPp(metrics.summary.evolutionPp)}
            icon={<TrendingUp size={21} />}
            compact
          />

          <MetricCard
            title="Alunos avaliados"
            value={String(
              metrics.summary.evaluatedStudents
            )}
            icon={<UsersRound size={21} />}
          />

          <MetricCard
            title="Turmas avaliadas"
            value={String(metrics.summary.classrooms)}
            icon={<GraduationCap size={21} />}
          />
        </section>

        {/* Desempenho das turmas e avaliação recente */}
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* Turmas */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Desempenho das turmas
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Resultados em {subjectLabel}
                </p>
              </div>

              <Link
                href="/professor/desempenho"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#EA580C] transition hover:text-[#C2410C]"
              >
                Ver análise
                <ChevronRight size={17} />
              </Link>
            </div>

            {metrics.classrooms.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center px-6 py-10 text-center">
                <GraduationCap
                  size={32}
                  strokeWidth={1.5}
                  className="text-slate-300"
                />

                <h3 className="mt-4 font-semibold text-slate-800">
                  Nenhum resultado disponível
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  As turmas aparecerão após o registro
                  de resultados nesta disciplina.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {metrics.classrooms.map((classroom) => (
                  <Link
                    key={classroom.id}
                    href={`/professor/desempenho?turma=${classroom.id}`}
                    className="group flex items-center justify-between gap-4 px-5 py-5 transition hover:bg-orange-50/60 sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
                        <UsersRound size={20} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-900 transition group-hover:text-[#EA580C] sm:text-base">
                          {classroom.name}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {classroom.grade}º ano ·{" "}
                          {classroom.evaluatedStudents} alunos ·{" "}
                          {classroom.evaluatedExams} simulados
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3 sm:gap-5">
                      <div className="text-right">
                        <p className="text-lg font-bold tabular-nums text-slate-900 sm:text-xl">
                          {formatPercent(
                            classroom.accuracy
                          )}
                        </p>

                        <div className="mt-1">
                          <Evolution
                            value={classroom.evolutionPp}
                          />
                        </div>
                      </div>

                      <ChevronRight
                        size={18}
                        className="hidden text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#F97316] sm:block"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Acesso às análises */}
          <aside className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5">
                <h2 className="text-base font-bold text-slate-900">
                  Explorar análises
                </h2>
              </div>

              <div className="divide-y divide-slate-100">
                <QuickLink
                  href="/professor/alunos"
                  icon={<UsersRound size={18} />}
                  label="Desempenho dos alunos"
                />

                <QuickLink
                  href="/professor/questoes"
                  icon={<ListChecks size={18} />}
                  label="Análise de questões"
                />

                <QuickLink
                  href="/professor/comparar"
                  icon={<ArrowLeftRight size={18} />}
                  label="Comparar turmas"
                />
              </div>
            </section>

            {metrics.latestExam && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-500">
                  Última avaliação
                </h2>

                <h3 className="mt-3 break-words text-base font-bold text-slate-900">
                  {metrics.latestExam.title}
                </h3>

                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
                  <div>
                    <p className="text-xs text-slate-500">
                      Média de acertos
                    </p>

                    <p className="mt-2 text-2xl font-bold tabular-nums text-[#EA580C]">
                      {formatPercent(
                        metrics.latestExam.accuracy
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Alunos avaliados
                    </p>

                    <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                      {
                        metrics.latestExam
                          .evaluatedStudents
                      }
                    </p>
                  </div>
                </div>
              </section>
            )}
          </aside>
        </div>

        {/* Atenção pedagógica */}
        {metrics.criticalQuestion && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-orange-200 bg-orange-50/50">
            <div className="flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-[#C2410C]">
                  <CircleAlert size={21} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900">
                    Questão que merece atenção
                  </h2>

                  <p className="mt-1 break-words text-sm text-slate-600">
                    {metrics.criticalQuestion.examTitle}
                    {" · "}
                    Questão{" "}
                    {metrics.criticalQuestion.question}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Menor taxa de acerto registrada ·
                    Resposta correta:{" "}
                    <strong className="text-slate-700">
                      {
                        metrics.criticalQuestion
                          .correctAnswer
                      }
                    </strong>
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-4 pl-0 sm:pl-0">
                <div>
                  <p className="text-xs text-slate-500">
                    Taxa de acerto
                  </p>

                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#C2410C]">
                    {formatPercent(
                      metrics.criticalQuestion.accuracy
                    )}
                  </p>
                </div>

                <Link
                  href={`/professor/questoes?simulado=${metrics.criticalQuestion.examId}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F97316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#EA580C]"
                >
                  Analisar
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}

function MetricCard({
  title,
  value,
  icon,
  featured = false,
  compact = false,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  featured?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative flex min-h-[145px] flex-col justify-between overflow-hidden rounded-2xl p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6 ${
        featured
          ? "bg-gradient-to-br from-[#FB923C] to-[#EA580C] text-white"
          : "border border-slate-200 bg-white text-slate-900"
      }`}
    >
      {featured && (
        <div className="pointer-events-none absolute -right-9 -top-14 h-40 w-40 rounded-full border-[22px] border-white/10" />
      )}

      <div className="relative flex items-center justify-between gap-3">
        <p
          className={`text-sm font-medium ${
            featured
              ? "text-white/90"
              : "text-slate-500"
          }`}
        >
          {title}
        </p>

        <span
          className={
            featured
              ? "text-white/90"
              : "text-[#F97316]"
          }
        >
          {icon}
        </span>
      </div>

      <p
        className={`relative mt-5 break-words font-bold tracking-tight tabular-nums ${
          compact
            ? "text-xl sm:text-2xl"
            : "text-3xl sm:text-4xl"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-orange-50/60"
    >
      <div className="flex items-center gap-3">
        <span className="text-[#EA580C]">
          {icon}
        </span>

        <span className="text-sm font-semibold text-slate-700 transition group-hover:text-[#EA580C]">
          {label}
        </span>
      </div>

      <ChevronRight
        size={17}
        className="shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#F97316]"
      />
    </Link>
  );
}

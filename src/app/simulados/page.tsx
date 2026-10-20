
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  GraduationCap,
  Plus,
  Search,
  UsersRound,
  X,
} from "lucide-react";

import { createExam } from "./actions";
import { AppLayout } from "@/components/AppLayout";
import { prisma } from "@/lib/prisma";

type SearchParams = {
  q?: string;
  ano?: string;
};

export default async function SimuladosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const busca = (params.q ?? "").trim();
  const ano = ["1", "2", "3"].includes(params.ano ?? "")
    ? Number(params.ano)
    : null;

  const [simulados, totalSimulados, totalResultados] =
    await Promise.all([
      prisma.exam.findMany({
        where: {
          ...(busca
            ? { title: { contains: busca } }
            : {}),
          ...(ano !== null ? { grade: ano } : {}),
        },
        include: {
          _count: {
            select: {
              blocks: true,
              answerKey: true,
              results: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.exam.count(),
      prisma.examResult.count(),
    ]);

  const filtrosAtivos = Boolean(busca || ano !== null);

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1440px] pb-12">
        {/* Cabeçalho */}
        <header className="mb-8">
          <div className="mb-3 h-1 w-10 rounded-full bg-[#F97316]" />

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-[34px]">
            Simulados
            <span className="text-[#F97316]">.</span>
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Organize suas avaliações e acompanhe os resultados.
          </p>
        </header>

        {/* Indicadores */}
        <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-5">
          <MetricCard
            title="Simulados"
            value={totalSimulados}
            icon={<BookOpen size={21} />}
            featured
          />

          <MetricCard
            title="Resultados registrados"
            value={totalResultados}
            icon={<ClipboardList size={21} />}
          />

          <MetricCard
            title="Simulados encontrados"
            value={simulados.length}
            icon={<GraduationCap size={21} />}
          />
        </section>

        {/* Cadastro */}
        <details
          id="cadastro"
          className="group mb-6 scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden sm:px-6 [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F97316] text-white">
                <Plus size={21} />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Novo simulado
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Criar uma nova avaliação
                </p>
              </div>
            </div>

            <ChevronDown
              size={20}
              className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
            />
          </summary>

          <div className="border-t border-slate-100 p-5 sm:p-6">
            <form
              action={createExam}
              className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px_180px_auto] md:items-end"
            >
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Nome do simulado
                </span>

                <input
                  name="title"
                  required
                  placeholder="Ex.: Simulado 1 - Matemática"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-500/10"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Ano
                </span>

                <select
                  name="grade"
                  required
                  defaultValue=""
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-500/10"
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  <option value="1">1º ano</option>
                  <option value="2">2º ano</option>
                  <option value="3">3º ano</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Questões
                </span>

                <input
                  name="totalQuestions"
                  type="number"
                  min="1"
                  required
                  placeholder="Quantidade"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-500/10"
                />
              </label>

              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#F97316] px-5 text-sm font-semibold text-white transition hover:bg-[#EA580C]"
              >
                <Plus size={17} />
                Criar
              </button>
            </form>
          </div>
        </details>

        {/* Pesquisa e filtros */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <form
            action="/simulados"
            method="GET"
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <label className="min-w-0 flex-1">
              <span className="mb-2 block text-xs font-semibold text-slate-600">
                Pesquisar avaliação
              </span>

              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  name="q"
                  defaultValue={busca}
                  placeholder="Nome do simulado"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#F97316] focus:ring-4 focus:ring-orange-500/10"
                />
              </div>
            </label>

            <label className="w-full sm:w-[170px]">
              <span className="mb-2 block text-xs font-semibold text-slate-600">
                Ano
              </span>

              <select
                name="ano"
                defaultValue={ano?.toString() ?? ""}
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-500/10"
              >
                <option value="">Todos os anos</option>
                <option value="1">1º ano</option>
                <option value="2">2º ano</option>
                <option value="3">3º ano</option>
              </select>
            </label>

            <button
              type="submit"
              className="h-12 rounded-xl bg-[#F97316] px-6 text-sm font-semibold text-white transition hover:bg-[#EA580C]"
            >
              Buscar
            </button>

            {filtrosAtivos && (
              <Link
                href="/simulados"
                title="Limpar filtros"
                aria-label="Limpar filtros"
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                <X size={17} />
                <span className="sm:hidden">
                  Limpar filtros
                </span>
              </Link>
            )}
          </form>
        </section>

        {/* Lista de avaliações */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Avaliações
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {simulados.length} de {totalSimulados} simulados
              </p>
            </div>
          </div>

          {simulados.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center px-6 py-12 text-center">
              <BookOpen
                size={34}
                strokeWidth={1.5}
                className="text-slate-300"
              />

              <h3 className="mt-4 font-semibold text-slate-800">
                {filtrosAtivos
                  ? "Nenhum simulado encontrado"
                  : "Nenhum simulado cadastrado"}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {filtrosAtivos
                  ? "Tente outro nome ou ano."
                  : "Crie uma avaliação para começar."}
              </p>

              {filtrosAtivos && (
                <Link
                  href="/simulados"
                  className="mt-5 text-sm font-semibold text-[#EA580C] hover:underline"
                >
                  Limpar filtros
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {simulados.map((simulado) => {
                const blocos =
                  simulado._count.blocks;

                const gabaritos =
                  simulado._count.answerKey;

                const resultados =
                  simulado._count.results;

                const semBlocos = blocos === 0;
                const semGabarito = gabaritos === 0;

                const configuracaoBasica =
                  !semBlocos &&
                  gabaritos >= simulado.totalQuestions;

                return (
                  <Link
                    key={simulado.id}
                    href={`/simulados/${simulado.id}`}
                    className="group flex flex-col justify-between gap-4 px-5 py-5 transition hover:bg-orange-50/60 sm:px-6 lg:flex-row lg:items-center"
                  >
                    {/* Identificação */}
                    <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C] transition group-hover:bg-orange-100">
                        <BookOpen size={21} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="break-words text-base font-semibold text-slate-900 transition group-hover:text-[#EA580C]">
                          {simulado.title}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {simulado.grade}º ano
                          <span className="mx-2 text-slate-300">
                            ·
                          </span>
                          {simulado.totalQuestions} questões
                        </p>

                        {/* Orientação ao professor */}
                        {(semBlocos || semGabarito) && (
                          <p className="mt-2 text-xs font-medium text-amber-700">
                            {semBlocos && semGabarito
                              ? "Configure as disciplinas e o gabarito"
                              : semBlocos
                                ? "Configure as disciplinas"
                                : "Adicione o gabarito"}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Informações operacionais */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pl-0 sm:pl-16 lg:gap-8 lg:pl-0">
                      <div>
                        <p className="text-base font-bold tabular-nums text-slate-900">
                          {resultados}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          Resultados
                        </p>
                      </div>

                      <div className="hidden sm:block">
                        <p className="text-base font-bold tabular-nums text-slate-900">
                          {gabaritos}/{simulado.totalQuestions}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          Gabarito
                        </p>
                      </div>

                      <div className="hidden md:block">
                        <p className="text-base font-bold tabular-nums text-slate-900">
                          {blocos}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          Blocos
                        </p>
                      </div>

                      <div
                        className="flex items-center gap-2 text-sm font-semibold text-[#EA580C]"
                      >
                        <span>
                          {configuracaoBasica
                            ? "Abrir simulado"
                            : "Configurar"}
                        </span>
                        <ArrowRight
                          size={17}
                          className="transition group-hover:translate-x-1"
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function MetricCard({
  title,
  value,
  icon,
  featured = false,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  featured?: boolean;
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
            featured ? "text-white/90" : "text-slate-500"
          }`}
        >
          {title}
        </p>

        <span
          className={
            featured ? "text-white/90" : "text-[#F97316]"
          }
        >
          {icon}
        </span>
      </div>

      <p className="relative mt-5 text-4xl font-bold tracking-tight tabular-nums">
        {value.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}

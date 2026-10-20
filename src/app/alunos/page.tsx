
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  ArrowRight,
  ChevronDown,
  GraduationCap,
  Plus,
  Search,
  SlidersHorizontal,
  UsersRound,
  X,
} from "lucide-react";

import { createStudent } from "./actions";
import { AppLayout } from "@/components/AppLayout";
import { prisma } from "@/lib/prisma";

type SearchParams = {
  q?: string;
  ano?: string;
  turma?: string;
};

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const busca = (params.q ?? "").trim();
  const ano = ["1", "2", "3"].includes(params.ano ?? "")
    ? Number(params.ano)
    : null;
  const turmaId = params.turma ?? "";

  const turmas = await prisma.classRoom.findMany({
    orderBy: [
      { grade: "asc" },
      { name: "asc" },
    ],
  });

  const turmasFiltradas = ano
    ? turmas.filter((turma) => turma.grade === ano)
    : turmas;

  const turmaSelecionada = turmasFiltradas.find(
    (turma) => turma.id === turmaId
  );

  const where: Prisma.StudentWhereInput = {};

  if (busca) {
    const numero = Number(busca);

    where.OR = [
      {
        name: {
          contains: busca,
        },
      },
      ...(Number.isInteger(numero) && busca !== ""
        ? [{ number: numero }]
        : []),
    ];
  }

  if (ano !== null || turmaSelecionada) {
    where.classRoom = {
      is: {
        ...(ano !== null ? { grade: ano } : {}),
        ...(turmaSelecionada
          ? { id: turmaSelecionada.id }
          : {}),
      },
    };
  }

  const [alunos, totalAlunos] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        classRoom: true,
        _count: {
          select: {
            results: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.student.count(),
  ]);

  const filtrosAtivos = Boolean(
    busca || ano !== null || turmaId
  );

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1440px] pb-12">
        {/* Cabeçalho */}
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 h-1 w-10 rounded-full bg-[#F97316]" />

            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-[34px]">
              Alunos<span className="text-[#F97316]">.</span>
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {totalAlunos.toLocaleString("pt-BR")} estudantes cadastrados
            </p>
          </div>

          <Link
            href="#cadastro"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#F97316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#EA580C]"
          >
            <Plus size={18} />
            Novo aluno
          </Link>
        </header>

        {/* Filtros */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <form
            action="/alunos"
            method="GET"
            className="flex flex-col gap-3 lg:flex-row lg:items-end"
          >
            <div className="min-w-0 flex-1">
              <label
                htmlFor="busca"
                className="mb-2 block text-xs font-semibold text-slate-600"
              >
                Pesquisar aluno
              </label>

              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="busca"
                  type="search"
                  name="q"
                  defaultValue={busca}
                  placeholder="Nome ou número do aluno"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#F97316] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                />
              </div>
            </div>

            <div className="w-full lg:w-[150px]">
              <label
                htmlFor="ano"
                className="mb-2 block text-xs font-semibold text-slate-600"
              >
                Ano
              </label>

              <select
                id="ano"
                name="ano"
                defaultValue={ano?.toString() ?? ""}
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-500/10"
              >
                <option value="">Todos os anos</option>
                <option value="1">1º ano</option>
                <option value="2">2º ano</option>
                <option value="3">3º ano</option>
              </select>
            </div>

            <div className="w-full lg:w-[200px]">
              <label
                htmlFor="turma"
                className="mb-2 block text-xs font-semibold text-slate-600"
              >
                Turma / Série
              </label>

              <select
                id="turma"
                name="turma"
                defaultValue={turmaSelecionada?.id ?? ""}
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-500/10"
              >
                <option value="">Todas as turmas</option>

                {turmasFiltradas.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#F97316] px-6 text-sm font-semibold text-white transition hover:bg-[#EA580C]"
            >
              <SlidersHorizontal size={17} />
              Filtrar
            </button>

            {filtrosAtivos && (
              <Link
                href="/alunos"
                aria-label="Limpar filtros"
                title="Limpar filtros"
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                <X size={17} />
                <span className="lg:hidden">Limpar filtros</span>
              </Link>
            )}
          </form>
        </section>

        {/* Listagem */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Lista de alunos
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {alunos.length} de {totalAlunos} estudantes
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <UsersRound size={17} className="text-[#F97316]" />
              {alunos.length} encontrados
            </div>
          </div>

          {alunos.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center px-6 py-12 text-center">
              <GraduationCap
                size={34}
                strokeWidth={1.5}
                className="text-slate-300"
              />

              <h3 className="mt-4 font-semibold text-slate-800">
                Nenhum aluno encontrado
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {filtrosAtivos
                  ? "Experimente alterar os filtros."
                  : "Cadastre o primeiro estudante."}
              </p>

              {filtrosAtivos && (
                <Link
                  href="/alunos"
                  className="mt-5 text-sm font-semibold text-[#EA580C] hover:underline"
                >
                  Limpar filtros
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alunos.map((aluno) => (
                <Link
                  key={aluno.id}
                  href={`/alunos/${aluno.id}`}
                  className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-orange-50/60 sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C] transition group-hover:bg-orange-100">
                      <GraduationCap size={20} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-900 transition group-hover:text-[#EA580C] sm:text-base">
                        {aluno.name}
                      </h3>

                      <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm">
                        {aluno.classRoom.name}
                        {" · "}
                        {aluno.classRoom.grade}º ano
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-5 sm:gap-8">
                    <div className="hidden text-right sm:block">
                      <p className="text-sm font-semibold text-slate-900">
                        {aluno.number ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Número
                      </p>
                    </div>

                    <div className="hidden text-right md:block">
                      <p className="text-sm font-semibold text-slate-900">
                        {aluno._count.results}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Simulados
                      </p>
                    </div>

                    <ArrowRight
                      size={18}
                      className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#F97316]"
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Cadastro recolhível */}
        <details
          id="cadastro"
          className="group mt-6 scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 marker:hidden sm:px-6 [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
                <Plus size={20} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  Cadastrar novo aluno
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Adicionar estudante a uma turma
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
              action={createStudent}
              className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)_auto] md:items-end"
            >
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Nome completo
                </span>

                <input
                  name="name"
                  required
                  placeholder="Nome do aluno"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-500/10"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Número
                </span>

                <input
                  name="number"
                  type="number"
                  min="0"
                  placeholder="Número"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-500/10"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Turma
                </span>

                <select
                  name="classRoomId"
                  required
                  defaultValue=""
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-500/10"
                >
                  <option value="" disabled>
                    Selecione a turma
                  </option>

                  {turmas.map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.name} · {turma.grade}º ano
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                disabled={turmas.length === 0}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#F97316] px-5 text-sm font-semibold text-white transition hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={17} />
                Cadastrar
              </button>
            </form>
          </div>
        </details>
      </div>
    </AppLayout>
  );
}

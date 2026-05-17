import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  FileText,
  Layers3,
  Plus,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { AppLayout } from "@/components/AppLayout";
import { createExam } from "./actions";

export default async function SimuladosPage() {
  const turmas = await prisma.classRoom.findMany({
    orderBy: {
      grade: "asc",
    },
  });

  const simulados = await prisma.exam.findMany({
  include: {
    blocks: true,
    answerKey: true,
    results: true,
  },
  orderBy: {
    createdAt: "desc",
  },
});

  return (
    <AppLayout>
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <BookOpen size={28} />
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
            Simulados
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">
            Central operacional para criação, estruturação, correção e análise
            dos simulados escolares.
          </p>
        </div>

        <Link
          href="/simulados#cadastro"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/20"
        >
          <Plus size={18} />
          Novo simulado
        </Link>
      </div>

      <section
        id="cadastro"
        className="mb-8 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-5">
          <h2 className="text-xl font-bold text-zinc-900">
            Criar novo simulado
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Defina a turma, o título e a quantidade total de questões.
          </p>
        </div>

        <form action={createExam} className="grid gap-4 md:grid-cols-4">
          <input
            name="title"
            placeholder="Título do simulado"
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          />

          <select
  name="grade"
  defaultValue=""
  className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
>
  <option value="" disabled>
    Selecione a série
  </option>

  <option value="1">1º ano</option>
  <option value="2">2º ano</option>
  <option value="3">3º ano</option>
</select>
          <input
            name="totalQuestions"
            type="number"
            min="1"
            placeholder="Total de questões"
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          />

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/20"
          >
            <Plus size={18} />
            Criar simulado
          </button>
        </form>
      </section>

      <section className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">
            Simulados cadastrados
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            {simulados.length} avaliações registradas na plataforma
          </p>
        </div>
      </section>

      {simulados.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-zinc-300 bg-white p-16 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100 text-zinc-500">
            <FileText size={30} />
          </div>

          <h2 className="text-2xl font-bold text-zinc-900">
            Nenhum simulado cadastrado
          </h2>

          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-500">
            Crie o primeiro simulado para configurar blocos, gabarito,
            respostas, correção automática e relatórios.
          </p>

          <Link
            href="/simulados#cadastro"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            <Plus size={18} />
            Criar primeiro simulado
          </Link>
        </div>
      ) : (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {simulados.map((simulado) => {
            const gabaritoPreenchido = simulado.answerKey.length;
            const blocosCadastrados = simulado.blocks.length;
            const alunosComResultado = simulado.results.length;

            return (
              <Link
                key={simulado.id}
                href={`/simulados/${simulado.id}`}
                className="group rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-lg"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <BookOpen size={24} />
                  </div>

                  <ArrowRight
                    size={18}
                    className="text-zinc-400 transition group-hover:text-red-600"
                  />
                </div>

                <div className="mb-5">
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-900 group-hover:text-red-700">
                    {simulado.title}
                  </h2>

                  <p className="mt-2 text-sm text-zinc-500">
                    {simulado.grade}º ano
                  </p>
                </div>

                <div className="mb-6 flex flex-wrap gap-2">
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                    {simulado.totalQuestions} questões
                  </span>

                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                    {simulado.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <div className="mb-3 text-zinc-400">
                      <Layers3 size={17} />
                    </div>

                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Blocos
                    </p>

                    <p className="mt-2 text-2xl font-bold text-zinc-900">
                      {blocosCadastrados}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <div className="mb-3 text-zinc-400">
                      <FileText size={17} />
                    </div>

                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Gabarito
                    </p>

                    <p className="mt-2 text-2xl font-bold text-zinc-900">
                      {gabaritoPreenchido}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <div className="mb-3 text-zinc-400">
                      <CalendarDays size={17} />
                    </div>

                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Respostas
                    </p>

                    <p className="mt-2 text-2xl font-bold text-red-600">
                      {alunosComResultado}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </AppLayout>
  );
}
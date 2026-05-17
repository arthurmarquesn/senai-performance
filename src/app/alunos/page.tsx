import Link from "next/link";
import {
  ArrowRight,
  GraduationCap,
  Plus,
  Search,
  Users,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { AppLayout } from "@/components/AppLayout";
import { createStudent } from "./actions";

export default async function AlunosPage() {
  const alunos = await prisma.student.findMany({
    include: {
      classRoom: true,
      results: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const turmas = await prisma.classRoom.findMany({
    orderBy: {
      grade: "asc",
    },
  });

  return (
    <AppLayout>
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <GraduationCap size={28} />
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
            Alunos
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">
            Gerencie estudantes, acompanhe resultados e visualize indicadores
            acadêmicos individuais.
          </p>
        </div>

        <Link
          href="/alunos#cadastro"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/20"
        >
          <Plus size={18} />
          Novo aluno
        </Link>
      </div>

      <section
        id="cadastro"
        className="mb-8 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-5">
          <h2 className="text-xl font-bold text-zinc-900">
            Cadastrar novo aluno
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Vincule o estudante a uma turma para iniciar o acompanhamento.
          </p>
        </div>

        <form action={createStudent} className="grid gap-4 md:grid-cols-4">
          <input
            name="name"
            placeholder="Nome completo"
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          />

          <input
            name="number"
            type="number"
            placeholder="Número"
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          />

          <select
            name="classRoomId"
            defaultValue=""
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          >
            <option value="" disabled>
              Selecione a turma
            </option>

            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/20"
          >
            <Plus size={18} />
            Cadastrar aluno
          </button>
        </form>
      </section>

      <section className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">
            Lista de alunos
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            {alunos.length} estudantes cadastrados
          </p>
        </div>

        <div className="hidden items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm md:flex">
          <Search size={16} className="text-zinc-400" />

          <input
            placeholder="Busca visual futura"
            className="bg-transparent text-sm outline-none"
            disabled
          />
        </div>
      </section>

      {alunos.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-zinc-300 bg-white p-16 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100 text-zinc-500">
            <Users size={30} />
          </div>

          <h2 className="text-2xl font-bold text-zinc-900">
            Nenhum aluno cadastrado
          </h2>

          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-500">
            Cadastre estudantes para acompanhar desempenho, simulados e
            evolução acadêmica.
          </p>

          <Link
            href="/alunos#cadastro"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            <Plus size={18} />
            Cadastrar primeiro aluno
          </Link>
        </div>
      ) : (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {alunos.map((aluno) => (
            <Link
              key={aluno.id}
              href={`/alunos/${aluno.id}`}
              className="group rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-lg"
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <GraduationCap size={24} />
                </div>

                <ArrowRight
                  size={18}
                  className="text-zinc-400 transition group-hover:text-red-600"
                />
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 group-hover:text-red-700">
                {aluno.name}
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                {aluno.classRoom.name}
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Número
                  </p>

                  <p className="mt-2 text-2xl font-bold text-zinc-900">
                    {aluno.number ?? "-"}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Simulados
                  </p>

                  <p className="mt-2 text-2xl font-bold text-red-600">
                    {aluno.results.length}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </AppLayout>
  );
}
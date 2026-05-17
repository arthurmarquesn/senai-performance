import { BookText, FileCheck2, Plus } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { prisma } from "@/lib/prisma";
import { saveEssayCorrection } from "./actions";
import { EssayCorrectionForm } from "@/components/redacoes/EssayCorrectionForm";

export default async function RedacoesPage() {
  const alunos = await prisma.student.findMany({
    include: {
      classRoom: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const simulados = await prisma.exam.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  const redacoes = await prisma.essayCorrection.findMany({
    include: {
      student: {
        include: {
          classRoom: true,
        },
      },
      exam: true,
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
            <BookText size={28} />
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
            Redações
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">
            Correção de redações no modelo ENEM, com lançamento das cinco
            competências, nota total e comentário pedagógico.
          </p>
        </div>
      </div>

      <section className="mb-8 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-zinc-900">
            Corrigir redação
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Informe as notas de 0 a 200 em cada competência.
          </p>
        </div>
    <EssayCorrectionForm
  students={alunos}
  exams={simulados}
/>
      </section>

      <section>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-zinc-900">
            Redações corrigidas
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            {redacoes.length} correções registradas
          </p>
        </div>

        <div className="grid gap-4">
          {redacoes.map((redacao) => (
            <div
              key={redacao.id}
              className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <FileCheck2 size={22} />
                  </div>

                  <h3 className="text-lg font-bold text-zinc-900">
                    {redacao.student.name}
                  </h3>

                  <p className="mt-1 text-sm text-zinc-500">
                    {redacao.student.classRoom.name}
                    {redacao.exam ? ` • ${redacao.exam.title}` : ""}
                  </p>
                </div>

                <div className="rounded-2xl bg-red-50 px-5 py-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                    Nota total
                  </p>

                  <p className="mt-1 text-3xl font-bold text-red-600">
                    {redacao.totalScore}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-5">
                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs text-zinc-500">C1</p>
                  <p className="mt-1 text-xl font-bold">
                    {redacao.competency1}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs text-zinc-500">C2</p>
                  <p className="mt-1 text-xl font-bold">
                    {redacao.competency2}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs text-zinc-500">C3</p>
                  <p className="mt-1 text-xl font-bold">
                    {redacao.competency3}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs text-zinc-500">C4</p>
                  <p className="mt-1 text-xl font-bold">
                    {redacao.competency4}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs text-zinc-500">C5</p>
                  <p className="mt-1 text-xl font-bold">
                    {redacao.competency5}
                  </p>
                </div>
              </div>

              {redacao.comment && (
                <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm leading-relaxed text-zinc-600">
                    {redacao.comment}
                  </p>
                </div>
              )}
            </div>
          ))}

          {redacoes.length === 0 && (
            <div className="rounded-[32px] border border-dashed border-zinc-300 bg-white p-12 text-center shadow-sm">
              <p className="text-sm text-zinc-500">
                Nenhuma redação corrigida ainda.
              </p>
            </div>
          )}
        </div>
      </section>
    </AppLayout>
  );
}
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { prisma } from "@/lib/prisma";

export default async function TurmaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const turma = await prisma.classRoom.findUnique({
    where: { id },
    include: {
      students: {
        orderBy: {
          name: "asc",
        },
      },
    },
  });

  if (!turma) {
    return (
      <AppLayout>
        <p className="text-sm text-zinc-500">Turma não encontrada.</p>
      </AppLayout>
    );
  }

  const simulados = await prisma.exam.findMany({
    where: {
      grade: turma.grade,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">
          {turma.name}
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          {turma.grade}º ano
        </p>
      </div>

      <section className="mb-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Alunos</p>

          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {turma.students.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Simulados da série</p>

          <p className="mt-2 text-3xl font-bold text-red-600">
            {simulados.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Série</p>

          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {turma.grade}º
          </p>
        </div>
      </section>

      <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          Alunos da turma
        </h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {turma.students.map((student) => (
            <Link
              key={student.id}
              href={`/alunos/${student.id}`}
              className="rounded-xl border border-zinc-200 p-4 transition hover:bg-zinc-50"
            >
              <h3 className="font-semibold text-zinc-800">
                {student.name}
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                Nº {student.number ?? "-"}
              </p>
            </Link>
          ))}

          {turma.students.length === 0 && (
            <p className="text-sm text-zinc-500">
              Nenhum aluno cadastrado nesta turma.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          Simulados da série
        </h2>

        <div className="grid gap-4">
          {simulados.map((exam) => (
            <Link
              key={exam.id}
              href={`/simulados/${exam.id}`}
              className="rounded-xl border border-zinc-200 p-4 transition hover:bg-zinc-50"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-zinc-800">
                    {exam.title}
                  </h3>

                  <p className="mt-1 text-sm text-zinc-500">
                    {exam.grade}º ano • {exam.totalQuestions} questões
                  </p>
                </div>

                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
                  {exam.status}
                </span>
              </div>
            </Link>
          ))}

          {simulados.length === 0 && (
            <p className="text-sm text-zinc-500">
              Nenhum simulado cadastrado para esta série.
            </p>
          )}
        </div>
      </section>
    </AppLayout>
  );
}
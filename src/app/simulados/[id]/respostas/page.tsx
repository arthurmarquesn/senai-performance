import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function RespostasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const simulado = await prisma.exam.findUnique({
    where: {
      id,
    },
  });

  if (!simulado) {
    return (
      <main className="min-h-screen bg-zinc-100 p-8">
        <p>Simulado não encontrado.</p>
      </main>
    );
  }

  const alunosDaSerie = await prisma.student.findMany({
    where: {
      classRoom: {
        grade: simulado.grade,
      },
    },
    include: {
      classRoom: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <main className="min-h-screen bg-zinc-100 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">
          Lançar respostas
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          {simulado.title} • {simulado.grade}º ano
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {alunosDaSerie.map((student) => (
          <Link
            key={student.id}
            href={`/simulados/${simulado.id}/respostas/${student.id}`}
            className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <h2 className="font-semibold text-zinc-800">
              {student.name}
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {student.classRoom.name} • Nº {student.number ?? "-"}
            </p>
          </Link>
        ))}

        {alunosDaSerie.length === 0 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Nenhum aluno encontrado para o {simulado.grade}º ano.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
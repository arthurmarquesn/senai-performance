import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ResultadosSimuladoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const simulado = await prisma.exam.findUnique({
    where: {
      id,
    },
    include: {
      answerKey: {
        orderBy: {
          question: "asc",
        },
      },
      results: {
        include: {
          student: {
            include: {
              classRoom: true,
            },
          },
          answers: true,
        },
      },
    },
  });

  if (!simulado) {
    return (
      <main className="min-h-screen bg-zinc-100 p-8">
        <p>Simulado não encontrado.</p>
      </main>
    );
  }

  const exam = simulado;

  const alunosDaSerie = await prisma.student.findMany({
    where: {
      classRoom: {
        grade: exam.grade,
      },
    },
    include: {
      classRoom: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  function calcularResultado(studentId: string) {
    const result = exam.results.find((item) => item.studentId === studentId);

    if (!result) {
      return {
        respondido: false,
        acertos: 0,
        totalValido: exam.answerKey.filter((item) => !item.canceled).length,
        porcentagem: 0,
        respostas: 0,
      };
    }

    let acertos = 0;
    let totalValido = 0;

    for (const gabarito of exam.answerKey) {
      if (gabarito.canceled) continue;

      totalValido++;

      const respostaAluno = result.answers.find(
        (answer) => answer.question === gabarito.question
      );

      if (respostaAluno?.answer === gabarito.answer) {
        acertos++;
      }
    }

    const porcentagem =
      totalValido > 0 ? Math.round((acertos / totalValido) * 100) : 0;

    return {
      respondido: result.answers.length > 0,
      acertos,
      totalValido,
      porcentagem,
      respostas: result.answers.length,
    };
  }

  const alunosRespondidos = alunosDaSerie.filter((student) => {
    const resultado = calcularResultado(student.id);
    return resultado.respondido;
  }).length;

  const questoesValidas = exam.answerKey.filter(
    (item) => !item.canceled
  ).length;

  return (
    <main className="min-h-screen bg-zinc-100 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">
          Resultados do Simulado
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          {exam.title} • {exam.grade}º ano
        </p>
      </div>

      <section className="mb-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Alunos da série</p>

          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {alunosDaSerie.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Com respostas lançadas</p>

          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {alunosRespondidos}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Questões válidas</p>

          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {questoesValidas}
          </p>
        </div>
      </section>

      <section className="grid gap-4">
        {alunosDaSerie.map((student) => {
          const resultado = calcularResultado(student.id);

          return (
            <div
              key={student.id}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-semibold text-zinc-800">
                    {student.name}
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    {student.classRoom.name} • Nº {student.number ?? "-"} •{" "}
                    {resultado.respostas}/{exam.totalQuestions} respostas
                    lançadas
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      resultado.respondido
                        ? "bg-green-100 text-green-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {resultado.respondido ? "Respondido" : "Pendente"}
                  </span>

                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                    {resultado.acertos}/{resultado.totalValido}
                  </span>

                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                    {resultado.porcentagem}%
                  </span>

                  <Link
                    href={`/simulados/${exam.id}/respostas/${student.id}`}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                  >
                    {resultado.respondido
                      ? "Editar respostas"
                      : "Lançar respostas"}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
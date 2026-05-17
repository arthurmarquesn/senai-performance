import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  createBlock,
  saveAnswerKey,
  toggleCanceledQuestion,
} from "./actions";

export default async function SimuladoDetalhePage({
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
      blocks: {
        orderBy: {
          startQuestion: "asc",
        },
      },
      answerKey: {
        orderBy: {
          question: "asc",
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

  const questions = Array.from(
    { length: simulado.totalQuestions },
    (_, index) => index + 1
  );

  return (
    <main className="min-h-screen bg-zinc-100 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">
          {simulado.title}
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          {simulado.grade}º ano • {simulado.totalQuestions} questões
        </p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Link
          href={`/simulados/${simulado.id}/respostas`}
          className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <p className="text-sm text-zinc-500">Etapa</p>
          <h2 className="mt-2 text-lg font-semibold text-zinc-900">
            Lançar respostas
          </h2>
        </Link>

        <Link
          href={`/simulados/${simulado.id}/resultados`}
          className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <p className="text-sm text-zinc-500">Etapa</p>
          <h2 className="mt-2 text-lg font-semibold text-zinc-900">
            Ver resultados
          </h2>
        </Link>

        <Link
          href={`/simulados/${simulado.id}/ranking`}
          className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <p className="text-sm text-zinc-500">Etapa</p>
          <h2 className="mt-2 text-lg font-semibold text-zinc-900">
            Ranking
          </h2>
        </Link>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Status</p>
          <h2 className="mt-2 text-lg font-semibold text-zinc-900">
            {simulado.status}
          </h2>
        </div>
      </div>

      <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Adicionar bloco</h2>

        <form action={createBlock} className="grid gap-4 md:grid-cols-4">
          <input type="hidden" name="examId" value={simulado.id} />

          <select
            name="subject"
            className="rounded-xl border border-zinc-200 px-4 py-3 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Disciplina
            </option>
            <option value="MATEMATICA">Matemática</option>
            <option value="FISICA">Física</option>
            <option value="QUIMICA">Química</option>
            <option value="BIOLOGIA">Biologia</option>
            <option value="PORTUGUES">Português</option>
            <option value="INGLES">Inglês</option>
            <option value="ARTES">Artes</option>
            <option value="EDUCACAO_FISICA">Educação Física</option>
            <option value="SOCIOLOGIA">Sociologia</option>
            <option value="FILOSOFIA">Filosofia</option>
            <option value="GEOGRAFIA">Geografia</option>
            <option value="HISTORIA">História</option>
          </select>

          <input
            name="startQuestion"
            type="number"
            min="1"
            max={simulado.totalQuestions}
            placeholder="Questão inicial"
            className="rounded-xl border border-zinc-200 px-4 py-3 text-sm"
          />

          <input
            name="endQuestion"
            type="number"
            min="1"
            max={simulado.totalQuestions}
            placeholder="Questão final"
            className="rounded-xl border border-zinc-200 px-4 py-3 text-sm"
          />

          <button
            type="submit"
            className="rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white"
          >
            Adicionar bloco
          </button>
        </form>
      </section>

      <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Blocos cadastrados</h2>

        <div className="grid gap-4">
          {simulado.blocks.map((block) => (
            <div
              key={block.id}
              className="rounded-xl border border-zinc-200 p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-zinc-800">
                  {block.subject}
                </h3>

                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
                  {block.startQuestion} → {block.endQuestion}
                </span>
              </div>
            </div>
          ))}

          {simulado.blocks.length === 0 && (
            <p className="text-sm text-zinc-500">
              Nenhum bloco cadastrado ainda.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Gabarito</h2>

        <div className="grid gap-3">
          {questions.map((question) => {
            const currentAnswer = simulado.answerKey.find(
              (item) => item.question === question
            );

            return (
              <form
                key={question}
                action={saveAnswerKey}
                className="flex items-center justify-between rounded-xl border border-zinc-200 p-4"
              >
                <input type="hidden" name="examId" value={simulado.id} />
                <input type="hidden" name="question" value={question} />

                <p className="font-medium text-zinc-800">
                  Questão {question}
                </p>

                <div className="flex items-center gap-2">
                  {["A", "B", "C", "D", "E"].map((alternative) => (
                    <button
                      key={alternative}
                      type="submit"
                      name="answer"
                      value={alternative}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        currentAnswer?.answer === alternative
                          ? "border-red-600 bg-red-600 text-white"
                          : "border-zinc-200 bg-white text-zinc-700"
                      }`}
                    >
                      {alternative}
                    </button>
                  ))}

                  <button
                    formAction={toggleCanceledQuestion}
                    className={`ml-2 rounded-lg px-3 py-2 text-sm font-medium ${
                      currentAnswer?.canceled
                        ? "bg-orange-600 text-white"
                        : "bg-zinc-200 text-zinc-700"
                    }`}
                  >
                    {currentAnswer?.canceled ? "Questão anulada" : "Anular"}
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      </section>
    </main>
  );  
}
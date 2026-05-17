import { prisma } from "@/lib/prisma";
import { saveStudentAnswer } from "./actions";

export default async function LancarRespostasPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const { id, studentId } = await params;

  const simulado = await prisma.exam.findUnique({
    where: { id },
    include: {
      answerKey: {
        orderBy: {
          question: "asc",
        },
      },
    },
  });

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      classRoom: true,
    },
  });

  const result = await prisma.examResult.findUnique({
    where: {
      studentId_examId: {
        studentId,
        examId: id,
      },
    },
    include: {
      answers: true,
    },
  });

  if (!simulado || !student) {
    return (
      <main className="min-h-screen bg-zinc-100 p-8">
        <p>Dados não encontrados.</p>
      </main>
    );
  }

  if (student.classRoom.grade !== simulado.grade) {
    return (
      <main className="min-h-screen bg-zinc-100 p-8">
        <p>Este aluno não pertence à série deste simulado.</p>
      </main>
    );
  }

  const questions = Array.from(
    { length: simulado.totalQuestions },
    (_, index) => index + 1
  );

  let acertos = 0;
  let totalValido = 0;

  for (const gabarito of simulado.answerKey) {
    if (gabarito.canceled) continue;

    totalValido++;

    const respostaAluno = result?.answers.find(
      (answer) => answer.question === gabarito.question
    );

    if (respostaAluno?.answer === gabarito.answer) {
      acertos++;
    }
  }

  const porcentagem =
    totalValido > 0 ? Math.round((acertos / totalValido) * 100) : 0;

  return (
    <main className="min-h-screen bg-zinc-100 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">
          {student.name}
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          {simulado.title} • {simulado.grade}º ano • {student.classRoom.name}
        </p>
      </div>

      <section className="mb-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Acertos</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {acertos}/{totalValido}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Desempenho</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {porcentagem}%
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Questões respondidas</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {result?.answers.length ?? 0}/{simulado.totalQuestions}
          </p>
        </div>
      </section>

      <section className="grid gap-3">
        {questions.map((question) => {
          const currentAnswer = result?.answers.find(
            (answer) => answer.question === question
          );

          const correctAnswer = simulado.answerKey.find(
            (item) => item.question === question
          );

          const isCorrect =
            currentAnswer?.answer &&
            correctAnswer &&
            !correctAnswer.canceled &&
            currentAnswer.answer === correctAnswer.answer;

          const isWrong =
            currentAnswer?.answer &&
            correctAnswer &&
            !correctAnswer.canceled &&
            currentAnswer.answer !== correctAnswer.answer;

          return (
            <form
              key={question}
              action={saveStudentAnswer}
              className="rounded-2xl bg-white p-4 shadow-sm"
            >
              <input type="hidden" name="examId" value={simulado.id} />
              <input type="hidden" name="studentId" value={student.id} />
              <input type="hidden" name="question" value={question} />

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-zinc-800">
                    Questão {question}
                  </p>

                  {correctAnswer && (
                    <p className="mt-1 text-xs text-zinc-500">
                      Gabarito:{" "}
                      {correctAnswer.canceled
                        ? "Questão anulada"
                        : correctAnswer.answer}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
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
                    type="submit"
                    name="answer"
                    value=""
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-500"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="mt-3">
                {correctAnswer?.canceled && (
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                    Anulada
                  </span>
                )}

                {isCorrect && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    Correta
                  </span>
                )}

                {isWrong && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                    Errada
                  </span>
                )}

                {!currentAnswer?.answer && !correctAnswer?.canceled && (
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500">
                    Sem resposta
                  </span>
                )}
              </div>
            </form>
          );
        })}
      </section>
    </main>
  );
}
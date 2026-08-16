import { AppBreadcrumb } from "@/components/AppBreadcrumb";
import { AppLayout } from "@/components/AppLayout";
import {
  Badge,
  MetricCell,
  MetricStrip,
  PageHeader,
  Panel,
} from "@/components/design-system";
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
      <AppLayout>
        <Panel>
          <p className="text-sm text-zinc-500">Dados nao encontrados.</p>
        </Panel>
      </AppLayout>
    );
  }

  if (student.classRoom.grade !== simulado.grade) {
    return (
      <AppLayout>
        <Panel>
          <p className="text-sm text-zinc-500">
            Este aluno nao pertence a serie deste simulado.
          </p>
        </Panel>
      </AppLayout>
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
    <AppLayout>
      <AppBreadcrumb
        items={[
          {
            label: "Simulados",
            href: "/simulados",
          },
          {
            label: simulado.title,
            href: `/simulados/${simulado.id}`,
          },
          {
            label: "Respostas",
            href: `/simulados/${simulado.id}/respostas`,
          },
          {
            label: student.name,
          },
        ]}
      />
      <PageHeader
        eyebrow="Lancamento manual"
        title={student.name}
        description={`${simulado.title} - ${simulado.grade} ano - ${student.classRoom.name}`}
        stats={
          <MetricStrip columns="md:grid-cols-3">
            <MetricCell label="Acertos" value={`${acertos}/${totalValido}`} />
            <MetricCell label="Desempenho" value={`${porcentagem}%`} tone="brand" />
            <MetricCell
              label="Respondidas"
              value={`${result?.answers.length ?? 0}/${simulado.totalQuestions}`}
            />
          </MetricStrip>
        }
      />

      <Panel>
        <div className="grid gap-3">
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
              className="rounded-lg border border-zinc-200 bg-white p-4"
            >
              <input type="hidden" name="examId" value={simulado.id} />
              <input type="hidden" name="studentId" value={student.id} />
              <input type="hidden" name="question" value={question} />

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-zinc-800">
                    Questao {question}
                  </p>

                  {correctAnswer && (
                    <p className="mt-1 text-xs text-zinc-500">
                      Gabarito:{" "}
                      {correctAnswer.canceled
                        ? "Questao anulada"
                        : correctAnswer.answer}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {["A", "B", "C", "D", "E"].map((alternative) => (
                    <button
                      key={alternative}
                      type="submit"
                      name="answer"
                      value={alternative}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        currentAnswer?.answer === alternative
                          ? "border-red-600 bg-red-600 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-red-200 hover:bg-red-50"
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
                  <Badge tone="warning">Anulada</Badge>
                )}

                {isCorrect && (
                  <Badge tone="success">Correta</Badge>
                )}

                {isWrong && (
                  <Badge tone="danger">Errada</Badge>
                )}

                {!currentAnswer?.answer && !correctAnswer?.canceled && (
                  <Badge tone="neutral">Sem resposta</Badge>
                )}
              </div>
            </form>
          );
        })}
        </div>
      </Panel>
    </AppLayout>
  );
}

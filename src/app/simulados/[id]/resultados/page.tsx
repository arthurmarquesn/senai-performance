import Link from "next/link";
import { BarChart3 } from "lucide-react";

import { AppBreadcrumb } from "@/components/AppBreadcrumb";
import { AppLayout } from "@/components/AppLayout";
import {
  Badge,
  MetricCell,
  MetricStrip,
  PageHeader,
  Panel,
  SectionHeader,
} from "@/components/design-system";
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
      <AppLayout>
        <Panel>
          <p className="text-sm text-zinc-500">Simulado nao encontrado.</p>
        </Panel>
      </AppLayout>
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
    <AppLayout>
      <AppBreadcrumb
        items={[
          {
            label: "Simulados",
            href: "/simulados",
          },
          {
            label: exam.title,
            href: `/simulados/${exam.id}`,
          },
          {
            label: "Resultados",
          },
        ]}
      />
      <PageHeader
        eyebrow="Resultados"
        title="Resultados do simulado"
        description={`${exam.title} - ${exam.grade} ano. Visao por aluno com status de lancamento e desempenho.`}
        icon={<BarChart3 size={24} />}
        actions={
          <Link
            href={`/simulados/${exam.id}/ranking`}
            className="performance-secondary-action inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Ver analise por ranking
          </Link>
        }
        stats={
          <MetricStrip columns="md:grid-cols-3">
            <MetricCell label="Alunos da serie" value={alunosDaSerie.length} />
            <MetricCell label="Com respostas" value={alunosRespondidos} tone="brand" />
            <MetricCell label="Questoes validas" value={questoesValidas} />
          </MetricStrip>
        }
      />

      <Panel>
        <SectionHeader
          title="Desempenho por aluno"
          description="Acoes levam ao lancamento manual; resultados oficiais permanecem calculados pelas respostas registradas."
        />

        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {alunosDaSerie.map((student, index) => {
            const resultado = calcularResultado(student.id);

            return (
              <div
                key={student.id}
                className={`performance-data-row grid gap-3 px-4 py-3 md:grid-cols-[minmax(220px,1fr)_120px_120px_110px_auto] md:items-center ${
                  index > 0 ? "border-t border-zinc-200" : ""
                }`}
              >
                <div>
                  <h2 className="font-semibold text-zinc-900">{student.name}</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {student.classRoom.name} - N. {student.number ?? "-"}
                  </p>
                </div>

                <Badge tone={resultado.respondido ? "success" : "neutral"}>
                  {resultado.respondido ? "Respondido" : "Pendente"}
                </Badge>

                <p className="text-sm font-semibold text-zinc-700">
                  {resultado.acertos}/{resultado.totalValido}
                </p>

                <p className="text-sm font-semibold text-red-700">
                  {resultado.porcentagem}%
                </p>

                <Link
                  href={`/simulados/${exam.id}/respostas/${student.id}`}
                  className="performance-primary-action inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-white"
                >
                  {resultado.respondido ? "Editar" : "Lancar"}
                </Link>
              </div>
            );
          })}
        </div>
      </Panel>
    </AppLayout>
  );
}

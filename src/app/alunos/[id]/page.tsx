import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AppLayout } from "@/components/AppLayout";
import { StudentCharts } from "@/components/StudentCharts";
import { EssayStudentCharts } from "@/components/redacoes/EssayStudentCharts";

type HistoricoItem = {
  examId: string;
  examTitle: string;
  acertos: number;
  totalValido: number;
  porcentagem: number;
};

const subjectLabels: Record<string, string> = {
  MATEMATICA: "Matemática",
  FISICA: "Física",
  QUIMICA: "Química",
  BIOLOGIA: "Biologia",
  PORTUGUES: "Português",
  INGLES: "Inglês",
  ARTES: "Artes",
  EDUCACAO_FISICA: "Educação Física",
  SOCIOLOGIA: "Sociologia",
  FILOSOFIA: "Filosofia",
  GEOGRAFIA: "Geografia",
  HISTORIA: "História",
};

const subjectAreaMap: Record<string, string> = {
  MATEMATICA: "Exatas",
  FISICA: "Naturezas",
  QUIMICA: "Naturezas",
  BIOLOGIA: "Naturezas",
  PORTUGUES: "Linguagens",
  INGLES: "Linguagens",
  ARTES: "Linguagens",
  EDUCACAO_FISICA: "Linguagens",
  SOCIOLOGIA: "Humanas",
  FILOSOFIA: "Humanas",
  GEOGRAFIA: "Humanas",
  HISTORIA: "Humanas",
};

function getAnswerByQuestion(answers: any[], question: number) {
  return answers.find((answer: any) => answer.question === question);
}

function calculateResultPercentage(result: any) {
  let acertos = 0;
  let totalValido = 0;

  for (const gabarito of result.exam.answerKey) {
    if (gabarito.canceled) continue;

    totalValido++;

    const respostaAluno = getAnswerByQuestion(
      result.answers,
      gabarito.question
    );

    if (respostaAluno?.answer === gabarito.answer) {
      acertos++;
    }
  }

  const porcentagem =
    totalValido > 0 ? Math.round((acertos / totalValido) * 100) : 0;

  return {
    acertos,
    totalValido,
    porcentagem,
  };
}

function calculateEssayCompetencyAverage(items: any[], key: string) {
  if (items.length === 0) return 0;

  return Math.round(
    items.reduce((acc, item) => acc + Number(item[key] ?? 0), 0) / items.length
  );
}

export default async function AlunoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const aluno = await prisma.student.findUnique({
    where: { id },
    include: {
      classRoom: {
        include: {
          students: {
            include: {
              results: {
                include: {
                  exam: {
                    include: {
                      answerKey: true,
                      blocks: true,
                    },
                  },
                  answers: true,
                },
              },
            },
          },
        },
      },
      results: {
        include: {
          exam: {
            include: {
              answerKey: true,
              blocks: true,
            },
          },
          answers: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      essayCorrections: {
        include: {
          exam: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!aluno) {
    return (
      <AppLayout>
        <p className="text-sm text-zinc-500">Aluno não encontrado.</p>
      </AppLayout>
    );
  }

  const historico: HistoricoItem[] = aluno.results.map((result: any) => {
    const calculated = calculateResultPercentage(result);

    return {
      examId: result.exam.id,
      examTitle: result.exam.title,
      acertos: calculated.acertos,
      totalValido: calculated.totalValido,
      porcentagem: calculated.porcentagem,
    };
  });

  const mediaGeral =
    historico.length > 0
      ? Math.round(
          historico.reduce((acc, item) => acc + item.porcentagem, 0) /
            historico.length
        )
      : 0;

  const melhorDesempenho =
    historico.length > 0
      ? Math.max(...historico.map((item) => item.porcentagem))
      : 0;

  const evolutionData = historico.map((item) => ({
    simulado: item.examTitle,
    desempenho: item.porcentagem,
  }));

  const alunoAreaMap: Record<string, { acertos: number; total: number }> = {
    Humanas: { acertos: 0, total: 0 },
    Linguagens: { acertos: 0, total: 0 },
    Exatas: { acertos: 0, total: 0 },
    Naturezas: { acertos: 0, total: 0 },
  };

  aluno.results.forEach((result: any) => {
    result.exam.blocks.forEach((block: any) => {
      const area = subjectAreaMap[block.subject];

      if (!area) return;

      for (
        let question = block.startQuestion;
        question <= block.endQuestion;
        question++
      ) {
        const gabarito = result.exam.answerKey.find(
          (item: any) => item.question === question
        );

        if (!gabarito || gabarito.canceled) continue;

        alunoAreaMap[area].total++;

        const respostaAluno = getAnswerByQuestion(result.answers, question);

        if (respostaAluno?.answer === gabarito.answer) {
          alunoAreaMap[area].acertos++;
        }
      }
    });
  });

  const turmaAreaMap: Record<string, { acertos: number; total: number }> = {
    Humanas: { acertos: 0, total: 0 },
    Linguagens: { acertos: 0, total: 0 },
    Exatas: { acertos: 0, total: 0 },
    Naturezas: { acertos: 0, total: 0 },
  };

  aluno.classRoom.students.forEach((student: any) => {
    student.results.forEach((result: any) => {
      result.exam.blocks.forEach((block: any) => {
        const area = subjectAreaMap[block.subject];

        if (!area) return;

        for (
          let question = block.startQuestion;
          question <= block.endQuestion;
          question++
        ) {
          const gabarito = result.exam.answerKey.find(
            (item: any) => item.question === question
          );

          if (!gabarito || gabarito.canceled) continue;

          turmaAreaMap[area].total++;

          const respostaAluno = getAnswerByQuestion(result.answers, question);

          if (respostaAluno?.answer === gabarito.answer) {
            turmaAreaMap[area].acertos++;
          }
        }
      });
    });
  });

  const areaComparisonData = [
    "Humanas",
    "Linguagens",
    "Exatas",
    "Naturezas",
  ].map((area) => {
    const alunoData = alunoAreaMap[area];
    const turmaData = turmaAreaMap[area];

    return {
      area,
      aluno:
        alunoData.total > 0
          ? Math.round((alunoData.acertos / alunoData.total) * 100)
          : 0,
      turma:
        turmaData.total > 0
          ? Math.round((turmaData.acertos / turmaData.total) * 100)
          : 0,
    };
  });

  const disciplineByExamData = aluno.results.map((result: any) => {
    const disciplinasMap: Record<string, { acertos: number; total: number }> =
      {};

    result.exam.blocks.forEach((block: any) => {
      const label = subjectLabels[block.subject] ?? block.subject;

      if (!disciplinasMap[label]) {
        disciplinasMap[label] = {
          acertos: 0,
          total: 0,
        };
      }

      for (
        let question = block.startQuestion;
        question <= block.endQuestion;
        question++
      ) {
        const gabarito = result.exam.answerKey.find(
          (item: any) => item.question === question
        );

        if (!gabarito || gabarito.canceled) continue;

        disciplinasMap[label].total++;

        const respostaAluno = getAnswerByQuestion(result.answers, question);

        if (respostaAluno?.answer === gabarito.answer) {
          disciplinasMap[label].acertos++;
        }
      }
    });

    return {
      examId: result.exam.id,
      examTitle: result.exam.title,
      disciplinas: Object.entries(disciplinasMap).map(([disciplina, data]) => ({
        disciplina,
        acertos: data.acertos,
        total: data.total,
        porcentagem:
          data.total > 0 ? Math.round((data.acertos / data.total) * 100) : 0,
      })),
    };
  });

  const essayCorrections = aluno.essayCorrections;

  const essayCompetencyData = [
    {
      competency: "C1",
      score: calculateEssayCompetencyAverage(essayCorrections, "competency1"),
    },
    {
      competency: "C2",
      score: calculateEssayCompetencyAverage(essayCorrections, "competency2"),
    },
    {
      competency: "C3",
      score: calculateEssayCompetencyAverage(essayCorrections, "competency3"),
    },
    {
      competency: "C4",
      score: calculateEssayCompetencyAverage(essayCorrections, "competency4"),
    },
    {
      competency: "C5",
      score: calculateEssayCompetencyAverage(essayCorrections, "competency5"),
    },
  ];

  const essayEvolutionData = essayCorrections
    .slice()
    .reverse()
    .map((item, index) => ({
      label: item.exam ? item.exam.title : `Redação ${index + 1}`,
      totalScore: item.totalScore,
    }));

  return (
    <AppLayout>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">{aluno.name}</h1>

          <p className="mt-2 text-sm text-zinc-500">
            {aluno.classRoom.name} • Nº {aluno.number ?? "-"}
          </p>

         <Link
  href={`/alunos/${aluno.id}/leituras`}
  className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
>
  Recomendações de leitura
</Link>
        </div>

        <Link
          href={`/alunos/${aluno.id}/relatorio`}
          className="rounded-xl bg-red-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-700"
        >
          Gerar PDF
        </Link>
      </div>

      <section className="mb-8 grid gap-6 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Média geral</p>

          <p className="mt-2 text-3xl font-bold text-red-600">
            {mediaGeral}%
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Simulados feitos</p>

          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {historico.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Melhor desempenho</p>

          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {melhorDesempenho}%
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Turma</p>

          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {aluno.classRoom.name}
          </p>
        </div>
      </section>

      <section className="mb-8">
        <StudentCharts
          areaComparisonData={areaComparisonData}
          evolutionData={evolutionData}
          disciplineByExamData={disciplineByExamData}
        />
      </section>

      <section className="mb-8 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Redações</h2>

            <p className="mt-1 text-sm text-zinc-500">
              Correções no modelo ENEM vinculadas ao aluno.
            </p>
          </div>

          <span className="w-fit rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
            {essayCorrections.length} correções
          </span>
        </div>

        {essayCorrections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center">
            <p className="text-sm text-zinc-500">
              Nenhuma redação corrigida para este aluno.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <EssayStudentCharts
                competencyData={essayCompetencyData}
                evolutionData={essayEvolutionData}
              />
            </div>

            <div className="grid gap-4">
              {essayCorrections.map((redacao) => (
                <div
                  key={redacao.id}
                  className="rounded-2xl border border-zinc-200 p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-bold text-zinc-900">
                        {redacao.exam ? redacao.exam.title : "Redação avulsa"}
                      </h3>

                      <p className="mt-1 text-sm text-zinc-500">
                        {redacao.exam
                          ? `${redacao.exam.grade}º ano`
                          : "Sem simulado vinculado"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-red-50 px-5 py-4 text-center">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                        Nota ENEM
                      </p>

                      <p className="mt-1 text-3xl font-bold text-red-600">
                        {redacao.totalScore}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-5">
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
                    <div className="mt-5 rounded-2xl bg-zinc-50 p-4">
                      <p className="text-sm leading-relaxed text-zinc-600">
                        {redacao.comment}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">
          Histórico de simulados
        </h2>

        <div className="grid gap-4">
          {historico.map((item) => (
            <div
              key={item.examId}
              className="rounded-xl border border-zinc-200 p-4"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-800">
                    {item.examTitle}
                  </h3>

                  <p className="mt-1 text-sm text-zinc-500">
                    {item.acertos}/{item.totalValido} acertos
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                    {item.porcentagem}%
                  </span>

                  <Link
                    href={`/simulados/${item.examId}/resultados`}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                  >
                    Ver simulado
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {historico.length === 0 && (
            <p className="text-sm text-zinc-500">
              O aluno ainda não possui simulados respondidos.
            </p>
          )}
        </div>
      </section>
    </AppLayout>
  );
}
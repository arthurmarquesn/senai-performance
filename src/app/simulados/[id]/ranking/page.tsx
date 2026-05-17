import Link from "next/link";
import { prisma } from "@/lib/prisma";

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

function getAnswerByQuestion(answers: any[], question: number) {
  return answers.find((answer: any) => answer.question === question);
}

function getPositionStyle(index: number) {
  if (index === 0) return "bg-yellow-100 text-yellow-700";
  if (index === 1) return "bg-zinc-200 text-zinc-700";
  if (index === 2) return "bg-orange-100 text-orange-700";

  return "bg-zinc-100 text-zinc-500";
}

export default async function RankingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const simulado = await prisma.exam.findUnique({
    where: { id },
    include: {
      answerKey: {
        orderBy: {
          question: "asc",
        },
      },
      blocks: {
        orderBy: {
          startQuestion: "asc",
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

  const exam = simulado

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

  const gabaritoValido = exam.answerKey.filter((item) => !item.canceled);

  const getResultByStudentId = (studentId: string) => {
    return exam.results.find((item) => item.studentId === studentId);
  };

  function calcularResultadoGeral(student: any) {
    const result = getResultByStudentId(student.id);

    if (!result) {
      return {
        student,
        respondido: false,
        acertos: 0,
        totalValido: gabaritoValido.length,
        porcentagem: 0,
        respostas: 0,
      };
    }

    let acertos = 0;
    let totalValido = 0;

    for (const gabarito of exam.answerKey) {
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
      student,
      respondido: result.answers.length > 0,
      acertos,
      totalValido,
      porcentagem,
      respostas: result.answers.length,
    };
  }

  const rankingGeral = alunosDaSerie
    .map((student) => calcularResultadoGeral(student))
    .sort((a, b) => b.porcentagem - a.porcentagem || b.acertos - a.acertos);

  const alunosRespondidos = rankingGeral.filter((item) => item.respondido)
    .length;

  const disciplinasMap: Record<
    string,
    {
      subject: string;
      label: string;
      questions: number[];
    }
  > = {};

  for (const block of simulado.blocks) {
    const subject = block.subject;
    const label = subjectLabels[subject] ?? subject;

    if (!disciplinasMap[subject]) {
      disciplinasMap[subject] = {
        subject,
        label,
        questions: [],
      };
    }

    for (
      let question = block.startQuestion;
      question <= block.endQuestion;
      question++
    ) {
      const gabarito = exam.answerKey.find(
        (item) => item.question === question
      );

      if (!gabarito || gabarito.canceled) continue;

      if (!disciplinasMap[subject].questions.includes(question)) {
        disciplinasMap[subject].questions.push(question);
      }
    }
  }

  const disciplinas = Object.values(disciplinasMap);

  function calcularResultadoDisciplina(student: any, questions: number[]) {
    const result = getResultByStudentId(student.id);

    if (!result) {
      return {
        student,
        respondido: false,
        acertos: 0,
        total: questions.length,
        porcentagem: 0,
      };
    }

    let acertos = 0;

    for (const question of questions) {
      const gabarito = exam.answerKey.find(
        (item) => item.question === question
      );

      if (!gabarito || gabarito.canceled) continue;

      const respostaAluno = getAnswerByQuestion(result.answers, question);

      if (respostaAluno?.answer === gabarito.answer) {
        acertos++;
      }
    }

    const porcentagem =
      questions.length > 0 ? Math.round((acertos / questions.length) * 100) : 0;

    return {
      student,
      respondido: result.answers.length > 0,
      acertos,
      total: questions.length,
      porcentagem,
    };
  }

  const rankingPorDisciplina = disciplinas.map((disciplina) => {
    const ranking = alunosDaSerie
      .map((student) =>
        calcularResultadoDisciplina(student, disciplina.questions)
      )
      .sort((a, b) => b.porcentagem - a.porcentagem || b.acertos - a.acertos);

    return {
      ...disciplina,
      ranking,
    };
  });

  function calcularEstatisticasQuestoes(questions: number[]) {
    return questions.map((question) => {
      const gabarito = exam.answerKey.find(
        (item) => item.question === question
      );

      let acertos = 0;
      let erros = 0;
      let semResposta = 0;

      for (const student of alunosDaSerie) {
        const result = getResultByStudentId(student.id);

        if (!result) {
          semResposta++;
          continue;
        }

        const respostaAluno = getAnswerByQuestion(result.answers, question);

        if (!respostaAluno?.answer) {
          semResposta++;
          continue;
        }

        if (respostaAluno.answer === gabarito?.answer) {
          acertos++;
        } else {
          erros++;
        }
      }

      const totalAlunos = alunosDaSerie.length;

      const taxaAcerto =
        totalAlunos > 0 ? Math.round((acertos / totalAlunos) * 100) : 0;

      const taxaErro =
        totalAlunos > 0 ? Math.round((erros / totalAlunos) * 100) : 0;

      return {
        question,
        answer: gabarito?.answer ?? "-",
        acertos,
        erros,
        semResposta,
        totalAlunos,
        taxaAcerto,
        taxaErro,
      };
    });
  }

  const analisePorDisciplina = disciplinas.map((disciplina) => {
    const estatisticas = calcularEstatisticasQuestoes(disciplina.questions);

    const questoesMaisErradas = [...estatisticas]
      .sort(
        (a, b) =>
          b.erros - a.erros ||
          b.semResposta - a.semResposta ||
          a.taxaAcerto - b.taxaAcerto
      )
      .slice(0, 5);

    const questoesMaisAcertadas = [...estatisticas]
      .sort(
        (a, b) =>
          b.acertos - a.acertos ||
          b.taxaAcerto - a.taxaAcerto ||
          a.erros - b.erros
      )
      .slice(0, 5);

    return {
      ...disciplina,
      estatisticas,
      questoesMaisErradas,
      questoesMaisAcertadas,
    };
  });

  return (
    <main className="min-h-screen bg-zinc-100 p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">
            Ranking do simulado
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            {simulado.title} • {simulado.grade}º ano
          </p>
        </div>

        <Link
          href={`/simulados/${simulado.id}`}
          className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
        >
          Voltar ao simulado
        </Link>
      </div>

      <section className="mb-8 grid gap-6 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Alunos da série</p>

          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {alunosDaSerie.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Com respostas</p>

          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {alunosRespondidos}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Questões válidas</p>

          <p className="mt-2 text-3xl font-bold text-red-600">
            {gabaritoValido.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Disciplinas</p>

          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {disciplinas.length}
          </p>
        </div>
      </section>

      <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">
          Classificação geral
        </h2>

        <div className="grid gap-3">
          {rankingGeral.map((item, index) => (
            <div
              key={item.student.id}
              className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${getPositionStyle(
                    index
                  )}`}
                >
                  {index + 1}
                </div>

                <div>
                  <h3 className="font-semibold text-zinc-900">
                    {item.student.name}
                  </h3>

                  <p className="mt-1 text-sm text-zinc-500">
                    {item.student.classRoom.name} • Nº{" "}
                    {item.student.number ?? "-"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    item.respondido
                      ? "bg-green-100 text-green-700"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {item.respondido ? "Respondido" : "Pendente"}
                </span>

                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                  {item.acertos}/{item.totalValido}
                </span>

                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                  {item.porcentagem}%
                </span>
              </div>
            </div>
          ))}

          {rankingGeral.length === 0 && (
            <p className="text-sm text-zinc-500">
              Nenhum aluno encontrado para esta série.
            </p>
          )}
        </div>
      </section>

      <section className="mb-8 grid gap-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">
            Ranking por disciplina
          </h2>

          <p className="mt-2 text-sm text-zinc-500">
            Classificação dos alunos considerando apenas as questões de cada
            disciplina.
          </p>
        </div>

        {rankingPorDisciplina.map((disciplina) => (
          <div
            key={disciplina.subject}
            className="rounded-2xl bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-bold text-zinc-900">
                  {disciplina.label}
                </h3>

                <p className="mt-1 text-sm text-zinc-500">
                  {disciplina.questions.length} questões válidas
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {disciplina.ranking.slice(0, 10).map((item, index) => (
                <div
                  key={item.student.id}
                  className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${getPositionStyle(
                        index
                      )}`}
                    >
                      {index + 1}
                    </div>

                    <div>
                      <h4 className="font-semibold text-zinc-900">
                        {item.student.name}
                      </h4>

                      <p className="mt-1 text-sm text-zinc-500">
                        {item.student.classRoom.name} • Nº{" "}
                        {item.student.number ?? "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                      {item.acertos}/{item.total}
                    </span>

                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                      {item.porcentagem}%
                    </span>
                  </div>
                </div>
              ))}

              {disciplina.ranking.length === 0 && (
                <p className="text-sm text-zinc-500">
                  Nenhum dado para esta disciplina.
                </p>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">
            Análise de questões por disciplina
          </h2>

          <p className="mt-2 text-sm text-zinc-500">
            Identifique as questões mais acertadas e mais erradas para orientar
            retomadas pedagógicas.
          </p>
        </div>

        {analisePorDisciplina.map((disciplina) => (
          <div
            key={disciplina.subject}
            className="rounded-2xl bg-white p-6 shadow-sm"
          >
            <div className="mb-6">
              <h3 className="text-xl font-bold text-zinc-900">
                {disciplina.label}
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                Análise baseada em {disciplina.questions.length} questões
                válidas.
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 p-5">
                <h4 className="mb-4 font-bold text-zinc-900">
                  Questões mais erradas
                </h4>

                <div className="grid gap-3">
                  {disciplina.questoesMaisErradas.map((item) => (
                    <div
                      key={item.question}
                      className="rounded-xl bg-zinc-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-zinc-900">
                            Questão {item.question}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            Gabarito: {item.answer}
                          </p>
                        </div>

                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                          {item.erros} erros
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-lg bg-white p-2">
                          <p className="text-zinc-500">Acertos</p>
                          <p className="font-bold text-green-700">
                            {item.acertos}
                          </p>
                        </div>

                        <div className="rounded-lg bg-white p-2">
                          <p className="text-zinc-500">Erros</p>
                          <p className="font-bold text-red-700">
                            {item.erros}
                          </p>
                        </div>

                        <div className="rounded-lg bg-white p-2">
                          <p className="text-zinc-500">Sem resposta</p>
                          <p className="font-bold text-zinc-700">
                            {item.semResposta}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 h-2 rounded-full bg-zinc-200">
                        <div
                          className="h-2 rounded-full bg-red-600"
                          style={{ width: `${item.taxaErro}%` }}
                        />
                      </div>

                      <p className="mt-2 text-xs text-zinc-500">
                        Taxa de erro: {item.taxaErro}%
                      </p>
                    </div>
                  ))}

                  {disciplina.questoesMaisErradas.length === 0 && (
                    <p className="text-sm text-zinc-500">
                      Nenhuma questão analisada.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 p-5">
                <h4 className="mb-4 font-bold text-zinc-900">
                  Questões mais acertadas
                </h4>

                <div className="grid gap-3">
                  {disciplina.questoesMaisAcertadas.map((item) => (
                    <div
                      key={item.question}
                      className="rounded-xl bg-zinc-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-zinc-900">
                            Questão {item.question}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            Gabarito: {item.answer}
                          </p>
                        </div>

                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                          {item.acertos} acertos
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-lg bg-white p-2">
                          <p className="text-zinc-500">Acertos</p>
                          <p className="font-bold text-green-700">
                            {item.acertos}
                          </p>
                        </div>

                        <div className="rounded-lg bg-white p-2">
                          <p className="text-zinc-500">Erros</p>
                          <p className="font-bold text-red-700">
                            {item.erros}
                          </p>
                        </div>

                        <div className="rounded-lg bg-white p-2">
                          <p className="text-zinc-500">Sem resposta</p>
                          <p className="font-bold text-zinc-700">
                            {item.semResposta}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 h-2 rounded-full bg-zinc-200">
                        <div
                          className="h-2 rounded-full bg-green-600"
                          style={{ width: `${item.taxaAcerto}%` }}
                        />
                      </div>

                      <p className="mt-2 text-xs text-zinc-500">
                        Taxa de acerto: {item.taxaAcerto}%
                      </p>
                    </div>
                  ))}

                  {disciplina.questoesMaisAcertadas.length === 0 && (
                    <p className="text-sm text-zinc-500">
                      Nenhuma questão analisada.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-zinc-200 p-5">
              <h4 className="mb-4 font-bold text-zinc-900">
                Taxa de acerto por questão
              </h4>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {disciplina.estatisticas.map((item) => (
                  <div
                    key={item.question}
                    className="rounded-xl bg-zinc-50 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-semibold text-zinc-900">
                        Questão {item.question}
                      </p>

                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                        {item.taxaAcerto}%
                      </span>
                    </div>

                    <div className="h-2 rounded-full bg-zinc-200">
                      <div
                        className="h-2 rounded-full bg-red-600"
                        style={{ width: `${item.taxaAcerto}%` }}
                      />
                    </div>

                    <p className="mt-2 text-xs text-zinc-500">
                      {item.acertos} acertos • {item.erros} erros •{" "}
                      {item.semResposta} sem resposta
                    </p>
                  </div>
                ))}

                {disciplina.estatisticas.length === 0 && (
                  <p className="text-sm text-zinc-500">
                    Nenhuma questão válida para esta disciplina.
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        {analisePorDisciplina.length === 0 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Nenhum bloco de disciplina cadastrado para este simulado.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
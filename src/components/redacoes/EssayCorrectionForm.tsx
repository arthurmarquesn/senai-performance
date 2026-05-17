"use client";

import { useMemo, useState } from "react";
import { Save, Trophy } from "lucide-react";
import { saveEssayCorrection } from "@/app/redacoes/actions";
import { CompetencyCard } from "./CompetencyCard";

type Student = {
  id: string;
  name: string;
  classRoom: {
    name: string;
  };
};

type Exam = {
  id: string;
  title: string;
  grade: number;
};

type Props = {
  students: Student[];
  exams: Exam[];
};

export function EssayCorrectionForm({
  students,
  exams,
}: Props) {
  const [scores, setScores] = useState({
    competency1: 0,
    competency2: 0,
    competency3: 0,
    competency4: 0,
    competency5: 0,
  });

  const totalScore = useMemo(() => {
    return (
      scores.competency1 +
      scores.competency2 +
      scores.competency3 +
      scores.competency4 +
      scores.competency5
    );
  }, [scores]);

  return (
    <form
      action={saveEssayCorrection}
      onChange={(event: React.FormEvent<HTMLFormElement>) => {
  const target = event.target;

  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (!target.name.startsWith("competency")) {
    return;
  }

  setScores((previous) => ({
    ...previous,
    [target.name]: Number(target.value),
  }));
}}
      className="grid gap-6"
    >
      <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">
              Correção ENEM
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Avaliação baseada nas cinco competências oficiais do ENEM.
            </p>
          </div>

          <div className="rounded-[24px] bg-red-600 px-6 py-5 text-white shadow-lg shadow-red-600/20">
            <div className="flex items-center gap-3">
              <Trophy size={24} />

              <div>
                <p className="text-xs uppercase tracking-wide text-red-100">
                  Nota total
                </p>

                <p className="text-4xl font-bold">
                  {totalScore}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <select
            name="studentId"
            required
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          >
            <option value="">
              Selecione o aluno
            </option>

            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name} — {student.classRoom.name}
              </option>
            ))}
          </select>

          <select
            name="examId"
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          >
            <option value="">
              Sem simulado vinculado
            </option>

            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title} — {exam.grade}º ano
              </option>
            ))}
          </select>
        </div>
      </div>

      <CompetencyCard
        title="Competência 1"
        description="Demonstrar domínio da modalidade escrita formal da língua portuguesa."
        criteria={[
          "Ortografia adequada",
          "Concordância verbal e nominal",
          "Pontuação adequada",
          "Registro formal mantido",
          "Estrutura sintática consistente",
        ]}
        value={scores.competency1}
        name="competency1"
      />

      <CompetencyCard
        title="Competência 2"
        description="Compreender a proposta de redação e aplicar conceitos das várias áreas do conhecimento."
        criteria={[
          "Tema plenamente compreendido",
          "Uso consistente de repertório",
          "Argumentação conectada ao tema",
          "Boa interpretação da proposta",
          "Desenvolvimento crítico",
        ]}
        value={scores.competency2}
        name="competency2"
      />

      <CompetencyCard
        title="Competência 3"
        description="Selecionar, relacionar e organizar informações para defender um ponto de vista."
        criteria={[
          "Argumentação consistente",
          "Boa progressão textual",
          "Defesa clara de tese",
          "Conexão lógica entre parágrafos",
          "Informações relevantes",
        ]}
        value={scores.competency3}
        name="competency3"
      />

      <CompetencyCard
        title="Competência 4"
        description="Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação."
        criteria={[
          "Uso adequado de conectivos",
          "Boa coesão textual",
          "Encadeamento fluido",
          "Referência textual adequada",
          "Boa articulação das ideias",
        ]}
        value={scores.competency4}
        name="competency4"
      />

      <CompetencyCard
        title="Competência 5"
        description="Elaborar proposta de intervenção para o problema abordado."
        criteria={[
          "Proposta detalhada",
          "Respeito aos direitos humanos",
          "Agente definido",
          "Ação definida",
          "Finalidade clara",
        ]}
        value={scores.competency5}
        name="competency5"
      />

      <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-xl font-bold text-zinc-900">
          Comentário pedagógico
        </h3>

        <textarea
          name="comment"
          rows={8}
          placeholder="Observações da professora..."
          className="w-full rounded-2xl border border-zinc-200 px-4 py-4 text-sm leading-relaxed outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
        />
      </div>

      <button
        type="submit"
        className="inline-flex w-fit items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/20"
      >
        <Save size={18} />
        Salvar correção
      </button>
    </form>
  );
}
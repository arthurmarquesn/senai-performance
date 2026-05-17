"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AreaComparison = {
  area: string;
  aluno: number;
  turma: number;
};

type EvolutionItem = {
  simulado: string;
  desempenho: number;
};

type DisciplineItem = {
  disciplina: string;
  acertos: number;
  total: number;
  porcentagem: number;
};

type DisciplineByExam = {
  examId: string;
  examTitle: string;
  disciplinas: DisciplineItem[];
};

type StudentChartsProps = {
  areaComparisonData: AreaComparison[];
  evolutionData: EvolutionItem[];
  disciplineByExamData: DisciplineByExam[];
};

export function StudentCharts({
  areaComparisonData,
  evolutionData,
  disciplineByExamData,
}: StudentChartsProps) {
  const [selectedExamId, setSelectedExamId] = useState(
    disciplineByExamData[0]?.examId ?? ""
  );

  const selectedExam = useMemo(() => {
    return disciplineByExamData.find(
      (item) => item.examId === selectedExamId
    );
  }, [disciplineByExamData, selectedExamId]);

  return (
    <div className="grid gap-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-xl font-semibold text-zinc-900">
          Perfil por área
        </h2>

        <p className="mb-6 text-sm text-zinc-500">
          Visualização em radar do desempenho do aluno nas grandes áreas.
        </p>

        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={areaComparisonData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="area" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Aluno"
                dataKey="aluno"
                stroke="#dc2626"
                fill="#dc2626"
                fillOpacity={0.35}
              />
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-xl font-semibold text-zinc-900">
          Aluno x Turma por área
        </h2>

        <p className="mb-6 text-sm text-zinc-500">
          Comparação da média do aluno com a média da sala.
        </p>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={areaComparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="area" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="aluno" name="Aluno" fill="#dc2626" />
              <Bar dataKey="turma" name="Turma" fill="#71717a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-xl font-semibold text-zinc-900">
          Evolução entre simulados
        </h2>

        <p className="mb-6 text-sm text-zinc-500">
          Progressão percentual do aluno ao longo dos simulados.
        </p>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="simulado" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="desempenho"
                name="Desempenho"
                stroke="#dc2626"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">
              Acertos por disciplina
            </h2>

            <p className="text-sm text-zinc-500">
              Acertos do aluno por disciplina em um simulado específico.
            </p>
          </div>

          <select
            value={selectedExamId}
            onChange={(event) => setSelectedExamId(event.target.value)}
            className="rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500"
          >
            {disciplineByExamData.map((exam) => (
              <option key={exam.examId} value={exam.examId}>
                {exam.examTitle}
              </option>
            ))}
          </select>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={selectedExam?.disciplinas ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="disciplina" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="acertos" name="Acertos" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
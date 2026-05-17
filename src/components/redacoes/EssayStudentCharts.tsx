"use client";

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

type CompetencyAverageData = {
  competency: string;
  score: number;
};

type EssayEvolutionData = {
  label: string;
  totalScore: number;
};

type EssayStudentChartsProps = {
  competencyData: CompetencyAverageData[];
  evolutionData: EssayEvolutionData[];
};

export function EssayStudentCharts({
  competencyData,
  evolutionData,
}: EssayStudentChartsProps) {
  return (
    <div className="grid gap-8">
      <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-xl font-bold text-zinc-900">
          Perfil de competências
        </h2>

        <p className="mb-6 text-sm text-zinc-500">
          Média do aluno em cada competência da redação ENEM.
        </p>

        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={competencyData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="competency" />
              <PolarRadiusAxis angle={90} domain={[0, 200]} />
              <Radar
                name="Nota"
                dataKey="score"
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

      <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-xl font-bold text-zinc-900">
          Desempenho por competência
        </h2>

        <p className="mb-6 text-sm text-zinc-500">
          Comparação das médias por competência no modelo ENEM.
        </p>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={competencyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="competency" />
              <YAxis domain={[0, 200]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="score" name="Média" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-xl font-bold text-zinc-900">
          Evolução da redação
        </h2>

        <p className="mb-6 text-sm text-zinc-500">
          Evolução da nota total nas correções registradas.
        </p>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis domain={[0, 1000]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="totalScore"
                name="Nota total"
                stroke="#dc2626"
                strokeWidth={3}
                dot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
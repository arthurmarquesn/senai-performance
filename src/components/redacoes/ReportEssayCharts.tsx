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
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type CompetencyData = {
  competency: string;
  score: number;
};

type EvolutionData = {
  label: string;
  totalScore: number;
};

type Props = {
  competencyData: CompetencyData[];
  evolutionData: EvolutionData[];
};

export function ReportEssayCharts({
  competencyData,
  evolutionData,
}: Props) {
  return (
    <div className="grid gap-8">
      <section className="break-inside-avoid rounded-2xl border border-zinc-200 p-6">
        <h2 className="mb-1 text-xl font-bold">
          Perfil de competências da redação
        </h2>

        <p className="mb-5 text-sm text-zinc-500">
          Média do aluno nas cinco competências do modelo ENEM.
        </p>

        <div className="flex w-full justify-center overflow-visible">
          <RadarChart
            width={620}
            height={380}
            data={competencyData}
            margin={{ top: 20, right: 70, bottom: 20, left: 70 }}
          >
            <PolarGrid />
            <PolarAngleAxis dataKey="competency" />
            <PolarRadiusAxis angle={90} domain={[0, 200]} />
            <Radar
              name="Média"
              dataKey="score"
              stroke="#dc2626"
              fill="#dc2626"
              fillOpacity={0.35}
            />
            <Tooltip />
            <Legend />
          </RadarChart>
        </div>
      </section>

      <section className="break-inside-avoid rounded-2xl border border-zinc-200 p-6">
        <h2 className="mb-1 text-xl font-bold">
          Desempenho por competência
        </h2>

        <p className="mb-5 text-sm text-zinc-500">
          Comparação das médias do aluno em C1, C2, C3, C4 e C5.
        </p>

        <div className="flex w-full justify-center overflow-visible">
          <BarChart
            width={760}
            height={360}
            data={competencyData}
            margin={{ top: 20, right: 30, bottom: 20, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="competency" />
            <YAxis domain={[0, 200]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="score" name="Média" fill="#dc2626" />
          </BarChart>
        </div>
      </section>

      <section className="break-inside-avoid rounded-2xl border border-zinc-200 p-6">
        <h2 className="mb-1 text-xl font-bold">
          Evolução da redação
        </h2>

        <p className="mb-5 text-sm text-zinc-500">
          Evolução da nota total nas correções registradas.
        </p>

        <div className="flex w-full justify-center overflow-visible">
          <LineChart
            width={760}
            height={360}
            data={evolutionData}
            margin={{ top: 20, right: 30, bottom: 20, left: 10 }}
          >
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
        </div>
      </section>
    </div>
  );
}
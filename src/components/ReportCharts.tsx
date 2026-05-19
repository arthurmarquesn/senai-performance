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

type AreaComparison = {
  area: string;
  aluno: number;
  turma: number;
};

type EvolutionItem = {
  simulado: string;
  desempenho: number;
};

type ReportChartsProps = {
  areaComparisonData: AreaComparison[];
  evolutionData: EvolutionItem[];
  disciplineData: DisciplineItem[];
};
type DisciplineItem = {
  disciplina: string;
  acertos: number;
  total: number;
  porcentagem: number;
};

export function ReportCharts({
  areaComparisonData,
  evolutionData,
  disciplineData,
}: ReportChartsProps) {
  return (
    <div className="grid gap-8">
      <section className="break-inside-avoid rounded-2xl border border-zinc-200 p-6">
        <h2 className="mb-1 text-xl font-bold">Perfil por área</h2>

        <p className="mb-5 text-sm text-zinc-500">
          Desempenho do aluno nas grandes áreas.
        </p>

        <div className="flex w-full justify-center overflow-visible">
          <RadarChart
            width={620}
            height={380}
            data={areaComparisonData}
            margin={{ top: 20, right: 70, bottom: 20, left: 70 }}
          >
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
        </div>
      </section>

      <section className="break-inside-avoid rounded-2xl border border-zinc-200 p-6">
        <h2 className="mb-1 text-xl font-bold">
          Aluno x Turma por área
        </h2>

        <p className="mb-5 text-sm text-zinc-500">
          Comparação da média do aluno com a média da sala.
        </p>

        <div className="flex w-full justify-center overflow-visible">
          <BarChart
            width={760}
            height={360}
            data={areaComparisonData}
            margin={{ top: 20, right: 30, bottom: 20, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="area" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="aluno" name="Aluno" fill="#dc2626" />
            <Bar dataKey="turma" name="Turma" fill="#71717a" />
          </BarChart>
        </div>
      </section>

      <section className="break-inside-avoid rounded-2xl border border-zinc-200 p-6">
        <h2 className="mb-1 text-xl font-bold">
          Evolução entre simulados
        </h2>

        <p className="mb-5 text-sm text-zinc-500">
          Progressão percentual do aluno ao longo dos simulados.
        </p>

        <div className="flex w-full justify-center overflow-visible">
          <LineChart
            width={760}
            height={360}
            data={evolutionData}
            margin={{ top: 20, right: 30, bottom: 20, left: 10 }}
          >
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
              dot={{ r: 5 }}
            />
          </LineChart>
        </div>
      </section>

      <section className="break-inside-avoid rounded-2xl border border-zinc-200 p-6">
  <h2 className="mb-1 text-xl font-bold">
    Acertos por disciplina
  </h2>

  <p className="mb-5 text-sm text-zinc-500">
    Distribuição dos acertos do aluno por disciplina no último simulado.
  </p>

  <div className="flex w-full justify-center overflow-visible">
    <BarChart
      width={760}
      height={380}
      data={disciplineData}
      margin={{ top: 20, right: 30, bottom: 70, left: 10 }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis
        dataKey="disciplina"
        angle={-35}
        textAnchor="end"
        interval={0}
      />
      <YAxis allowDecimals={false} />
      <Tooltip />
      <Legend />
      <Bar dataKey="porcentagem" name="Acertos" fill="#dc2626" />
    </BarChart>
  </div>
</section>
    </div>
  );
}
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  FileText,
  Layers3,
  Plus,
} from "lucide-react";

import { createExam } from "./actions";
import { AppLayout } from "@/components/AppLayout";
import {
  Badge,
  EmptyState,
  MetricCell,
  MetricStrip,
  PageHeader,
  Panel,
  SectionHeader,
} from "@/components/design-system";
import { prisma } from "@/lib/prisma";

export default async function SimuladosPage() {
  const simulados = await prisma.exam.findMany({
    include: {
      blocks: true,
      answerKey: true,
      results: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalBlocos = simulados.reduce(
    (acc, simulado) => acc + simulado.blocks.length,
    0
  );
  const totalGabaritos = simulados.reduce(
    (acc, simulado) => acc + simulado.answerKey.length,
    0
  );
  const totalResultados = simulados.reduce(
    (acc, simulado) => acc + simulado.results.length,
    0
  );

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Avaliação"
        title="Simulados"
        description="Central de criação, estruturação, correção e análise dos simulados escolares."
        icon={<BookOpen size={24} />}
        actions={
          <Link
            href="/simulados#cadastro"
            className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition active:scale-[0.99]"
          >
            <Plus size={17} />
            Novo simulado
          </Link>
        }
        stats={
          <MetricStrip columns="md:grid-cols-4">
            <MetricCell
              label="Simulados"
              value={simulados.length}
              detail="avaliações cadastradas"
              tone="brand"
            />
            <MetricCell label="Blocos" value={totalBlocos} detail="estruturados" />
            <MetricCell
              label="Gabaritos"
              value={totalGabaritos}
              detail="itens preenchidos"
            />
            <MetricCell
              label="Resultados"
              value={totalResultados}
              detail="alunos com respostas"
              tone="brand"
            />
          </MetricStrip>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel>
          <SectionHeader
            eyebrow="Matriz de avaliações"
            title="Simulados cadastrados"
            description={`${simulados.length} avaliação(ões) registradas na plataforma.`}
          />

          {simulados.length === 0 ? (
            <EmptyState
              title="Nenhum simulado cadastrado"
              description="Crie o primeiro simulado para configurar blocos, gabarito, respostas, correção automática e relatórios."
              action={
                <Link
                  href="/simulados#cadastro"
                  className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <Plus size={17} />
                  Criar primeiro simulado
                </Link>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white/70">
              {simulados.map((simulado, index) => {
                const gabaritoPreenchido = simulado.answerKey.length;
                const blocosCadastrados = simulado.blocks.length;
                const alunosComResultado = simulado.results.length;

                return (
                  <Link
                    key={simulado.id}
                    href={`/simulados/${simulado.id}`}
                    className={`performance-data-row group grid gap-4 px-4 py-4 transition md:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(80px,0.55fr))_auto] md:items-center ${
                      index > 0 ? "border-t border-zinc-200" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="performance-icon-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold tracking-tight text-zinc-950 transition group-hover:text-red-700">
                          {simulado.title}
                        </h3>
                        <p className="mt-1 text-xs text-zinc-500">
                          {simulado.grade}º ano · {simulado.totalQuestions} questões
                        </p>
                      </div>
                    </div>

                    <DataPoint label="Blocos" value={String(blocosCadastrados)} />
                    <DataPoint
                      label="Gabarito"
                      value={String(gabaritoPreenchido)}
                    />
                    <DataPoint
                      label="Respostas"
                      value={String(alunosComResultado)}
                      brand
                    />
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                        Status
                      </p>
                      <div className="mt-1">
                        <Badge tone="brand">{simulado.status}</Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <Badge tone="neutral">Painel</Badge>
                      <ArrowRight
                        size={18}
                        className="text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-red-600"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Panel>

        <aside className="space-y-6">
          <Panel id="cadastro" className="xl:sticky xl:top-24">
            <SectionHeader
              eyebrow="Cadastro"
              title="Criar novo simulado"
              description="Defina a série, o título e a quantidade total de questões."
            />

            <form action={createExam} className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-zinc-800">
                  Título
                </span>
                <input
                  name="title"
                  placeholder="Título do simulado"
                  className="performance-field rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-zinc-800">
                  Série
                </span>
                <select
                  name="grade"
                  defaultValue=""
                  className="performance-field rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                >
                  <option value="" disabled>
                    Selecione a série
                  </option>

                  <option value="1">1º ano</option>
                  <option value="2">2º ano</option>
                  <option value="3">3º ano</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-zinc-800">
                  Total de questões
                </span>
                <input
                  name="totalQuestions"
                  type="number"
                  min="1"
                  placeholder="Total de questões"
                  className="performance-field rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                />
              </label>

              <button
                type="submit"
                className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.99]"
              >
                <Plus size={18} />
                Criar simulado
              </button>
            </form>
          </Panel>

          <Panel>
            <SectionHeader
              eyebrow="Estrutura"
              title="Cobertura técnica"
              description="Resumo dos elementos necessários para análise posterior."
            />
            <div className="grid gap-3">
              <CoverageRow icon={<Layers3 size={17} />} label="Blocos" value={totalBlocos} />
              <CoverageRow icon={<FileText size={17} />} label="Gabaritos" value={totalGabaritos} />
              <CoverageRow icon={<CalendarDays size={17} />} label="Resultados" value={totalResultados} />
            </div>
          </Panel>
        </aside>
      </div>
    </AppLayout>
  );
}

function DataPoint({
  label,
  value,
  brand = false,
}: {
  label: string;
  value: string;
  brand?: boolean;
}) {
  return (
    <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-semibold tracking-tight ${
          brand ? "text-red-600" : "text-zinc-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function CoverageRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-red-600">{icon}</span>
        <p className="text-sm font-semibold text-zinc-950">{label}</p>
      </div>
      <p className="text-lg font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

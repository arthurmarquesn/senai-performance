import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  FileText,
  Plus,
  TrendingUp,
} from "lucide-react";

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

export default async function HomePage() {
  const [
    totalTurmas,
    totalAlunos,
    totalSimulados,
    totalRedacoes,
    totalObras,
    totalLeiturasAtivas,
    ultimosSimulados,
    ultimasRedacoes,
    leiturasRecentes,
  ] = await Promise.all([
    prisma.classRoom.count(),
    prisma.student.count(),
    prisma.exam.count(),
    prisma.essayCorrection.count(),
    prisma.book.count(),
    prisma.bookProgress.count({
      where: {
        status: "READING",
      },
    }),
    prisma.exam.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    prisma.essayCorrection.findMany({
      include: {
        student: {
          include: {
            classRoom: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    prisma.bookProgress.findMany({
      include: {
        book: true,
        student: {
          include: {
            classRoom: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
    }),
  ]);

  const alunosSemLeitura = Math.max(totalAlunos - totalLeiturasAtivas, 0);
  const coberturaLeitura =
    totalAlunos > 0 ? Math.round((totalLeiturasAtivas / totalAlunos) * 100) : 0;

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Visão executiva"
        title="Dashboard institucional"
        description="Síntese operacional de turmas, estudantes, simulados, redações e leitura para apoiar decisões pedagógicas."
        icon={<BarChart3 size={24} />}
        actions={
          <>
            <Link
              href="/simulados"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              Ver simulados
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/assistente"
              className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition active:scale-[0.99]"
            >
              Alfred IA
              <Brain size={16} />
            </Link>
          </>
        }
        stats={
          <MetricStrip columns="md:grid-cols-3 xl:grid-cols-6">
            <MetricCell label="Turmas" value={totalTurmas} />
            <MetricCell label="Alunos" value={totalAlunos} tone="brand" />
            <MetricCell label="Simulados" value={totalSimulados} />
            <MetricCell label="Redações" value={totalRedacoes} />
            <MetricCell label="Obras" value={totalObras} />
            <MetricCell
              label="Leituras ativas"
              value={totalLeiturasAtivas}
              tone="brand"
            />
          </MetricStrip>
        }
      />

      <section className="mb-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel>
          <SectionHeader
            eyebrow="Sinais pedagógicos"
            title="Prioridades do momento"
            description="Pontos de atenção calculados com os dados já disponíveis no sistema."
            action={<Badge tone={alunosSemLeitura > 0 ? "warning" : "success"}>{coberturaLeitura}% leitura ativa</Badge>}
          />

          <div className="grid gap-3 md:grid-cols-3">
            <InsightCard
              icon={<AlertTriangle size={18} />}
              title="Alunos sem leitura ativa"
              value={alunosSemLeitura}
              description="estudante(s) ainda sem leitura em andamento registrada."
              tone="warning"
            />
            <InsightCard
              icon={<FileText size={18} />}
              title="Redações corrigidas"
              value={totalRedacoes}
              description="registro(s) disponíveis para acompanhamento."
            />
            <InsightCard
              icon={<BookOpen size={18} />}
              title="Simulados"
              value={totalSimulados}
              description="avaliação(ões) na base institucional."
            />
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            eyebrow="Acesso rápido"
            title="Fluxos operacionais"
            description="Entradas principais para executar as rotinas do sistema."
          />

          <div className="grid gap-2">
            <QuickAction href="/simulados" label="Criar ou acessar simulados" />
            <QuickAction href="/redacoes" label="Corrigir redações ENEM" />
            <QuickAction href="/leituras" label="Gerenciar + Leitura" />
            <QuickAction href="/repertorio" label="Gerar repertório com IA" />
            <QuickAction href="/alunos" label="Acessar perfis dos alunos" />
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <SectionHeader
            eyebrow="Avaliações"
            title="Últimos simulados"
            description="Avaliações cadastradas recentemente."
            action={
              <Link
                href="/simulados"
                className="text-sm font-semibold text-red-600 hover:text-red-700"
              >
                Ver todos
              </Link>
            }
          />

          <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white/70">
            {ultimosSimulados.length === 0 ? (
              <EmptyState title="Nenhum simulado cadastrado ainda." />
            ) : (
              ultimosSimulados.map((simulado, index) => (
                <Link
                  key={simulado.id}
                  href={`/simulados/${simulado.id}`}
                  className={`performance-data-row group flex items-center justify-between gap-4 px-4 py-4 transition ${
                    index > 0 ? "border-t border-zinc-200" : ""
                  }`}
                >
                  <div>
                    <h3 className="font-semibold text-zinc-950 group-hover:text-red-700">
                      {simulado.title}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      {simulado.grade}º ano · {simulado.totalQuestions} questões
                    </p>
                  </div>
                  <Badge tone="neutral">{simulado.status}</Badge>
                </Link>
              ))
            )}
          </div>
        </Panel>

        <div className="grid gap-6">
          <RecentPanel
            title="Últimas redações"
            icon={<FileText size={18} />}
            empty="Nenhuma redação corrigida ainda."
            items={ultimasRedacoes.map((redacao) => ({
              id: redacao.id,
              title: redacao.student.name,
              detail: `${redacao.student.classRoom.name} · Nota ${redacao.totalScore}`,
            }))}
          />

          <RecentPanel
            title="Leituras recentes"
            icon={<TrendingUp size={18} />}
            empty="Nenhuma leitura registrada ainda."
            items={leiturasRecentes.map((leitura) => ({
              id: leitura.id,
              title: leitura.student.name,
              detail: `${leitura.book.title} · ${leitura.status}`,
            }))}
          />
        </div>
      </section>
    </AppLayout>
  );
}

function InsightCard({
  icon,
  title,
  value,
  description,
  tone = "default",
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  description: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white/70 p-4">
      <div
        className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${
          tone === "warning"
            ? "bg-amber-50 text-amber-700"
            : "bg-red-50 text-red-600"
        }`}
      >
        {icon}
      </div>
      <p className="text-sm font-semibold text-zinc-950">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
        {value}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        {description}
      </p>
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
    >
      <span>{label}</span>
      <Plus size={16} />
    </Link>
  );
}

function RecentPanel({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<{ id: string; title: string; detail: string }>;
  empty: string;
}) {
  return (
    <Panel>
      <SectionHeader
        title={title}
        action={
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
            {icon}
          </div>
        }
      />

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-4 text-sm text-zinc-500">
            {empty}
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"
            >
              <p className="font-semibold text-zinc-950">{item.title}</p>
              <p className="mt-1 text-sm text-zinc-500">{item.detail}</p>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

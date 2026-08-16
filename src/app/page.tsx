import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  FileText,
  Plus,
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
    ultimosSimulados,
    ultimasRedacoes,
  ] = await Promise.all([
    prisma.classRoom.count(),
    prisma.student.count(),
    prisma.exam.count(),
    prisma.essayCorrection.count(),
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
  ]);

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Visao executiva"
        title="Dashboard institucional"
        description="Sintese operacional de turmas, estudantes, simulados e redacoes para apoiar decisoes pedagogicas."
        icon={<BarChart3 size={24} />}
        actions={
          <Link
            href="/simulados"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            Ver simulados
            <ArrowRight size={16} />
          </Link>
        }
        stats={
          <MetricStrip columns="md:grid-cols-4">
            <MetricCell label="Turmas" value={totalTurmas} />
            <MetricCell label="Alunos" value={totalAlunos} tone="brand" />
            <MetricCell label="Simulados" value={totalSimulados} />
            <MetricCell label="Redacoes" value={totalRedacoes} />
          </MetricStrip>
        }
      />

      <section className="mb-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel>
          <SectionHeader
            eyebrow="Sinais pedagogicos"
            title="Prioridades do momento"
            description="Pontos de atencao calculados com os dados ja disponiveis no sistema."
            action={<Badge tone="neutral">R2 navegacao limpa</Badge>}
          />

          <div className="grid gap-3 md:grid-cols-3">
            <InsightCard
              icon={<AlertTriangle size={18} />}
              title="Alunos cadastrados"
              value={totalAlunos}
              description="estudante(s) disponiveis para acompanhamento."
            />
            <InsightCard
              icon={<FileText size={18} />}
              title="Redacoes corrigidas"
              value={totalRedacoes}
              description="registro(s) disponiveis para acompanhamento."
            />
            <InsightCard
              icon={<BookOpen size={18} />}
              title="Simulados"
              value={totalSimulados}
              description="avaliacao(oes) na base institucional."
            />
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            eyebrow="Acesso rapido"
            title="Fluxos operacionais"
            description="Entradas principais para executar as rotinas do sistema."
          />

          <div className="grid gap-2">
            <QuickAction href="/alunos" label="Acessar perfis dos alunos" />
            <QuickAction href="/turmas" label="Gerenciar turmas" />
            <QuickAction href="/simulados" label="Criar ou acessar simulados" />
            <QuickAction href="/redacoes" label="Corrigir redacoes ENEM" />
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <SectionHeader
            eyebrow="Avaliacoes"
            title="Ultimos simulados"
            description="Avaliacoes cadastradas recentemente."
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
                      {simulado.grade} ano - {simulado.totalQuestions} questoes
                    </p>
                  </div>
                  <Badge tone="neutral">{simulado.status}</Badge>
                </Link>
              ))
            )}
          </div>
        </Panel>

        <RecentPanel
          title="Ultimas redacoes"
          icon={<FileText size={18} />}
          empty="Nenhuma redacao corrigida ainda."
          items={ultimasRedacoes.map((redacao) => ({
            id: redacao.id,
            title: redacao.student.name,
            detail: `${redacao.student.classRoom.name} - Nota ${redacao.totalScore}`,
          }))}
        />
      </section>
    </AppLayout>
  );
}

function InsightCard({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white/70 p-4">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
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

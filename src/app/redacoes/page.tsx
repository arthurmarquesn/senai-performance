import { BookText, FileCheck2 } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { EssayCorrectionForm } from "@/components/redacoes/EssayCorrectionForm";
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

export default async function RedacoesPage() {
  const alunos = await prisma.student.findMany({
    include: {
      classRoom: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const simulados = await prisma.exam.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  const redacoes = await prisma.essayCorrection.findMany({
    include: {
      student: {
        include: {
          classRoom: true,
        },
      },
      exam: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const media =
    redacoes.length > 0
      ? Math.round(
          redacoes.reduce((acc, redacao) => acc + redacao.totalScore, 0) /
            redacoes.length
        )
      : 0;

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Produção textual"
        title="Redações"
        description="Correção no modelo ENEM com lançamento das cinco competências, nota total e comentário pedagógico."
        icon={<BookText size={24} />}
        stats={
          <MetricStrip columns="md:grid-cols-4">
            <MetricCell
              label="Correções"
              value={redacoes.length}
              detail="redações registradas"
              tone="brand"
            />
            <MetricCell label="Média" value={media || "-"} detail="nota geral" />
            <MetricCell label="Alunos" value={alunos.length} detail="disponíveis" />
            <MetricCell label="Simulados" value={simulados.length} detail="para vínculo" />
          </MetricStrip>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
        <div className="space-y-6">
          <EssayCorrectionForm students={alunos} exams={simulados} />
        </div>

        <Panel>
          <SectionHeader
            eyebrow="Histórico"
            title="Redações corrigidas"
            description={`${redacoes.length} correção(ões) registradas no sistema.`}
          />

          {redacoes.length === 0 ? (
            <EmptyState title="Nenhuma redação corrigida ainda." />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white/70">
              {redacoes.map((redacao, index) => (
                <div
                  key={redacao.id}
                  className={`performance-data-row px-4 py-4 ${
                    index > 0 ? "border-t border-zinc-200" : ""
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="performance-icon-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                        <FileCheck2 size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold tracking-tight text-zinc-950">
                          {redacao.student.name}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-500">
                          {redacao.student.classRoom.name}
                          {redacao.exam ? ` · ${redacao.exam.title}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                        Nota total
                      </p>
                      <p className="mt-1 text-3xl font-semibold tracking-tight text-red-600">
                        {redacao.totalScore}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-5">
                    <Score label="C1" value={redacao.competency1} />
                    <Score label="C2" value={redacao.competency2} />
                    <Score label="C3" value={redacao.competency3} />
                    <Score label="C4" value={redacao.competency4} />
                    <Score label="C5" value={redacao.competency5} />
                  </div>

                  {redacao.comment && (
                    <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                      <div className="mb-2">
                        <Badge tone="neutral">Comentário pedagógico</Badge>
                      </div>
                      <p className="text-sm leading-relaxed text-zinc-600">
                        {redacao.comment}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </AppLayout>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

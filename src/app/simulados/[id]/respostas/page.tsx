import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";

import { AppBreadcrumb } from "@/components/AppBreadcrumb";
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

export default async function RespostasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const simulado = await prisma.exam.findUnique({
    where: {
      id,
    },
  });

  if (!simulado) {
    return (
      <AppLayout>
        <Panel>
          <p className="text-sm text-zinc-500">Simulado nao encontrado.</p>
        </Panel>
      </AppLayout>
    );
  }

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

  return (
    <AppLayout>
      <AppBreadcrumb
        items={[
          {
            label: "Simulados",
            href: "/simulados",
          },
          {
            label: simulado.title,
            href: `/simulados/${simulado.id}`,
          },
          {
            label: "Respostas",
          },
        ]}
      />
      <PageHeader
        eyebrow="Lancamento manual"
        title="Respostas do simulado"
        description={`${simulado.title} - ${simulado.grade} ano. Selecione um aluno para conferir ou editar respostas.`}
        icon={<ClipboardList size={24} />}
        stats={
          <MetricStrip columns="md:grid-cols-3">
            <MetricCell label="Alunos da serie" value={alunosDaSerie.length} />
            <MetricCell label="Questoes" value={simulado.totalQuestions} />
            <MetricCell label="Status" value={simulado.status} tone="brand" />
          </MetricStrip>
        }
      />

      <Panel>
        <SectionHeader
          title="Alunos elegiveis"
          description="A lista respeita a serie do simulado; a validacao tambem permanece no servidor."
        />

        {alunosDaSerie.length === 0 ? (
          <EmptyState title={`Nenhum aluno encontrado para o ${simulado.grade} ano.`} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {alunosDaSerie.map((student, index) => (
              <Link
                key={student.id}
                href={`/simulados/${simulado.id}/respostas/${student.id}`}
                className={`performance-data-row group grid gap-3 px-4 py-3 md:grid-cols-[minmax(220px,1fr)_160px_120px_auto] md:items-center ${
                  index > 0 ? "border-t border-zinc-200" : ""
                }`}
              >
                <div>
                  <h2 className="font-semibold text-zinc-900 group-hover:text-red-700">
                    {student.name}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    N. {student.number ?? "-"}
                  </p>
                </div>
                <p className="text-sm text-zinc-600">{student.classRoom.name}</p>
                <Badge tone="neutral">{student.classRoom.grade} ano</Badge>
                <div className="flex items-center justify-between gap-2 text-sm font-semibold text-red-700 md:justify-end">
                  Abrir
                  <ArrowRight size={16} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </AppLayout>
  );
}

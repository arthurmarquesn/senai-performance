import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";

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

export default async function TurmaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const turma = await prisma.classRoom.findUnique({
    where: { id },
    include: {
      students: {
        orderBy: {
          name: "asc",
        },
      },
    },
  });

  if (!turma) {
    return (
      <AppLayout>
        <Panel>
          <p className="text-sm text-zinc-500">Turma nao encontrada.</p>
        </Panel>
      </AppLayout>
    );
  }

  const simulados = await prisma.exam.findMany({
    where: {
      grade: turma.grade,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <AppLayout>
      <AppBreadcrumb
        items={[
          {
            label: "Turmas",
            href: "/turmas",
          },
          {
            label: turma.name,
          },
        ]}
      />
      <PageHeader
        eyebrow="Turma"
        title={turma.name}
        description={`${turma.grade} ano - estudantes, simulados compativeis e acesso aos perfis individuais.`}
        icon={<Users size={24} />}
        stats={
          <MetricStrip columns="md:grid-cols-3">
            <MetricCell label="Alunos" value={turma.students.length} tone="brand" />
            <MetricCell label="Simulados da serie" value={simulados.length} />
            <MetricCell label="Serie" value={`${turma.grade} ano`} />
          </MetricStrip>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel>
          <SectionHeader
            title="Alunos da turma"
            description="Acesso rapido aos perfis academicos individuais."
          />

          {turma.students.length === 0 ? (
            <EmptyState title="Nenhum aluno cadastrado nesta turma." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              {turma.students.map((student, index) => (
                <Link
                  key={student.id}
                  href={`/alunos/${student.id}`}
                  className={`performance-data-row group grid gap-3 px-4 py-3 md:grid-cols-[1fr_120px_auto] md:items-center ${
                    index > 0 ? "border-t border-zinc-200" : ""
                  }`}
                >
                  <div>
                    <h3 className="font-semibold text-zinc-900 group-hover:text-red-700">
                      {student.name}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      Numero {student.number ?? "-"}
                    </p>
                  </div>
                  <Badge tone="neutral">{turma.grade} ano</Badge>
                  <div className="flex items-center justify-between gap-2 text-sm font-semibold text-red-700 md:justify-end">
                    Abrir perfil
                    <ArrowRight size={16} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <SectionHeader
            title="Simulados da serie"
            description="Avaliacoes disponiveis para esta turma."
          />

          {simulados.length === 0 ? (
            <EmptyState title="Nenhum simulado cadastrado para esta serie." />
          ) : (
            <div className="space-y-3">
              {simulados.map((exam) => (
                <Link
                  key={exam.id}
                  href={`/simulados/${exam.id}`}
                  className="block rounded-lg border border-zinc-200 bg-white p-4 hover:border-red-200 hover:bg-red-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-zinc-900">{exam.title}</h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {exam.totalQuestions} questoes
                      </p>
                    </div>
                    <Badge tone="brand">{exam.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </AppLayout>
  );
}

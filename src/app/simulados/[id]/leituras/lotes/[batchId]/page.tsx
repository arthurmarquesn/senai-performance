import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, ListChecks } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import {
  Badge,
  MetricCell,
  MetricStrip,
  PageHeader,
  Panel,
  SectionHeader,
  cx,
} from "@/components/design-system";
import { getCurrentUser } from "@/lib/auth";
import {
  getAnswerSheetBatchReviewQueue,
  getRowsForFilter,
  type ReviewQueueFilter,
  type ReviewQueueRow,
} from "@/lib/answer-sheet-review/batch-queue";

const filters: Array<{ id: ReviewQueueFilter; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "attention", label: "Requerem atencao" },
  { id: "blank", label: "Em branco" },
  { id: "partial", label: "Em revisao" },
  { id: "waiting", label: "Aguardando confirmacao" },
  { id: "confirmed", label: "Confirmadas" },
  { id: "problems", label: "Problemas" },
];

function parseFilter(value: string | string[] | undefined): ReviewQueueFilter {
  const raw = Array.isArray(value) ? value[0] : value;

  return filters.some((filter) => filter.id === raw)
    ? (raw as ReviewQueueFilter)
    : "all";
}

function ReviewRowCard({
  row,
  examId,
}: {
  row: ReviewQueueRow;
  examId: string;
}) {
  return (
    <article className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-zinc-950">Pagina {row.pageNumber}</h3>
            <Badge tone={row.problem ? "warning" : row.status === "CONFIRMED" ? "success" : "neutral"}>
              {row.problem ?? row.status}
            </Badge>
          </div>
          <p className="mt-1 truncate text-sm text-zinc-600">
            {row.studentName ?? "Aluno nao identificado"}
          </p>
          <p className="truncate text-xs text-zinc-500">
            {row.classRoomName ?? "-"} | {row.code ?? "Sem codigo PF"}
          </p>
        </div>

        {!row.problem && row.status !== "CONFIRMED" && (
          <Link
            href={`/simulados/${examId}/leituras/${row.scanId}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            Revisar folha
            <ArrowRight size={14} />
          </Link>
        )}
      </div>

      <div className="grid gap-2 text-xs text-zinc-600 sm:grid-cols-4">
        <p>MULTIPLE: {row.multiple}</p>
        <p>UNCERTAIN: {row.uncertain}</p>
        <p>BLANK: {row.blank}</p>
        <p>
          Revisadas: {row.reviewed}/{row.totalAnswers || 60}
        </p>
      </div>

      {row.status === "CONFIRMED" && (
        <p className="text-xs text-zinc-500">
          Confirmada em{" "}
          {row.confirmedAt
            ? new Intl.DateTimeFormat("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(row.confirmedAt)
            : "-"}
        </p>
      )}

      {row.pending > 0 && !row.problem && row.status !== "CONFIRMED" && (
        <p className="text-xs font-medium text-amber-700">
          {row.pending} pendente(s) de revisao humana.
        </p>
      )}
    </article>
  );
}

function QueueSection({
  title,
  description,
  rows,
  examId,
}: {
  title: string;
  description: string;
  rows: ReviewQueueRow[];
  examId: string;
}) {
  return (
    <Panel>
      <SectionHeader title={`${title} (${rows.length})`} description={description} />
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-4 text-sm text-zinc-500">
          Nenhuma folha nesta categoria.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((row) => (
            <ReviewRowCard key={row.scanId} row={row} examId={examId} />
          ))}
        </div>
      )}
    </Panel>
  );
}

export default async function AnswerSheetBatchReviewQueuePage({
  params,
  searchParams,
}: {
  params: Promise<{
    id: string;
    batchId: string;
  }>;
  searchParams: Promise<{
    filtro?: string | string[];
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id, batchId } = await params;
  const { filtro } = await searchParams;
  const activeFilter = parseFilter(filtro);
  const queue = await getAnswerSheetBatchReviewQueue({
    examId: id,
    batchId,
  });

  if (!queue) {
    notFound();
  }

  const filteredRows = getRowsForFilter(queue, activeFilter);

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Fila de revisao"
        title={queue.sourceFileName}
        description={`${queue.examTitle} | Processamento optico concluido nao significa revisao humana concluida.`}
        icon={<ListChecks size={24} />}
        actions={
          <Link
            href={`/simulados/${id}`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <ArrowLeft size={16} />
            Voltar
          </Link>
        }
        stats={
          <MetricStrip columns="md:grid-cols-7">
            <MetricCell label="Paginas" value={queue.totalPages} />
            <MetricCell label="Identificadas" value={queue.identifiedPages} />
            <MetricCell label="Processadas" value={queue.processedPages} />
            <MetricCell label="Revisao" value={queue.reviewRequiredPages} />
            <MetricCell label="Confirmadas" value={queue.confirmedPages} />
            <MetricCell label="Falhas" value={queue.failedPages} />
            <MetricCell label="Status lote" value={queue.status} tone="brand" />
          </MetricStrip>
        }
      />

      <div className="grid gap-6">
        <Panel>
          <SectionHeader
            title="Resumo optico"
            description="Contagens vindas do banco, sem consultar gabarito oficial."
          />
          <MetricStrip columns="md:grid-cols-4">
            <MetricCell label="DETECTED" value={queue.opticalSummary.detected} />
            <MetricCell label="BLANK" value={queue.opticalSummary.blank} />
            <MetricCell label="MULTIPLE" value={queue.opticalSummary.multiple} />
            <MetricCell label="UNCERTAIN" value={queue.opticalSummary.uncertain} />
          </MetricStrip>
        </Panel>

        <Panel>
          <SectionHeader
            title="Filtros"
            description="A fila organiza as folhas por prioridade operacional."
          />
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Link
                key={filter.id}
                href={`/simulados/${id}/leituras/lotes/${batchId}?filtro=${filter.id}`}
                className={cx(
                  "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                  activeFilter === filter.id
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                )}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </Panel>

        {activeFilter === "all" ? (
          <>
            <QueueSection
              title="Requerem atencao"
              description="Ordenacao: mais MULTIPLE, depois mais UNCERTAIN, depois menor pagina."
              rows={queue.groups.attention}
              examId={id}
            />
            <QueueSection
              title="Em branco pendente"
              description="BLANK nao e erro optico automatico, mas exige confirmacao humana nesta fase."
              rows={queue.groups.blank}
              examId={id}
            />
            <QueueSection
              title="Revisao em andamento"
              description="Folhas com parte das questoes revisada e parte pendente."
              rows={queue.groups.partial}
              examId={id}
            />
            <QueueSection
              title="Aguardando confirmacao"
              description="Folhas processadas que ainda precisam passar pela revisao individual."
              rows={queue.groups.waiting}
              examId={id}
            />
            <QueueSection
              title="Confirmadas"
              description="Folhas ja confirmadas por humano; nao aparecem como pendencia."
              rows={queue.groups.confirmed}
              examId={id}
            />
            <QueueSection
              title="Problemas de pipeline"
              description="Falhas tecnicas, duplicidades ou paginas sem identificacao/normalizacao."
              rows={queue.groups.problems}
              examId={id}
            />
          </>
        ) : (
          <QueueSection
            title={filters.find((filter) => filter.id === activeFilter)?.label ?? "Filtro"}
            description="Resultado do filtro selecionado."
            rows={filteredRows}
            examId={id}
          />
        )}
      </div>
    </AppLayout>
  );
}

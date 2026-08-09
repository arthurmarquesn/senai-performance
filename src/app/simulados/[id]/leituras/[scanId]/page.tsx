import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { DetectedAnswerStatus } from "@prisma/client";

import {
  CompleteScanReviewForm,
  ConfirmClearReadingsForm,
  ReviewQuestionForm,
} from "@/components/AnswerSheetReviewForms";
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
  getAnswerSheetScanReview,
  type ReviewAnswer,
} from "@/lib/answer-sheet-review/queries";
import { getNextReviewQueueTarget } from "@/lib/answer-sheet-review/batch-queue";

const alternatives = ["A", "B", "C", "D", "E"] as const;

function formatScore(value: number | null) {
  return value === null ? "-" : value.toFixed(3);
}

function statusTone(status: ReviewAnswer["detectionStatus"]) {
  if (status === DetectedAnswerStatus.DETECTED) {
    return "success" as const;
  }

  if (status === DetectedAnswerStatus.BLANK) {
    return "warning" as const;
  }

  return "brand" as const;
}

function finalAnswerLabel(answer: ReviewAnswer) {
  if (!answer.reviewed) {
    return "Pendente";
  }

  return answer.finalAnswer ?? "Em branco";
}

function answerScore(answer: ReviewAnswer, alternative: string) {
  if (alternative === "A") return answer.fillA;
  if (alternative === "B") return answer.fillB;
  if (alternative === "C") return answer.fillC;
  if (alternative === "D") return answer.fillD;

  return answer.fillE;
}

function QuestionReviewCard({
  examId,
  scanId,
  answer,
}: {
  examId: string;
  scanId: string;
  answer: ReviewAnswer;
}) {
  const maxScore = Math.max(
    ...alternatives.map((alternative) => answerScore(answer, alternative) ?? 0),
    0.001
  );

  return (
    <article className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-950">
              Q{answer.question}
            </h3>
            <Badge tone={statusTone(answer.detectionStatus)}>
              {answer.detectionStatus}
            </Badge>
            <Badge tone={answer.reviewed ? "success" : "neutral"}>
              {finalAnswerLabel(answer)}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Detectada: {answer.detectedAnswer ?? "-"}
          </p>
        </div>
      </div>

      <Image
        src={`/simulados/${examId}/leituras/${scanId}/questoes/${answer.question}/crop`}
        alt={`Recorte da questao ${answer.question}`}
        width={520}
        height={96}
        unoptimized
        className="w-full rounded-xl border border-zinc-200 bg-white object-contain"
      />

      <div className="grid gap-2">
        {alternatives.map((alternative) => {
          const score = answerScore(answer, alternative);
          const width = `${Math.max(((score ?? 0) / maxScore) * 100, 3)}%`;

          return (
            <div
              key={alternative}
              className="grid grid-cols-[24px_1fr_54px] items-center gap-2 text-xs"
            >
              <span className="font-semibold text-zinc-800">{alternative}</span>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={cx(
                    "h-full rounded-full",
                    answer.detectedAnswer === alternative
                      ? "bg-red-500"
                      : "bg-zinc-300"
                  )}
                  style={{
                    width,
                  }}
                />
              </div>
              <span className="text-right tabular-nums text-zinc-600">
                {formatScore(score)}
              </span>
            </div>
          );
        })}
      </div>

      <ReviewQuestionForm
        examId={examId}
        scanId={scanId}
        question={answer.question}
        currentFinalAnswer={answer.reviewed ? answer.finalAnswer : undefined}
      />
    </article>
  );
}

function QuestionSection({
  title,
  description,
  emptyText,
  answers,
  examId,
  scanId,
}: {
  title: string;
  description: string;
  emptyText: string;
  answers: ReviewAnswer[];
  examId: string;
  scanId: string;
}) {
  return (
    <Panel>
      <SectionHeader title={title} description={description} />
      {answers.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-4 text-sm text-zinc-500">
          {emptyText}
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {answers.map((answer) => (
            <QuestionReviewCard
              key={answer.id}
              examId={examId}
              scanId={scanId}
              answer={answer}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

export default async function AnswerSheetScanReviewPage({
  params,
}: {
  params: Promise<{
    id: string;
    scanId: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id, scanId } = await params;
  const review = await getAnswerSheetScanReview({
    examId: id,
    scanId,
  });

  if (!review) {
    notFound();
  }

  const attention = review.answers.filter(
    (answer) =>
      answer.detectionStatus === DetectedAnswerStatus.MULTIPLE ||
      answer.detectionStatus === DetectedAnswerStatus.UNCERTAIN
  );
  const blanks = review.answers.filter(
    (answer) => answer.detectionStatus === DetectedAnswerStatus.BLANK
  );
  const detected = review.answers.filter(
    (answer) => answer.detectionStatus === DetectedAnswerStatus.DETECTED
  );
  const nextPending = await getNextReviewQueueTarget({
    examId: id,
    scanId,
  });

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Revisao humana"
        title={`Folha ${review.code}`}
        description={`${review.studentName} - ${review.classRoomName} - pagina ${review.pageNumber} - ${review.examTitle}`}
        icon={<ClipboardCheck size={24} />}
        actions={
          <>
            <Link
              href={`/simulados/${review.examId}/leituras/lotes/${review.batchId}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <ArrowLeft size={16} />
              Fila do lote
            </Link>
            {nextPending && (
              <Link
                href={`/simulados/${review.examId}/leituras/${nextPending.scanId}`}
                className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white"
              >
                Proxima pendencia
              </Link>
            )}
          </>
        }
        stats={
          <MetricStrip columns="md:grid-cols-6">
            <MetricCell label="Questoes" value={review.summary.total} />
            <MetricCell label="DETECTED" value={review.summary.detected} />
            <MetricCell label="BLANK" value={review.summary.blank} />
            <MetricCell label="MULTIPLE" value={review.summary.multiple} />
            <MetricCell label="UNCERTAIN" value={review.summary.uncertain} />
            <MetricCell
              label="Revisadas"
              value={`${review.summary.reviewed}/${review.summary.total}`}
              tone={review.summary.pending === 0 ? "brand" : "default"}
            />
          </MetricStrip>
        }
      />

      <div className="grid gap-6">
        <Panel>
          <SectionHeader
            title="Acoes da folha"
            description="Confirme automaticamente apenas leituras DETECTED ainda nao revisadas ou conclua quando todas estiverem revisadas."
          />
          <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="mb-3 text-sm text-zinc-600">
                BLANK, MULTIPLE e UNCERTAIN continuam exigindo decisao humana.
              </p>
              <ConfirmClearReadingsForm examId={id} scanId={scanId} />
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="mb-3 text-sm text-zinc-600">
                A conclusao so funciona quando todas as 60 questoes estiverem
                revisadas.
              </p>
              <CompleteScanReviewForm examId={id} scanId={scanId} />
            </div>
          </div>
        </Panel>

        <QuestionSection
          title="Requerem atencao"
          description="MULTIPLE e UNCERTAIN aparecem primeiro para evitar revisar leituras claras antes das excecoes."
          emptyText="Nenhuma questao MULTIPLE ou UNCERTAIN nesta folha."
          answers={attention}
          examId={id}
          scanId={scanId}
        />

        <QuestionSection
          title="Em branco"
          description="BLANK fica separado para confirmacao humana explicita."
          emptyText="Nenhuma questao BLANK nesta folha."
          answers={blanks}
          examId={id}
          scanId={scanId}
        />

        <QuestionSection
          title="Leituras detectadas"
          description="Estas podem ser confirmadas em grupo, mas continuam editaveis individualmente."
          emptyText="Nenhuma questao DETECTED nesta folha."
          answers={detected}
          examId={id}
          scanId={scanId}
        />
      </div>
    </AppLayout>
  );
}

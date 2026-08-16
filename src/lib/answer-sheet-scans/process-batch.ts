import {
  AnswerSheetScanStatus,
  ScanBatchStatus,
} from "@prisma/client";

import {
  processAnswerSheetScan,
  type ProcessAnswerSheetScanSummary,
} from "@/lib/answer-sheet-scans/process-answers";
import { prisma } from "@/lib/prisma";

type BatchScanCandidate = {
  id: string;
  pageNumber: number;
  answerSheetId: string | null;
  normalizedImageKey: string | null;
  status: AnswerSheetScanStatus;
  answers: Array<{
    reviewed: boolean;
    finalAnswer: string | null;
  }>;
};

export type BatchPageProcessResult =
  | {
      kind: "PROCESSED";
      scanId: string;
      pageNumber: number;
      status: "PROCESSED" | "REVIEW_REQUIRED";
      detected: number;
      blank: number;
      multiple: number;
      uncertain: number;
      persistedAnswers: number;
    }
  | {
      kind:
        | "SKIPPED_CONFIRMED"
        | "SKIPPED_HUMAN_DECISION"
        | "SKIPPED_NOT_IDENTIFIED"
        | "SKIPPED_NOT_NORMALIZED";
      scanId: string;
      pageNumber: number;
      status: AnswerSheetScanStatus;
      reason: string;
    }
  | {
      kind: "FAILED";
      scanId: string;
      pageNumber: number;
      reason: string;
    };

export type BatchCountersSummary = {
  totalPages: number;
  identifiedPages: number;
  processedPages: number;
  reviewRequiredPages: number;
  confirmedPages: number;
  detectedAnswerTotal: number;
  status: ScanBatchStatus;
};

export type ProcessAnswerSheetScanBatchSummary =
  BatchCountersSummary & {
    batchId: string;
    eligiblePages: number;
    processedNow: number;

    /*
     * Campo mantido temporariamente para compatibilidade com
     * actions.ts e componentes existentes.
     *
     * No novo fluxo, diagnóstico óptico não exige revisão.
     * Portanto normalmente será zero.
     */
    reviewRequiredNow: number;

    /*
     * Campos legados mantidos enquanto a interface antiga ainda
     * existe. Eles serão removidos/simplificados quando alterarmos
     * actions.ts e /simulados/[id].
     */
    previouslyConfirmed: number;
    protectedPages: number;
    skippedNotIdentified: number;
    skippedNotNormalized: number;

    technicalFailures: number;
    durationMs: number;
    results: BatchPageProcessResult[];
  };

function hasExistingHumanDecision(
  scan: BatchScanCandidate
) {
  return scan.answers.some(
    (answer) =>
      answer.reviewed ||
      answer.finalAnswer !== null
  );
}

function summarizeProcessed(
  result: ProcessAnswerSheetScanSummary
): BatchPageProcessResult {
  return {
    kind: "PROCESSED",
    scanId: result.scanId,
    pageNumber: result.pageNumber,
    status: result.status,
    detected: result.detected,
    blank: result.blank,
    multiple: result.multiple,
    uncertain: result.uncertain,
    persistedAnswers: result.persistedAnswers,
  };
}

async function recalculateBatchCounters(
  batchId: string
): Promise<BatchCountersSummary> {
  const batch =
    await prisma.answerSheetScanBatch.findUnique({
      where: {
        id: batchId,
      },
      include: {
        examApplication: {
          select: {
            exam: {
              select: {
                totalQuestions: true,
              },
            },
          },
        },
        scans: {
          include: {
            answers: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

  if (!batch) {
    throw new Error(
      "Lote de digitalizacao nao encontrado."
    );
  }

  const totalQuestions =
    batch.examApplication.exam.totalQuestions;

  const identifiedPages =
    batch.scans.filter(
      (scan) => Boolean(scan.answerSheetId)
    ).length;

  /*
   * Página processada significa:
   *
   * - conseguimos associá-la a uma AnswerSheet;
   * - todas as questões geraram DetectedAnswer;
   * - o processamento óptico terminou.
   *
   * BLANK, MULTIPLE e UNCERTAIN também possuem DetectedAnswer e
   * não impedem que a página seja considerada processada.
   */
  const processedPages =
    batch.scans.filter(
      (scan) =>
        Boolean(scan.answerSheetId) &&
        scan.answers.length === totalQuestions &&
        (
          scan.status ===
            AnswerSheetScanStatus.PROCESSED ||
          scan.status ===
            AnswerSheetScanStatus.CONFIRMED
        )
    ).length;

  /*
   * "reviewRequiredPages" é um nome legado do schema.
   *
   * A partir deste fluxo ele não representa mais:
   *
   * UNCERTAIN
   * MULTIPLE
   * BLANK
   *
   * Ele passa, temporariamente, a funcionar como contador de
   * páginas que NÃO conseguiram concluir tecnicamente.
   */
  const reviewRequiredPages =
    Math.max(
      0,
      batch.totalPages - processedPages
    );

  /*
   * CONFIRMED é mantido apenas porque o enum existente ainda não
   * possui um status chamado COMPLETED.
   *
   * Na interface, posteriormente, CONFIRMED será apresentado como
   * "Concluído", sem qualquer conceito de confirmação humana.
   *
   * Se existir ao menos uma página que não terminou, usamos
   * REVIEW_REQUIRED internamente, mas a UI exibirá
   * "Concluído com ocorrências".
   */
  const status =
    batch.totalPages > 0 &&
    processedPages === batch.totalPages
      ? ScanBatchStatus.CONFIRMED
      : ScanBatchStatus.REVIEW_REQUIRED;

  const confirmedPages =
    batch.scans.filter(
      (scan) =>
        scan.status ===
        AnswerSheetScanStatus.CONFIRMED
    ).length;

  const detectedAnswerTotal =
    batch.scans.reduce(
      (sum, scan) =>
        sum + scan.answers.length,
      0
    );

  await prisma.answerSheetScanBatch.update({
    where: {
      id: batch.id,
    },
    data: {
      processedPages,
      identifiedPages,
      reviewRequiredPages,
      confirmedPages,
      status,
      completedAt: new Date(),
    },
  });

  return {
    totalPages: batch.totalPages,
    identifiedPages,
    processedPages,
    reviewRequiredPages,
    confirmedPages,
    detectedAnswerTotal,
    status,
  };
}

export async function processAnswerSheetScanBatch({
  examId,
  examApplicationId,
  batchId,
}: {
  examId: string;
  examApplicationId: string;
  batchId: string;
}): Promise<ProcessAnswerSheetScanBatchSummary> {
  const startedAt = Date.now();

  const batch =
    await prisma.answerSheetScanBatch.findFirst({
      where: {
        id: batchId,
        examApplicationId,
        examApplication: {
          examId,
        },
      },
      include: {
        scans: {
          orderBy: {
            pageNumber: "asc",
          },
          select: {
            id: true,
            pageNumber: true,
            answerSheetId: true,
            normalizedImageKey: true,
            status: true,
            answers: {
              select: {
                reviewed: true,
                finalAnswer: true,
              },
            },
          },
        },
      },
    });

  if (!batch) {
    throw new Error(
      "Lote de digitalizacao nao encontrado."
    );
  }

  await prisma.answerSheetScanBatch.update({
    where: {
      id: batch.id,
    },
    data: {
      status: ScanBatchStatus.PROCESSING,
      startedAt:
        batch.startedAt ?? new Date(),
      completedAt: null,
    },
  });

  const results: BatchPageProcessResult[] = [];

  /*
   * ==============================================================
   * PROCESSAMENTO INDEPENDENTE POR PÁGINA
   * ==============================================================
   *
   * Uma página com problema NÃO interrompe o restante do lote.
   *
   * Exemplo:
   *
   * 32 páginas
   * página 17 falha
   *
   * → página 18 continua
   * → página 19 continua
   * → ...
   * → 31 resultados podem ficar válidos normalmente.
   */
  for (const scan of batch.scans) {
    /*
     * ============================================================
     * PROTEÇÃO DE DADOS LEGADOS JÁ CONFIRMADOS
     * ============================================================
     *
     * Isto NÃO representa uma etapa obrigatória do novo fluxo.
     *
     * Serve somente para não sobrescrever dados antigos que tenham
     * sido explicitamente confirmados antes desta mudança.
     */
    if (
      scan.status ===
      AnswerSheetScanStatus.CONFIRMED
    ) {
      results.push({
        kind: "SKIPPED_CONFIRMED",
        scanId: scan.id,
        pageNumber: scan.pageNumber,
        status: scan.status,
        reason:
          "Folha antiga ja consolidada; dados preservados.",
      });

      continue;
    }

    /*
     * Mesma ideia:
     *
     * uma decisão humana preexistente não deve ser destruída por um
     * reprocessamento automático.
     *
     * Em uma importação nova isso não acontece, portanto não cria
     * qualquer gate no fluxo normal.
     */
    if (hasExistingHumanDecision(scan)) {
      results.push({
        kind: "SKIPPED_HUMAN_DECISION",
        scanId: scan.id,
        pageNumber: scan.pageNumber,
        status: scan.status,
        reason:
          "Folha possui decisao humana preexistente e foi preservada.",
      });

      continue;
    }

    /*
     * ============================================================
     * SEM IDENTIFICAÇÃO
     * ============================================================
     *
     * Aqui existe uma impossibilidade real:
     *
     * sem AnswerSheet não sabemos a qual aluno devemos associar
     * StudentAnswer.
     *
     * A página vira ocorrência, mas o lote continua.
     */
    if (!scan.answerSheetId) {
      results.push({
        kind: "SKIPPED_NOT_IDENTIFIED",
        scanId: scan.id,
        pageNumber: scan.pageNumber,
        status: scan.status,
        reason:
          "Nao foi possivel identificar o aluno desta pagina.",
      });

      continue;
    }

    /*
     * ============================================================
     * PREPARAÇÃO TÉCNICA DA IMAGEM
     * ============================================================
     *
     * Isto NÃO será uma etapa para o professor.
     *
     * O algoritmo atual ainda depende internamente da imagem
     * preparada em coordenadas canônicas.
     *
     * Quando alterarmos actions.ts, essa preparação será executada
     * automaticamente antes deste processamento.
     */
    if (!scan.normalizedImageKey) {
      await prisma.answerSheetScan.update({
        where: {
          id: scan.id,
        },
        data: {
          status:
            AnswerSheetScanStatus.FAILED,
          processedAt: new Date(),
        },
      });

      results.push({
        kind: "SKIPPED_NOT_NORMALIZED",
        scanId: scan.id,
        pageNumber: scan.pageNumber,
        status:
          AnswerSheetScanStatus.FAILED,
        reason:
          "A preparacao tecnica da imagem nao foi concluida.",
      });

      continue;
    }

    /*
     * ============================================================
     * LEITURA + PERSISTÊNCIA
     * ============================================================
     *
     * processAnswerSheetScan agora faz:
     *
     * imagem
     * → DetectedAnswer
     * → ExamResult
     * → StudentAnswer
     * → AnswerSheet CORRECTED
     */
    try {
      const pageResult =
        await processAnswerSheetScan({
          scanId: scan.id,
        });

      results.push(
        summarizeProcessed(pageResult)
      );
    } catch (error) {
      /*
       * Uma falha técnica afeta apenas esta página.
       */
      await prisma.answerSheetScan.update({
        where: {
          id: scan.id,
        },
        data: {
          status:
            AnswerSheetScanStatus.FAILED,
          processedAt: new Date(),
        },
      });

      results.push({
        kind: "FAILED",
        scanId: scan.id,
        pageNumber: scan.pageNumber,
        reason:
          error instanceof Error
            ? error.message
            : "Falha tecnica ao processar pagina.",
      });
    }
  }

  /*
   * Depois de tentar todas as páginas, consolidamos o lote.
   */
  const counters =
    await recalculateBatchCounters(batch.id);

  const processedNow =
    results.filter(
      (result) =>
        result.kind === "PROCESSED"
    ).length;

  const previouslyConfirmed =
    results.filter(
      (result) =>
        result.kind ===
        "SKIPPED_CONFIRMED"
    ).length;

  const protectedPages =
    results.filter(
      (result) =>
        result.kind ===
        "SKIPPED_HUMAN_DECISION"
    ).length;

  const skippedNotIdentified =
    results.filter(
      (result) =>
        result.kind ===
        "SKIPPED_NOT_IDENTIFIED"
    ).length;

  const skippedNotNormalized =
    results.filter(
      (result) =>
        result.kind ===
        "SKIPPED_NOT_NORMALIZED"
    ).length;

  const technicalFailures =
    results.filter(
      (result) =>
        result.kind === "FAILED" ||
        result.kind ===
          "SKIPPED_NOT_NORMALIZED"
    ).length;

  /*
   * No novo modelo, MULTIPLE/UNCERTAIN não geram uma necessidade
   * obrigatória de revisão.
   *
   * Mantemos o campo apenas para compatibilidade temporária.
   */
  const reviewRequiredNow = 0;

  return {
    batchId: batch.id,

    ...counters,

    eligiblePages:
      batch.scans.filter(
        (scan) =>
          Boolean(scan.answerSheetId)
      ).length,

    processedNow,

    reviewRequiredNow,

    previouslyConfirmed,

    protectedPages,

    skippedNotIdentified,

    skippedNotNormalized,

    technicalFailures,

    durationMs:
      Date.now() - startedAt,

    results,
  };
}
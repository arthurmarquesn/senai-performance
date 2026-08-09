import "server-only";

import {
  AnswerSheetStatus,
  AnswerSheetScanStatus,
  DetectedAnswerStatus,
  type ScanBatchStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ReviewQueueFilter =
  | "all"
  | "attention"
  | "blank"
  | "partial"
  | "waiting"
  | "confirmed"
  | "problems";

export type ReviewQueueRow = {
  scanId: string;
  pageNumber: number;
  status: AnswerSheetScanStatus;
  studentName: string | null;
  classRoomName: string | null;
  code: string | null;
  answerSheetStatus: AnswerSheetStatus | null;
  confirmedAt: Date | null;
  hasAnswerSheet: boolean;
  hasNormalizedImage: boolean;
  detected: number;
  blank: number;
  multiple: number;
  uncertain: number;
  unreviewedBlank: number;
  unreviewedMultiple: number;
  unreviewedUncertain: number;
  reviewed: number;
  pending: number;
  totalAnswers: number;
  problem: string | null;
};

export type ReviewBatchQueue = {
  batchId: string;
  examId: string;
  examTitle: string;
  totalQuestions: number;
  sourceFileName: string;
  status: ScanBatchStatus;
  totalPages: number;
  identifiedPages: number;
  processedPages: number;
  reviewRequiredPages: number;
  confirmedPages: number;
  failedPages: number;
  reviewedAnswers: number;
  expectedAnswers: number;
  totalAnswerSheets: number;
  correctedAnswerSheets: number;
  opticalSummary: {
    detected: number;
    blank: number;
    multiple: number;
    uncertain: number;
  };
  groups: {
    attention: ReviewQueueRow[];
    blank: ReviewQueueRow[];
    partial: ReviewQueueRow[];
    waiting: ReviewQueueRow[];
    confirmed: ReviewQueueRow[];
    problems: ReviewQueueRow[];
  };
};

const problemStatuses = new Set<AnswerSheetScanStatus>([
  AnswerSheetScanStatus.FAILED,
  AnswerSheetScanStatus.DUPLICATE,
]);

function countByStatus(
  answers: Array<{
    detectionStatus: DetectedAnswerStatus;
    reviewed: boolean;
  }>,
  status: DetectedAnswerStatus,
  reviewed?: boolean
) {
  return answers.filter(
    (answer) =>
      answer.detectionStatus === status &&
      (reviewed === undefined || answer.reviewed === reviewed)
  ).length;
}

function problemForScan({
  status,
  hasAnswerSheet,
  hasNormalizedImage,
}: {
  status: AnswerSheetScanStatus;
  hasAnswerSheet: boolean;
  hasNormalizedImage: boolean;
}) {
  if (status === AnswerSheetScanStatus.FAILED) {
    return "Falha tecnica";
  }

  if (status === AnswerSheetScanStatus.DUPLICATE) {
    return "Codigo duplicado";
  }

  if (!hasAnswerSheet) {
    return "Sem QR identificado";
  }

  if (!hasNormalizedImage) {
    return "Sem imagem normalizada";
  }

  return null;
}

function sortAttention(left: ReviewQueueRow, right: ReviewQueueRow) {
  return (
    right.unreviewedMultiple - left.unreviewedMultiple ||
    right.unreviewedUncertain - left.unreviewedUncertain ||
    left.pageNumber - right.pageNumber
  );
}

function sortByPage(left: ReviewQueueRow, right: ReviewQueueRow) {
  return left.pageNumber - right.pageNumber;
}

function classifyRows(rows: ReviewQueueRow[]): ReviewBatchQueue["groups"] {
  const groups: ReviewBatchQueue["groups"] = {
    attention: [],
    blank: [],
    partial: [],
    waiting: [],
    confirmed: [],
    problems: [],
  };

  for (const row of rows) {
    if (row.problem) {
      groups.problems.push(row);
      continue;
    }

    if (row.status === AnswerSheetScanStatus.CONFIRMED) {
      groups.confirmed.push(row);
      continue;
    }

    if (row.unreviewedMultiple > 0 || row.unreviewedUncertain > 0) {
      groups.attention.push(row);
      continue;
    }

    if (row.unreviewedBlank > 0) {
      groups.blank.push(row);
      continue;
    }

    if (row.reviewed > 0 && row.pending > 0) {
      groups.partial.push(row);
      continue;
    }

    groups.waiting.push(row);
  }

  groups.attention.sort(sortAttention);
  groups.blank.sort(sortByPage);
  groups.partial.sort(sortByPage);
  groups.waiting.sort(sortByPage);
  groups.confirmed.sort(sortByPage);
  groups.problems.sort(sortByPage);

  return groups;
}

export function getRowsForFilter(
  queue: ReviewBatchQueue,
  filter: ReviewQueueFilter
) {
  if (filter === "all") {
    return [
      ...queue.groups.attention,
      ...queue.groups.blank,
      ...queue.groups.partial,
      ...queue.groups.waiting,
      ...queue.groups.confirmed,
      ...queue.groups.problems,
    ];
  }

  return queue.groups[filter];
}

export async function getAnswerSheetBatchReviewQueue({
  examId,
  batchId,
}: {
  examId: string;
  batchId: string;
}): Promise<ReviewBatchQueue | null> {
  const batch = await prisma.answerSheetScanBatch.findFirst({
    where: {
      id: batchId,
      examApplication: {
        examId,
      },
    },
    include: {
      examApplication: {
        include: {
          exam: {
            select: {
              id: true,
              title: true,
              totalQuestions: true,
            },
          },
          classRoom: {
            select: {
              name: true,
            },
          },
        },
      },
      scans: {
        orderBy: {
          pageNumber: "asc",
        },
        include: {
          answerSheet: {
            include: {
              student: {
                select: {
                  name: true,
                },
              },
            },
          },
          answers: {
            select: {
              detectionStatus: true,
              reviewed: true,
            },
          },
        },
      },
    },
  });

  if (!batch) {
    return null;
  }

  const rows: ReviewQueueRow[] = batch.scans.map((scan) => {
    const hasAnswerSheet = Boolean(scan.answerSheetId && scan.answerSheet);
    const hasNormalizedImage = Boolean(scan.normalizedImageKey);
    const totalAnswers = scan.answers.length;
    const reviewed = scan.answers.filter((answer) => answer.reviewed).length;
    const problem =
      problemStatuses.has(scan.status) || !hasAnswerSheet || !hasNormalizedImage
        ? problemForScan({
            status: scan.status,
            hasAnswerSheet,
            hasNormalizedImage,
          })
        : null;

    return {
      scanId: scan.id,
      pageNumber: scan.pageNumber,
      status: scan.status,
      studentName: scan.answerSheet?.student.name ?? null,
      classRoomName: batch.examApplication.classRoom.name,
      code: scan.answerSheet?.code ?? scan.detectedCode,
      answerSheetStatus: scan.answerSheet?.status ?? null,
      confirmedAt: scan.confirmedAt,
      hasAnswerSheet,
      hasNormalizedImage,
      detected: countByStatus(scan.answers, DetectedAnswerStatus.DETECTED),
      blank: countByStatus(scan.answers, DetectedAnswerStatus.BLANK),
      multiple: countByStatus(scan.answers, DetectedAnswerStatus.MULTIPLE),
      uncertain: countByStatus(scan.answers, DetectedAnswerStatus.UNCERTAIN),
      unreviewedBlank: countByStatus(
        scan.answers,
        DetectedAnswerStatus.BLANK,
        false
      ),
      unreviewedMultiple: countByStatus(
        scan.answers,
        DetectedAnswerStatus.MULTIPLE,
        false
      ),
      unreviewedUncertain: countByStatus(
        scan.answers,
        DetectedAnswerStatus.UNCERTAIN,
        false
      ),
      reviewed,
      pending: Math.max(totalAnswers - reviewed, 0),
      totalAnswers,
      problem,
    };
  });
  const groups = classifyRows(rows);
  const totalQuestions = batch.examApplication.exam.totalQuestions;
  const opticalSummary = rows.reduce(
    (summary, row) => ({
      detected: summary.detected + row.detected,
      blank: summary.blank + row.blank,
      multiple: summary.multiple + row.multiple,
      uncertain: summary.uncertain + row.uncertain,
    }),
    {
      detected: 0,
      blank: 0,
      multiple: 0,
      uncertain: 0,
    }
  );

  return {
    batchId: batch.id,
    examId: batch.examApplication.exam.id,
    examTitle: batch.examApplication.exam.title,
    totalQuestions,
    sourceFileName: batch.sourceFileName,
    status: batch.status,
    totalPages: batch.totalPages,
    identifiedPages: rows.filter((row) => row.hasAnswerSheet).length,
    processedPages: rows.filter(
      (row) =>
        row.totalAnswers === totalQuestions &&
        (row.status === AnswerSheetScanStatus.PROCESSED ||
          row.status === AnswerSheetScanStatus.REVIEW_REQUIRED ||
          row.status === AnswerSheetScanStatus.CONFIRMED)
    ).length,
    reviewRequiredPages:
      groups.attention.length +
      groups.blank.length +
      groups.partial.length +
      groups.problems.length,
    confirmedPages: groups.confirmed.length,
    failedPages: rows.filter((row) => row.status === AnswerSheetScanStatus.FAILED)
      .length,
    reviewedAnswers: rows.reduce((sum, row) => sum + row.reviewed, 0),
    expectedAnswers: rows.length * totalQuestions,
    totalAnswerSheets: rows.filter((row) => row.hasAnswerSheet).length,
    correctedAnswerSheets: rows.filter(
      (row) => row.answerSheetStatus === AnswerSheetStatus.CORRECTED
    ).length,
    opticalSummary,
    groups,
  };
}

export async function getNextReviewQueueTarget({
  examId,
  scanId,
}: {
  examId: string;
  scanId: string;
}) {
  const current = await prisma.answerSheetScan.findFirst({
    where: {
      id: scanId,
      answerSheet: {
        examApplication: {
          examId,
        },
      },
    },
    select: {
      id: true,
      scanBatchId: true,
    },
  });

  if (!current) {
    return null;
  }

  const queue = await getAnswerSheetBatchReviewQueue({
    examId,
    batchId: current.scanBatchId,
  });

  if (!queue) {
    return null;
  }

  return (
    [
      ...queue.groups.attention,
      ...queue.groups.blank,
      ...queue.groups.partial,
      ...queue.groups.waiting,
    ].find((row) => row.scanId !== scanId) ?? null
  );
}

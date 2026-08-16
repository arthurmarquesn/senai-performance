import "server-only";

import {
  AnswerSheetStatus,
  DetectedAnswerStatus,
  type ScanBatchStatus,
  type Alternative,
  type AnswerSheetScanStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isReviewRecommended } from "@/lib/answer-sheet-effective-answer";

export type ReviewAnswer = {
  id: string;
  question: number;
  detectedAnswer: Alternative | null;
  detectionStatus: DetectedAnswerStatus;
  fillA: number | null;
  fillB: number | null;
  fillC: number | null;
  fillD: number | null;
  fillE: number | null;
  finalAnswer: Alternative | null;
  reviewed: boolean;
  reviewedAt: Date | null;
};

export type AnswerSheetScanReview = {
  scanId: string;
  batchId: string;
  examId: string;
  examTitle: string;
  totalQuestions: number;
  status: AnswerSheetScanStatus;
  batchStatus: ScanBatchStatus;
  answerSheetStatus: AnswerSheetStatus;
  answerSheetCorrectedAt: Date | null;
  confirmedAt: Date | null;
  pageNumber: number;
  code: string;
  studentId: string;
  studentName: string;
  classRoomName: string;
  summary: {
    total: number;
    detected: number;
    blank: number;
    multiple: number;
    uncertain: number;
    reviewed: number;
    pending: number;
  };
  answers: ReviewAnswer[];
};

export async function getAnswerSheetScanReview({
  examId,
  scanId,
}: {
  examId: string;
  scanId: string;
}): Promise<AnswerSheetScanReview | null> {
  const scan = await prisma.answerSheetScan.findFirst({
    where: {
      id: scanId,
      answerSheet: {
        examApplication: {
          examId,
        },
      },
    },
    include: {
      answerSheet: {
        include: {
          student: true,
          examApplication: {
            include: {
              classRoom: true,
              exam: true,
            },
          },
        },
      },
      scanBatch: true,
      answers: {
        orderBy: {
          question: "asc",
        },
      },
    },
  });

  if (!scan?.answerSheet) {
    return null;
  }

  const answers = scan.answers;
  const detected = answers.filter(
    (answer) => answer.detectionStatus === DetectedAnswerStatus.DETECTED
  ).length;
  const blank = answers.filter(
    (answer) => answer.detectionStatus === DetectedAnswerStatus.BLANK
  ).length;
  const multiple = answers.filter(
    (answer) => answer.detectionStatus === DetectedAnswerStatus.MULTIPLE
  ).length;
  const uncertain = answers.filter(
    (answer) => answer.detectionStatus === DetectedAnswerStatus.UNCERTAIN
  ).length;
  const reviewed = answers.filter((answer) => answer.reviewed).length;
  const pending = answers.filter(isReviewRecommended).length;
  const exam = scan.answerSheet.examApplication.exam;

  return {
    scanId: scan.id,
    batchId: scan.scanBatchId,
    examId: exam.id,
    examTitle: exam.title,
    totalQuestions: exam.totalQuestions,
    status: scan.status,
    batchStatus: scan.scanBatch.status,
    answerSheetStatus: scan.answerSheet.status,
    answerSheetCorrectedAt: scan.answerSheet.correctedAt,
    confirmedAt: scan.confirmedAt,
    pageNumber: scan.pageNumber,
    code: scan.answerSheet.code,
    studentId: scan.answerSheet.studentId,
    studentName: scan.answerSheet.student.name,
    classRoomName: scan.answerSheet.examApplication.classRoom.name,
    summary: {
      total: answers.length,
      detected,
      blank,
      multiple,
      uncertain,
      reviewed,
      pending,
    },
    answers,
  };
}

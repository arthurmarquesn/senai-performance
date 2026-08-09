"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import {
  BatchCompletionValidationError,
  completeAnswerSheetScanBatchReview,
} from "@/lib/answer-sheet-review/complete-batch";
import {
  AnswerSheetBatchCorrectionError,
  correctAnswerSheetScanBatch,
} from "@/lib/answer-sheet-correction/correct-batch";

export type CompleteBatchReviewState = {
  status: "idle" | "success" | "error";
  message?: string;
  summary?: {
    batchId: string;
    alreadyConfirmed: boolean;
    totalPages: number;
    totalQuestions: number;
    confirmedPages: number;
    reviewedAnswers: number;
    expectedAnswers: number;
    status: "CONFIRMED";
    completedAt: Date | null;
  };
};

export type CorrectBatchState = {
  status: "idle" | "success" | "error";
  message?: string;
  summary?: {
    batchId: string;
    totalScans: number;
    eligible: number;
    corrected: number;
    alreadyCorrected: number;
    protectedExistingResult: number;
    divergent: number;
    failed: number;
    correctedAnswerSheetsAfter: number;
    totalAnswerSheets: number;
    elapsedMs: number;
    issues: Array<{
      kind: string;
      scanId: string;
      pageNumber: number;
      studentId: string | null;
      reason: string;
    }>;
  };
};

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function completeBatchReviewAction(
  _previousState: CompleteBatchReviewState,
  formData: FormData
): Promise<CompleteBatchReviewState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "Sessao expirada. Faca login novamente.",
    };
  }

  const examId = getRequiredString(formData, "examId");
  const batchId = getRequiredString(formData, "batchId");

  if (!examId || !batchId) {
    return {
      status: "error",
      message: "Lote invalido.",
    };
  }

  try {
    const summary = await completeAnswerSheetScanBatchReview({
      examId,
      batchId,
    });

    revalidatePath(`/simulados/${examId}/leituras/lotes/${batchId}`);
    revalidatePath(`/simulados/${examId}`);

    return {
      status: "success",
      message: summary.alreadyConfirmed
        ? "Este lote ja estava confirmado."
        : "Leitura do lote concluida.",
      summary,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof BatchCompletionValidationError || error instanceof Error
          ? error.message
          : "Nao foi possivel concluir o lote de leitura.",
    };
  }
}

export async function correctBatchAction(
  _previousState: CorrectBatchState,
  formData: FormData
): Promise<CorrectBatchState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "Sessao expirada. Faca login novamente.",
    };
  }

  const examId = getRequiredString(formData, "examId");
  const batchId = getRequiredString(formData, "batchId");

  if (!examId || !batchId) {
    return {
      status: "error",
      message: "Lote invalido.",
    };
  }

  try {
    const summary = await correctAnswerSheetScanBatch({
      examId,
      batchId,
    });

    revalidatePath(`/simulados/${examId}/leituras/lotes/${batchId}`);
    revalidatePath(`/simulados/${examId}/resultados`);
    revalidatePath(`/simulados/${examId}/ranking`);
    revalidatePath(`/simulados/${examId}`);

    return {
      status: "success",
      message: "Correcao oficial do lote concluida.",
      summary,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof AnswerSheetBatchCorrectionError || error instanceof Error
          ? error.message
          : "Nao foi possivel corrigir o lote.",
    };
  }
}

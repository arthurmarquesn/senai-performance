"use server";

import { Alternative } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import {
  completeAnswerSheetScanReview,
  IncompleteScanReviewError,
  reviewAnswerQuestion,
} from "@/lib/answer-sheet-review/mutations";
import {
  AnswerSheetCorrectionError,
  correctConfirmedAnswerSheetScan,
} from "@/lib/answer-sheet-correction/correct-scan";

const alternatives = new Set<string>(Object.values(Alternative));
const blankValue = "__BLANK__";

export type ReviewQuestionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export type CompleteScanReviewState = {
  status: "idle" | "success" | "error";
  message?: string;
  summary?: {
    confirmed: number;
    status: "CONFIRMED";
  };
};

export type CorrectConfirmedScanState = {
  status: "idle" | "success" | "error";
  message?: string;
  summary?: {
    examResultId: string;
    studentAnswers: number;
    correctAnswers: number;
    validQuestions: number;
    canceledQuestions: number;
    blankAnswers: number;
    alreadyCorrected: boolean;
  };
};

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseFinalAnswer(value: string | null) {
  if (value === blankValue) {
    return null;
  }

  if (!value || !alternatives.has(value)) {
    throw new Error("Alternativa invalida.");
  }

  return Alternative[value as keyof typeof Alternative];
}

async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Sessao expirada. Faca login novamente.");
  }
}

export async function reviewQuestionAction(
  _previousState: ReviewQuestionState,
  formData: FormData
): Promise<ReviewQuestionState> {
  try {
    await requireUser();

    const examId = getRequiredString(formData, "examId");
    const scanId = getRequiredString(formData, "scanId");
    const question = Number(formData.get("question"));
    const finalAnswer = parseFinalAnswer(getRequiredString(formData, "finalAnswer"));

    if (!examId || !scanId || !Number.isInteger(question)) {
      return {
        status: "error",
        message: "Dados de revisao invalidos.",
      };
    }

    await reviewAnswerQuestion({
      examId,
      scanId,
      question,
      finalAnswer,
    });

    return {
      status: "success",
      message:
        finalAnswer === null
          ? `Q${question} confirmada em branco.`
          : `Q${question} confirmada como ${finalAnswer}.`,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Nao foi possivel revisar a questao.",
    };
  }
}

export async function completeScanReviewAction(
  _previousState: CompleteScanReviewState,
  formData: FormData
): Promise<CompleteScanReviewState> {
  try {
    await requireUser();

    const examId = getRequiredString(formData, "examId");
    const scanId = getRequiredString(formData, "scanId");

    if (!examId || !scanId) {
      return {
        status: "error",
        message: "Folha invalida.",
      };
    }

    const summary = await completeAnswerSheetScanReview({
      examId,
      scanId,
    });

    revalidatePath(`/simulados/${examId}/leituras/${scanId}`);
    revalidatePath(`/simulados/${examId}`);

    return {
      status: "success",
      message: "Leitura da folha concluida.",
      summary,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof IncompleteScanReviewError || error instanceof Error
          ? error.message
          : "Nao foi possivel concluir a revisao.",
    };
  }
}

export async function correctConfirmedScanAction(
  _previousState: CorrectConfirmedScanState,
  formData: FormData
): Promise<CorrectConfirmedScanState> {
  try {
    await requireUser();

    const examId = getRequiredString(formData, "examId");
    const scanId = getRequiredString(formData, "scanId");

    if (!examId || !scanId) {
      return {
        status: "error",
        message: "Folha invalida.",
      };
    }

    const summary = await correctConfirmedAnswerSheetScan({
      examId,
      scanId,
    });

    revalidatePath(`/simulados/${examId}/leituras/${scanId}`);
    revalidatePath(`/simulados/${examId}/respostas/${summary.studentId}`);
    revalidatePath(`/simulados/${examId}/resultados`);
    revalidatePath(`/simulados/${examId}/ranking`);
    revalidatePath(`/simulados/${examId}`);

    return {
      status: "success",
      message: summary.alreadyCorrected
        ? "Esta prova ja estava corrigida com as mesmas respostas oficiais."
        : "Prova corrigida oficialmente.",
      summary: {
        examResultId: summary.examResultId,
        studentAnswers: summary.studentAnswers,
        correctAnswers: summary.correctAnswers,
        validQuestions: summary.validQuestions,
        canceledQuestions: summary.canceledQuestions,
        blankAnswers: summary.blankAnswers,
        alreadyCorrected: summary.alreadyCorrected,
      },
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof AnswerSheetCorrectionError || error instanceof Error
          ? error.message
          : "Nao foi possivel corrigir a prova.",
    };
  }
}

"use server";

import { Alternative, Prisma, Subject } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { generateUniqueAnswerSheetCode } from "@/lib/answer-sheet-code";
import { identifyScanBatch } from "@/lib/answer-sheet-scans/identify";
import { createScanBatchWithPendingPages } from "@/lib/answer-sheet-scans/import";
import { normalizeScanBatch } from "@/lib/answer-sheet-scans/normalize";
import {
  ScanPdfValidationError,
  validateScanPdfFile,
} from "@/lib/answer-sheet-scans/pdf";
import {
  deleteOriginalScanPdf,
  saveOriginalScanPdf,
} from "@/lib/answer-sheet-scans/storage";
import { prisma } from "@/lib/prisma";

const subjects = new Set<string>(Object.values(Subject));
const alternatives = new Set<string>(Object.values(Alternative));

export type GenerateAnswerSheetsState = {
  status: "idle" | "success" | "error";
  message?: string;
  summary?: {
    applicationId: string;
    totalStudents: number;
    totalSheets: number;
    createdSheets: number;
    existingSheets: number;
  };
};

export type ImportAnswerSheetScansState = {
  status: "idle" | "success" | "error";
  message?: string;
  summary?: {
    batchId: string;
    sourceFileName: string;
    sourceFileKey: string;
    totalPages: number;
    registeredPages: number;
    status: "UPLOADED";
  };
};

export type IdentifyAnswerSheetScansState = {
  status: "idle" | "success" | "error";
  message?: string;
  summary?: {
    batchId: string;
    totalPages: number;
    processedPages: number;
    identifiedPages: number;
    reviewRequiredPages: number;
    duplicatePages: number;
    failedPages: number;
    status: "PROCESSING" | "REVIEW_REQUIRED";
  };
};

export type NormalizeAnswerSheetScansState = {
  status: "idle" | "success" | "error";
  message?: string;
  summary?: {
    batchId: string;
    identifiedPages: number;
    normalizedPages: number;
    reviewRequiredPages: number;
    failedPages: number;
    residualAverage: number | null;
    residualMax: number | null;
  };
};

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseSubject(value: string | null) {
  if (!value || !subjects.has(value)) {
    return null;
  }

  return value as Subject;
}

function parseAlternative(value: string | null) {
  if (!value || !alternatives.has(value)) {
    return null;
  }

  return value as Alternative;
}

export async function createBlock(formData: FormData) {
  const examId = getRequiredString(formData, "examId");
  const subject = parseSubject(getRequiredString(formData, "subject"));
  const startQuestion = Number(formData.get("startQuestion"));
  const endQuestion = Number(formData.get("endQuestion"));

  if (!examId || !subject || !startQuestion || !endQuestion) {
    throw new Error("Dados inválidos.");
  }

  await prisma.examBlock.create({
    data: {
      examId,
      subject,
      startQuestion,
      endQuestion,
    },
  });

  revalidatePath(`/simulados/${examId}`);
}

export async function saveAnswerKey(formData: FormData) {
  const examId = getRequiredString(formData, "examId");
  const question = Number(formData.get("question"));
  const answer = parseAlternative(getRequiredString(formData, "answer"));

  if (!examId || !question || !answer) {
    throw new Error("Dados inválidos.");
  }

  await prisma.answerKey.upsert({
    where: {
      examId_question: {
        examId,
        question,
      },
    },
    update: {
      answer,
    },
    create: {
      examId,
      question,
      answer,
    },
  });

  revalidatePath(`/simulados/${examId}`);
}

export async function toggleCanceledQuestion(formData: FormData) {
  const examId = getRequiredString(formData, "examId");
  const question = Number(formData.get("question"));

  if (!examId || !question) {
    throw new Error("Dados inválidos.");
  }

  const existing = await prisma.answerKey.findUnique({
    where: {
      examId_question: {
        examId,
        question,
      },
    },
  });

  if (!existing) {
    throw new Error("Cadastre o gabarito antes de anular.");
  }

  await prisma.answerKey.update({
    where: {
      id: existing.id,
    },
    data: {
      canceled: !existing.canceled,
    },
  });

  revalidatePath(`/simulados/${examId}`);
}

export async function generateAnswerSheetsForClassRoom(
  _previousState: GenerateAnswerSheetsState,
  formData: FormData
): Promise<GenerateAnswerSheetsState> {
  const examId = getRequiredString(formData, "examId");
  const classRoomId = getRequiredString(formData, "classRoomId");

  if (!examId || !classRoomId) {
    return {
      status: "error",
      message: "Selecione um simulado e uma turma.",
    };
  }

  try {
    const summary = await prisma.$transaction(async (tx) => {
      const [exam, classRoom] = await Promise.all([
        tx.exam.findUnique({
          where: {
            id: examId,
          },
          select: {
            id: true,
            grade: true,
          },
        }),
        tx.classRoom.findUnique({
          where: {
            id: classRoomId,
          },
          select: {
            id: true,
            grade: true,
            students: {
              select: {
                id: true,
              },
              orderBy: {
                name: "asc",
              },
            },
          },
        }),
      ]);

      if (!exam) {
        throw new Error("Simulado não encontrado.");
      }

      if (!classRoom) {
        throw new Error("Turma não encontrada.");
      }

      if (exam.grade !== classRoom.grade) {
        throw new Error(
          "A turma selecionada não é compatível com a série do simulado."
        );
      }

      const application = await tx.examApplication.upsert({
        where: {
          examId_classRoomId: {
            examId,
            classRoomId,
          },
        },
        update: {},
        create: {
          examId,
          classRoomId,
        },
        select: {
          id: true,
        },
      });

      const existingSheets = await tx.answerSheet.findMany({
        where: {
          examApplicationId: application.id,
        },
        select: {
          studentId: true,
        },
      });

      const existingStudentIds = new Set(
        existingSheets.map((sheet) => sheet.studentId)
      );

      const missingStudents = classRoom.students.filter(
        (student) => !existingStudentIds.has(student.id)
      );

      let createdSheets = 0;
      const reservedCodes = new Set<string>();

      for (const student of missingStudents) {
        let sheetCreatedOrAlreadyExists = false;

        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            await tx.answerSheet.create({
              data: {
                studentId: student.id,
                examApplicationId: application.id,
                code: await generateUniqueAnswerSheetCode(tx, reservedCodes),
              },
            });

            createdSheets++;
            sheetCreatedOrAlreadyExists = true;
            break;
          } catch (error) {
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === "P2002"
            ) {
              const target = Array.isArray(error.meta?.target)
                ? error.meta.target.map(String)
                : [];

              if (target.includes("code")) {
                continue;
              }

              if (
                target.includes("studentId") &&
                target.includes("examApplicationId")
              ) {
                sheetCreatedOrAlreadyExists = true;
                break;
              }
            }

            throw error;
          }
        }

        if (!sheetCreatedOrAlreadyExists) {
          throw new Error("Não foi possível criar uma folha com código único.");
        }
      }

      const totalSheets = await tx.answerSheet.count({
        where: {
          examApplicationId: application.id,
        },
      });

      return {
        applicationId: application.id,
        totalStudents: classRoom.students.length,
        totalSheets,
        createdSheets,
        existingSheets: totalSheets - createdSheets,
      };
    });

    revalidatePath(`/simulados/${examId}`);

    return {
      status: "success",
      summary,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível gerar os gabaritos.",
    };
  }
}

export async function importAnswerSheetScans(
  _previousState: ImportAnswerSheetScansState,
  formData: FormData
): Promise<ImportAnswerSheetScansState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "Sessão expirada. Faça login novamente.",
    };
  }

  const examId = getRequiredString(formData, "examId");
  const examApplicationId = getRequiredString(formData, "examApplicationId");
  const file = formData.get("scanPdf");

  if (!examId || !examApplicationId) {
    return {
      status: "error",
      message: "Aplicação de simulado inválida.",
    };
  }

  if (!(file instanceof File)) {
    return {
      status: "error",
      message: "Selecione um arquivo PDF.",
    };
  }

  let sourceFileKey: string | null = null;

  try {
    const validatedPdf = await validateScanPdfFile(file);
    const storedPdf = await saveOriginalScanPdf({
      examApplicationId,
      fileName: validatedPdf.fileName,
      bytes: validatedPdf.bytes,
    });

    sourceFileKey = storedPdf.sourceFileKey;

    const summary = await createScanBatchWithPendingPages({
      examId,
      examApplicationId,
      sourceFileName: validatedPdf.fileName,
      sourceFileKey: storedPdf.sourceFileKey,
      totalPages: validatedPdf.totalPages,
    });

    revalidatePath(`/simulados/${examId}`);

    return {
      status: "success",
      summary: {
        ...summary,
        status: "UPLOADED",
      },
    };
  } catch (error) {
    if (sourceFileKey) {
      try {
        await deleteOriginalScanPdf(sourceFileKey);
      } catch (cleanupError) {
        console.error("Erro ao remover PDF após falha de importação:", cleanupError);
      }
    }

    return {
      status: "error",
      message:
        error instanceof ScanPdfValidationError || error instanceof Error
          ? error.message
          : "Não foi possível importar os gabaritos digitalizados.",
    };
  }
}

export async function identifyAnswerSheetScans(
  _previousState: IdentifyAnswerSheetScansState,
  formData: FormData
): Promise<IdentifyAnswerSheetScansState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "Sessão expirada. Faça login novamente.",
    };
  }

  const examId = getRequiredString(formData, "examId");
  const examApplicationId = getRequiredString(formData, "examApplicationId");
  const batchId = getRequiredString(formData, "batchId");

  if (!examId || !examApplicationId || !batchId) {
    return {
      status: "error",
      message: "Lote de digitalização inválido.",
    };
  }

  try {
    const summary = await identifyScanBatch({
      examId,
      examApplicationId,
      batchId,
    });

    revalidatePath(`/simulados/${examId}`);

    return {
      status: "success",
      summary: {
        batchId: summary.batchId,
        totalPages: summary.totalPages,
        processedPages: summary.processedPages,
        identifiedPages: summary.identifiedPages,
        reviewRequiredPages: summary.reviewRequiredPages,
        duplicatePages: summary.duplicatePages,
        failedPages: summary.failedPages,
        status:
          summary.status === "REVIEW_REQUIRED"
            ? "REVIEW_REQUIRED"
            : "PROCESSING",
      },
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível identificar os gabaritos digitalizados.",
    };
  }
}

export async function normalizeAnswerSheetScans(
  _previousState: NormalizeAnswerSheetScansState,
  formData: FormData
): Promise<NormalizeAnswerSheetScansState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "Sessão expirada. Faça login novamente.",
    };
  }

  const examId = getRequiredString(formData, "examId");
  const examApplicationId = getRequiredString(formData, "examApplicationId");
  const batchId = getRequiredString(formData, "batchId");

  if (!examId || !examApplicationId || !batchId) {
    return {
      status: "error",
      message: "Lote de digitalização inválido.",
    };
  }

  try {
    const summary = await normalizeScanBatch({
      examId,
      examApplicationId,
      batchId,
    });

    revalidatePath(`/simulados/${examId}`);

    return {
      status: "success",
      summary: {
        batchId: summary.batchId,
        identifiedPages: summary.identifiedPages,
        normalizedPages: summary.normalizedPages,
        reviewRequiredPages: summary.reviewRequiredPages,
        failedPages: summary.failedPages,
        residualAverage: summary.residualAverage,
        residualMax: summary.residualMax,
      },
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível normalizar os gabaritos digitalizados.",
    };
  }
}

"use server";

import {
  Alternative,
  Prisma,
  ScanBatchStatus,
  Subject,
} from "@prisma/client";
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
import { processAnswerSheetScanBatch } from "@/lib/answer-sheet-scans/process-batch";
import { processAnswerSheetScan } from "@/lib/answer-sheet-scans/process-answers";
import {
  deleteOriginalScanPdf,
  saveOriginalScanPdf,
} from "@/lib/answer-sheet-scans/storage";
import { prisma } from "@/lib/prisma";

const subjects = new Set<string>(
  Object.values(Subject)
);

const alternatives = new Set<string>(
  Object.values(Alternative)
);

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

    identifiedPages: number;
    processedPages: number;

    /*
     * Ocorrências são páginas que não chegaram ao resultado final.
     *
     * Isso NÃO representa revisão humana obrigatória.
     */
    occurrencePages: number;

    duplicatePages: number;
    identificationFailedPages: number;
    preparationFailedPages: number;
    technicalFailures: number;

    /*
     * Quantidade total de DetectedAnswer gravados no lote.
     */
    detectedAnswerTotal: number;

    status: ScanBatchStatus;

    /*
     * Tempo da operação completa:
     *
     * upload
     * + identificação
     * + preparação
     * + leitura
     * + persistência
     */
    durationMs: number;
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
    status:
      | "PROCESSING"
      | "REVIEW_REQUIRED";
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

export type ProcessAnswerSheetScanState = {
  status: "idle" | "success" | "error";
  message?: string;
  summary?: {
    scanId: string;
    pageNumber: number;
    studentName: string | null;
    totalQuestions: number;
    persistedAnswers: number;
    detected: number;
    blank: number;
    multiple: number;
    uncertain: number;
    status:
      | "PROCESSED"
      | "REVIEW_REQUIRED";
  };
};

export type ProcessAnswerSheetScanBatchState = {
  status: "idle" | "success" | "error";
  message?: string;
  summary?: {
    batchId: string;
    totalPages: number;
    eligiblePages: number;
    processedNow: number;
    processedPages: number;
    reviewRequiredPages: number;
    confirmedPages: number;
    previouslyConfirmed: number;
    protectedPages: number;
    skippedNotIdentified: number;
    skippedNotNormalized: number;
    technicalFailures: number;
    detectedAnswerTotal: number;
    status:
      | "UPLOADED"
      | "PROCESSING"
      | "REVIEW_REQUIRED"
      | "READY_FOR_CONFIRMATION"
      | "CONFIRMED"
      | "FAILED";
    durationMs: number;
  };
};

export type AnswerKeyBatchItem = {
  question: number;
  answer: Alternative;
  canceled: boolean;
};

export type SaveAnswerKeyBatchInput = {
  examId: string;
  items: AnswerKeyBatchItem[];
};

export type SaveAnswerKeyBatchResult =
  | {
      status: "success";
      savedItems: AnswerKeyBatchItem[];
    }
  | {
      status: "error";
      message: string;
    };

function getRequiredString(
  formData: FormData,
  key: string
) {
  const value = formData.get(key);

  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : null;
}

function parseSubject(
  value: string | null
) {
  if (
    !value ||
    !subjects.has(value)
  ) {
    return null;
  }

  return value as Subject;
}

export async function createBlock(
  formData: FormData
) {
  const examId = getRequiredString(
    formData,
    "examId"
  );

  const subject = parseSubject(
    getRequiredString(
      formData,
      "subject"
    )
  );

  const startQuestion = Number(
    formData.get("startQuestion")
  );

  const endQuestion = Number(
    formData.get("endQuestion")
  );

  if (
    !examId ||
    !subject ||
    !startQuestion ||
    !endQuestion
  ) {
    throw new Error(
      "Dados inválidos."
    );
  }

  await prisma.examBlock.create({
    data: {
      examId,
      subject,
      startQuestion,
      endQuestion,
    },
  });

  revalidatePath(
    `/simulados/${examId}`
  );
}

export async function saveAnswerKeyBatch(
  input: SaveAnswerKeyBatchInput
): Promise<SaveAnswerKeyBatchResult> {
  if (!input.examId) {
    return {
      status: "error",
      message:
        "Simulado invalido.",
    };
  }

  const normalizedItems =
    input.items.map((item) => ({
      question:
        Number(item.question),
      answer: item.answer,
      canceled:
        Boolean(item.canceled),
    }));

  if (
    normalizedItems.some(
      (item) =>
        !Number.isInteger(
          item.question
        ) ||
        item.question < 1 ||
        !alternatives.has(
          item.answer
        )
    )
  ) {
    return {
      status: "error",
      message:
        "Gabarito contem dados invalidos.",
    };
  }

  try {
    const savedItems =
      await prisma.$transaction(
        async (tx) => {
          const exam =
            await tx.exam.findUnique({
              where: {
                id: input.examId,
              },
              select: {
                totalQuestions:
                  true,
              },
            });

          if (!exam) {
            throw new Error(
              "Simulado nao encontrado."
            );
          }

          const seenQuestions =
            new Set<number>();

          for (
            const item of
            normalizedItems
          ) {
            if (
              item.question >
              exam.totalQuestions
            ) {
              throw new Error(
                "Questao fora do intervalo do simulado."
              );
            }

            if (
              seenQuestions.has(
                item.question
              )
            ) {
              throw new Error(
                "Gabarito contem questoes duplicadas."
              );
            }

            seenQuestions.add(
              item.question
            );
          }

          for (
            const item of
            normalizedItems
          ) {
            await tx.answerKey.upsert({
              where: {
                examId_question: {
                  examId:
                    input.examId,
                  question:
                    item.question,
                },
              },
              update: {
                answer:
                  item.answer,
                canceled:
                  item.canceled,
              },
              create: {
                examId:
                  input.examId,
                question:
                  item.question,
                answer:
                  item.answer,
                canceled:
                  item.canceled,
              },
            });
          }

          return normalizedItems.sort(
            (a, b) =>
              a.question -
              b.question
          );
        }
      );

    revalidatePath(
      `/simulados/${input.examId}`
    );

    revalidatePath(
      `/simulados/${input.examId}/resultados`
    );

    revalidatePath(
      `/simulados/${input.examId}/ranking`
    );

    revalidatePath(
      `/simulados/${input.examId}/respostas`
    );

    return {
      status: "success",
      savedItems,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar o gabarito.",
    };
  }
}

export async function generateAnswerSheetsForClassRoom(
  _previousState: GenerateAnswerSheetsState,
  formData: FormData
): Promise<GenerateAnswerSheetsState> {
  const examId =
    getRequiredString(
      formData,
      "examId"
    );

  const classRoomId =
    getRequiredString(
      formData,
      "classRoomId"
    );

  if (
    !examId ||
    !classRoomId
  ) {
    return {
      status: "error",
      message:
        "Selecione um simulado e uma turma.",
    };
  }

  try {
    const summary =
      await prisma.$transaction(
        async (tx) => {
          const [
            exam,
            classRoom,
          ] =
            await Promise.all([
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
            throw new Error(
              "Simulado não encontrado."
            );
          }

          if (!classRoom) {
            throw new Error(
              "Turma não encontrada."
            );
          }

          if (
            exam.grade !==
            classRoom.grade
          ) {
            throw new Error(
              "A turma selecionada não é compatível com a série do simulado."
            );
          }

          const application =
            await tx.examApplication.upsert(
              {
                where: {
                  examId_classRoomId:
                    {
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
              }
            );

          const existingSheets =
            await tx.answerSheet.findMany(
              {
                where: {
                  examApplicationId:
                    application.id,
                },
                select: {
                  studentId: true,
                },
              }
            );

          const existingStudentIds =
            new Set(
              existingSheets.map(
                (sheet) =>
                  sheet.studentId
              )
            );

          const missingStudents =
            classRoom.students.filter(
              (student) =>
                !existingStudentIds.has(
                  student.id
                )
            );

          let createdSheets = 0;

          const reservedCodes =
            new Set<string>();

          for (
            const student of
            missingStudents
          ) {
            let sheetCreatedOrAlreadyExists =
              false;

            for (
              let attempt = 0;
              attempt < 5;
              attempt++
            ) {
              try {
                await tx.answerSheet.create(
                  {
                    data: {
                      studentId:
                        student.id,
                      examApplicationId:
                        application.id,
                      code:
                        await generateUniqueAnswerSheetCode(
                          tx,
                          reservedCodes
                        ),
                    },
                  }
                );

                createdSheets++;

                sheetCreatedOrAlreadyExists =
                  true;

                break;
              } catch (error) {
                if (
                  error instanceof
                    Prisma.PrismaClientKnownRequestError &&
                  error.code ===
                    "P2002"
                ) {
                  const target =
                    Array.isArray(
                      error.meta
                        ?.target
                    )
                      ? error.meta!.target.map(
                          String
                        )
                      : [];

                  if (
                    target.includes(
                      "code"
                    )
                  ) {
                    continue;
                  }

                  if (
                    target.includes(
                      "studentId"
                    ) &&
                    target.includes(
                      "examApplicationId"
                    )
                  ) {
                    sheetCreatedOrAlreadyExists =
                      true;

                    break;
                  }
                }

                throw error;
              }
            }

            if (
              !sheetCreatedOrAlreadyExists
            ) {
              throw new Error(
                "Não foi possível criar uma folha com código único."
              );
            }
          }

          const totalSheets =
            await tx.answerSheet.count(
              {
                where: {
                  examApplicationId:
                    application.id,
                },
              }
            );

          return {
            applicationId:
              application.id,

            totalStudents:
              classRoom.students
                .length,

            totalSheets,

            createdSheets,

            existingSheets:
              totalSheets -
              createdSheets,
          };
        }
      );

    revalidatePath(
      `/simulados/${examId}`
    );

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

/*
 * ================================================================
 * IMPORTAÇÃO E PROCESSAMENTO AUTOMÁTICO DOS GABARITOS
 * ================================================================
 *
 * Esta é a ação principal do novo fluxo.
 *
 * Para o professor existe apenas:
 *
 * selecionar PDF
 *      ↓
 * importar
 *      ↓
 * respostas cadastradas
 *
 * Identificação do QR, preparação geométrica e leitura óptica são
 * detalhes técnicos internos.
 * ================================================================
 */

export async function importAnswerSheetScans(
  _previousState: ImportAnswerSheetScansState,
  formData: FormData
): Promise<ImportAnswerSheetScansState> {
  const startedAt = Date.now();

  const user =
    await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message:
        "Sessão expirada. Faça login novamente.",
    };
  }

  const examId =
    getRequiredString(
      formData,
      "examId"
    );

  const examApplicationId =
    getRequiredString(
      formData,
      "examApplicationId"
    );

  const file =
    formData.get("scanPdf");

  if (
    !examId ||
    !examApplicationId
  ) {
    return {
      status: "error",
      message:
        "Aplicação de simulado inválida.",
    };
  }

  if (
    !(file instanceof File)
  ) {
    return {
      status: "error",
      message:
        "Selecione um arquivo PDF.",
    };
  }

  /*
   * Se o arquivo já foi salvo, mas o lote ainda não existe,
   * podemos removê-lo caso a criação do lote falhe.
   *
   * Depois que o lote existe, preservamos o PDF mesmo em caso de
   * falha técnica para permitir diagnóstico/reprocessamento.
   */
  let sourceFileKey:
    string | null = null;

  let batchId:
    string | null = null;

  try {
    /*
     * ============================================================
     * 1. VALIDAR PDF
     * ============================================================
     */
    const validatedPdf =
      await validateScanPdfFile(
        file
      );

    /*
     * ============================================================
     * 2. SALVAR PDF ORIGINAL
     * ============================================================
     */
    const storedPdf =
      await saveOriginalScanPdf({
        examApplicationId,
        fileName:
          validatedPdf.fileName,
        bytes:
          validatedPdf.bytes,
      });

    sourceFileKey =
      storedPdf.sourceFileKey;

    /*
     * ============================================================
     * 3. CRIAR LOTE E PÁGINAS
     * ============================================================
     */
    const importSummary =
      await createScanBatchWithPendingPages(
        {
          examId,
          examApplicationId,
          sourceFileName:
            validatedPdf.fileName,
          sourceFileKey:
            storedPdf.sourceFileKey,
          totalPages:
            validatedPdf.totalPages,
        }
      );

    batchId =
      importSummary.batchId;

    /*
     * ============================================================
     * 4. IDENTIFICAR AS FOLHAS PELO QR
     * ============================================================
     *
     * Uma página sem QR não bloqueia as demais.
     */
    const identificationSummary =
      await identifyScanBatch({
        examId,
        examApplicationId,
        batchId,
      });

    /*
     * ============================================================
     * 5. PREPARAÇÃO TÉCNICA PARA LEITURA
     * ============================================================
     *
     * Isso NÃO é uma etapa do professor.
     *
     * O leitor atual precisa internamente colocar a folha nas
     * coordenadas esperadas para medir as bolhas.
     */
    const preparationSummary =
      await normalizeScanBatch({
        examId,
        examApplicationId,
        batchId,
      });

    /*
     * ============================================================
     * 6. LER TODAS AS FOLHAS POSSÍVEIS
     * ============================================================
     *
     * processAnswerSheetScanBatch agora realiza, para cada folha:
     *
     * leitura óptica
     *      ↓
     * DetectedAnswer
     *      ↓
     * ExamResult
     *      ↓
     * StudentAnswer
     *
     * BLANK, MULTIPLE e UNCERTAIN não bloqueiam.
     */
    const processSummary =
      await processAnswerSheetScanBatch(
        {
          examId,
          examApplicationId,
          batchId,
        }
      );

    /*
     * "reviewRequiredPages" ainda existe no schema por legado.
     *
     * Aqui ele representa páginas que NÃO conseguiram chegar ao
     * processamento final, e não revisão obrigatória pelo professor.
     */
    const occurrencePages =
      processSummary.reviewRequiredPages;

    /*
     * ============================================================
     * 7. ATUALIZAR TELAS QUE DEPENDEM DOS RESULTADOS
     * ============================================================
     */
    revalidatePath(
      `/simulados/${examId}`
    );

    revalidatePath(
      `/simulados/${examId}/resultados`
    );

    revalidatePath(
      `/simulados/${examId}/ranking`
    );

    revalidatePath(
      `/simulados/${examId}/respostas`
    );

    return {
      status: "success",

      message:
        occurrencePages > 0
          ? `Processamento concluído com ${occurrencePages} ocorrência(s).`
          : "Gabaritos processados com sucesso.",

      summary: {
        batchId,

        sourceFileName:
          importSummary.sourceFileName,

        sourceFileKey:
          importSummary.sourceFileKey,

        totalPages:
          importSummary.totalPages,

        registeredPages:
          importSummary.registeredPages,

        identifiedPages:
          processSummary.identifiedPages,

        processedPages:
          processSummary.processedPages,

        occurrencePages,

        duplicatePages:
          identificationSummary.duplicatePages,

        identificationFailedPages:
          identificationSummary.failedPages,

        preparationFailedPages:
          preparationSummary.failedPages,

        technicalFailures:
          processSummary.technicalFailures,

        detectedAnswerTotal:
          processSummary.detectedAnswerTotal,

        status:
          processSummary.status,

        durationMs:
          Date.now() -
          startedAt,
      },
    };
  } catch (error) {
    /*
     * ============================================================
     * FALHA DEPOIS QUE O LOTE JÁ EXISTE
     * ============================================================
     *
     * Não apagamos o PDF.
     *
     * Preservamos lote + arquivo para diagnóstico e eventual
     * reprocessamento.
     */
    if (batchId) {
      try {
        await prisma.answerSheetScanBatch.update(
          {
            where: {
              id: batchId,
            },
            data: {
              status:
                ScanBatchStatus.FAILED,
              completedAt:
                new Date(),
            },
          }
        );
      } catch (batchError) {
        console.error(
          "Erro ao registrar falha do lote:",
          batchError
        );
      }

      revalidatePath(
        `/simulados/${examId}`
      );
    } else if (
      sourceFileKey
    ) {
      /*
       * O PDF foi salvo mas o lote não chegou a existir.
       *
       * Nesse caso não há utilidade em manter um arquivo órfão.
       */
      try {
        await deleteOriginalScanPdf(
          sourceFileKey
        );
      } catch (
        cleanupError
      ) {
        console.error(
          "Erro ao remover PDF após falha de importação:",
          cleanupError
        );
      }
    }

    return {
      status: "error",
      message:
        error instanceof
          ScanPdfValidationError ||
        error instanceof Error
          ? error.message
          : "Não foi possível processar os gabaritos digitalizados.",
    };
  }
}

/*
 * ================================================================
 * AÇÕES LEGADAS / OPERACIONAIS
 * ================================================================
 *
 * Estas funções são mantidas TEMPORARIAMENTE porque os componentes
 * antigos da página ainda as importam.
 *
 * Elas serão removidas da interface no próximo passo.
 * ================================================================
 */

export async function identifyAnswerSheetScans(
  _previousState: IdentifyAnswerSheetScansState,
  formData: FormData
): Promise<IdentifyAnswerSheetScansState> {
  const user =
    await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message:
        "Sessão expirada. Faça login novamente.",
    };
  }

  const examId =
    getRequiredString(
      formData,
      "examId"
    );

  const examApplicationId =
    getRequiredString(
      formData,
      "examApplicationId"
    );

  const batchId =
    getRequiredString(
      formData,
      "batchId"
    );

  if (
    !examId ||
    !examApplicationId ||
    !batchId
  ) {
    return {
      status: "error",
      message:
        "Lote de digitalização inválido.",
    };
  }

  try {
    const summary =
      await identifyScanBatch({
        examId,
        examApplicationId,
        batchId,
      });

    revalidatePath(
      `/simulados/${examId}`
    );

    return {
      status: "success",

      summary: {
        batchId:
          summary.batchId,

        totalPages:
          summary.totalPages,

        processedPages:
          summary.processedPages,

        identifiedPages:
          summary.identifiedPages,

        reviewRequiredPages:
          summary.reviewRequiredPages,

        duplicatePages:
          summary.duplicatePages,

        failedPages:
          summary.failedPages,

        status:
          summary.status ===
          "REVIEW_REQUIRED"
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
  const user =
    await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message:
        "Sessão expirada. Faça login novamente.",
    };
  }

  const examId =
    getRequiredString(
      formData,
      "examId"
    );

  const examApplicationId =
    getRequiredString(
      formData,
      "examApplicationId"
    );

  const batchId =
    getRequiredString(
      formData,
      "batchId"
    );

  if (
    !examId ||
    !examApplicationId ||
    !batchId
  ) {
    return {
      status: "error",
      message:
        "Lote de digitalização inválido.",
    };
  }

  try {
    const summary =
      await normalizeScanBatch({
        examId,
        examApplicationId,
        batchId,
      });

    revalidatePath(
      `/simulados/${examId}`
    );

    return {
      status: "success",

      summary: {
        batchId:
          summary.batchId,

        identifiedPages:
          summary.identifiedPages,

        normalizedPages:
          summary.normalizedPages,

        reviewRequiredPages:
          summary.reviewRequiredPages,

        failedPages:
          summary.failedPages,

        residualAverage:
          summary.residualAverage,

        residualMax:
          summary.residualMax,
      },
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível preparar os gabaritos digitalizados.",
    };
  }
}

export async function processSingleAnswerSheetScan(
  _previousState: ProcessAnswerSheetScanState,
  formData: FormData
): Promise<ProcessAnswerSheetScanState> {
  const user =
    await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message:
        "Sessão expirada. Faça login novamente.",
    };
  }

  const examId =
    getRequiredString(
      formData,
      "examId"
    );

  const scanId =
    getRequiredString(
      formData,
      "scanId"
    );

  if (
    !examId ||
    !scanId
  ) {
    return {
      status: "error",
      message:
        "Página digitalizada inválida.",
    };
  }

  try {
    const summary =
      await processAnswerSheetScan({
        scanId,
      });

    revalidatePath(
      `/simulados/${examId}`
    );

    revalidatePath(
      `/simulados/${examId}/resultados`
    );

    revalidatePath(
      `/simulados/${examId}/ranking`
    );

    revalidatePath(
      `/simulados/${examId}/respostas`
    );

    return {
      status: "success",

      summary: {
        scanId:
          summary.scanId,

        pageNumber:
          summary.pageNumber,

        studentName:
          summary.studentName,

        totalQuestions:
          summary.totalQuestions,

        persistedAnswers:
          summary.persistedAnswers,

        detected:
          summary.detected,

        blank:
          summary.blank,

        multiple:
          summary.multiple,

        uncertain:
          summary.uncertain,

        status:
          summary.status,
      },
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível ler as respostas da folha.",
    };
  }
}

export async function processAnswerSheetScanBatchAction(
  _previousState: ProcessAnswerSheetScanBatchState,
  formData: FormData
): Promise<ProcessAnswerSheetScanBatchState> {
  const user =
    await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message:
        "Sessão expirada. Faça login novamente.",
    };
  }

  const examId =
    getRequiredString(
      formData,
      "examId"
    );

  const examApplicationId =
    getRequiredString(
      formData,
      "examApplicationId"
    );

  const batchId =
    getRequiredString(
      formData,
      "batchId"
    );

  if (
    !examId ||
    !examApplicationId ||
    !batchId
  ) {
    return {
      status: "error",
      message:
        "Lote de digitalização inválido.",
    };
  }

  try {
    const summary =
      await processAnswerSheetScanBatch(
        {
          examId,
          examApplicationId,
          batchId,
        }
      );

    revalidatePath(
      `/simulados/${examId}`
    );

    revalidatePath(
      `/simulados/${examId}/resultados`
    );

    revalidatePath(
      `/simulados/${examId}/ranking`
    );

    revalidatePath(
      `/simulados/${examId}/respostas`
    );

    return {
      status: "success",

      summary: {
        batchId:
          summary.batchId,

        totalPages:
          summary.totalPages,

        eligiblePages:
          summary.eligiblePages,

        processedNow:
          summary.processedNow,

        processedPages:
          summary.processedPages,

        reviewRequiredPages:
          summary.reviewRequiredPages,

        confirmedPages:
          summary.confirmedPages,

        previouslyConfirmed:
          summary.previouslyConfirmed,

        protectedPages:
          summary.protectedPages,

        skippedNotIdentified:
          summary.skippedNotIdentified,

        skippedNotNormalized:
          summary.skippedNotNormalized,

        technicalFailures:
          summary.technicalFailures,

        detectedAnswerTotal:
          summary.detectedAnswerTotal,

        status:
          summary.status,

        durationMs:
          summary.durationMs,
      },
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível processar as respostas do lote.",
    };
  }
}
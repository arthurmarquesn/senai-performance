"use server";

import {
  JourneyDocumentStatus,
  JourneyDocumentType,
  JourneyStatus,
  Prisma,
  Subject,
} from "@prisma/client";

import {
  createHash,
} from "node:crypto";

import {
  revalidatePath,
} from "next/cache";

import {
  getCurrentUser,
} from "@/lib/auth";

import {
  JOURNEY_ANALYSIS_PROMPT_VERSION,
  runJourneyAiAnalysis,
} from "@/lib/journeys/analize-journey";

import {
  prisma,
} from "@/lib/prisma";

const MIN_TEXT_LENGTH =
  30;

const TARGET_CHUNK_LENGTH =
  1600;

const MAX_CHUNK_LENGTH =
  2200;

export type JourneyAnalysisActionState =
  {
    status:
      | "idle"
      | "success"
      | "error";

    message: string;
  };

type ChunkDraft = {
  chunkIndex: number;

  locator: string;

  text: string;

  textHash: string;
};

function sha256(
  value: string,
): string {
  return createHash(
    "sha256",
  )
    .update(value)
    .digest("hex");
}

function normalizeText(
  value: string,
): string {
  return value
    .replace(
      /\r\n?/g,
      "\n",
    )
    .replace(
      /[ \t]+\n/g,
      "\n",
    )
    .replace(
      /\n[ \t]+/g,
      "\n",
    )
    .replace(
      /\n{3,}/g,
      "\n\n",
    )
    .replace(
      /[ \t]{2,}/g,
      " ",
    )
    .trim();
}

function normalizeParagraph(
  value: string,
): string {
  return value
    .replace(
      /\s*\n\s*/g,
      " ",
    )
    .replace(
      /[ \t]{2,}/g,
      " ",
    )
    .trim();
}

function splitLongText(
  text: string,
): string[] {
  if (
    text.length <=
    MAX_CHUNK_LENGTH
  ) {
    return [text];
  }

  const words =
    text
      .split(/\s+/)
      .filter(Boolean);

  const parts:
    string[] = [];

  let current = "";

  for (
    const word of words
  ) {
    const candidate =
      current.length === 0
        ? word
        : `${current} ${word}`;

    if (
      candidate.length >
        MAX_CHUNK_LENGTH &&
      current.length > 0
    ) {
      parts.push(
        current,
      );

      current =
        word;

      continue;
    }

    current =
      candidate;
  }

  if (current) {
    parts.push(
      current,
    );
  }

  return parts;
}

function buildChunks(
  text: string,
): ChunkDraft[] {
  const paragraphs =
    text
      .split(/\n{2,}/)
      .map(
        normalizeParagraph,
      )
      .filter(Boolean)
      .flatMap(
        splitLongText,
      );

  const chunks:
    ChunkDraft[] = [];

  let buffer = "";
  let chunkIndex = 0;

  function flush() {
    const chunkText =
      buffer.trim();

    if (!chunkText) {
      buffer = "";

      return;
    }

    chunks.push({
      chunkIndex,

      locator:
        `text:chunk:${chunkIndex}`,

      text:
        chunkText,

      textHash:
        sha256(
          chunkText,
        ),
    });

    chunkIndex += 1;

    buffer = "";
  }

  for (
    const paragraph of paragraphs
  ) {
    const candidate =
      buffer.length === 0
        ? paragraph
        : `${buffer}\n\n${paragraph}`;

    if (
      candidate.length >
        MAX_CHUNK_LENGTH &&
      buffer.length > 0
    ) {
      flush();

      buffer =
        paragraph;
    } else {
      buffer =
        candidate;
    }

    if (
      buffer.length >=
      TARGET_CHUNK_LENGTH
    ) {
      flush();
    }
  }

  flush();

  return chunks;
}

function readString(
  formData: FormData,
  field: string,
): string {
  const value =
    formData.get(
      field,
    );

  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value.trim();
}

function errorMessage(
  error: unknown,
): string {
  if (
    error instanceof
      Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return "Ocorreu um erro inesperado.";
}

async function requireUser() {
  const user =
    await getCurrentUser();

  if (!user) {
    throw new Error(
      "Sessão inválida. Entre novamente no sistema.",
    );
  }

  return user;
}

export async function addJourneyText(
  formData: FormData,
): Promise<void> {
  await requireUser();

  const journeyId =
    readString(
      formData,
      "journeyId",
    );

  const sourceText =
    readString(
      formData,
      "sourceText",
    );

  if (!journeyId) {
    throw new Error(
      "Jornada inválida.",
    );
  }

  const journey =
    await prisma.journey.findUnique({
      where: {
        id: journeyId,
      },

      select: {
        id: true,

        status:
          true,
      },
    });

  if (!journey) {
    throw new Error(
      "Jornada não encontrada.",
    );
  }

  if (
    journey.status ===
    JourneyStatus.ARCHIVED
  ) {
    throw new Error(
      "Uma Jornada arquivada não pode receber novos roteiros.",
    );
  }

  const normalizedText =
    normalizeText(
      sourceText,
    );

  if (!normalizedText) {
    throw new Error(
      "Insira o roteiro da Jornada.",
    );
  }

  if (
    normalizedText.length <
    MIN_TEXT_LENGTH
  ) {
    throw new Error(
      "O roteiro informado é muito curto.",
    );
  }

  const documentHash =
    sha256(
      normalizedText,
    );

  const existingDocument =
    await prisma.journeyDocument.findFirst({
      where: {
        journeyId,

        sha256:
          documentHash,
      },

      select: {
        id: true,
      },
    });

  if (
    existingDocument
  ) {
    throw new Error(
      "Este roteiro já foi adicionado à Jornada.",
    );
  }

  const chunks =
    buildChunks(
      normalizedText,
    );

  if (
    chunks.length ===
    0
  ) {
    throw new Error(
      "Não foi possível estruturar o roteiro.",
    );
  }

  await prisma.journeyDocument.create({
    data: {
      journeyId,

      type:
        JourneyDocumentType.TEXT,

      sourceText,

      extractedText:
        normalizedText,

      sha256:
        documentHash,

      status:
        JourneyDocumentStatus.READY,

      chunks: {
        create:
          chunks.map(
            (
              chunk,
            ) => ({
              chunkIndex:
                chunk.chunkIndex,

              pageNumber:
                null,

              locator:
                chunk.locator,

              text:
                chunk.text,

              textHash:
                chunk.textHash,
            }),
          ),
      },
    },
  });

  revalidatePath(
    `/jornadas/${journeyId}`,
  );

  revalidatePath(
    "/jornadas",
  );
}

export async function runJourneyAnalysisAction(
  _previousState:
    JourneyAnalysisActionState,

  formData:
    FormData,
): Promise<JourneyAnalysisActionState> {
  let analysisId:
    string | null =
    null;

  let journeyId =
    "";

  let restoreStatus:
    JourneyStatus =
    JourneyStatus.DRAFT;

  try {
    await requireUser();

    journeyId =
      readString(
        formData,
        "journeyId",
      );

    if (!journeyId) {
      throw new Error(
        "Jornada inválida.",
      );
    }

    const journey =
      await prisma.journey.findUnique({
        where: {
          id:
            journeyId,
        },

        include: {
          documents: {
            where: {
              status:
                JourneyDocumentStatus.READY,
            },

            include: {
              chunks: {
                orderBy: {
                  chunkIndex:
                    "asc",
                },
              },
            },

            orderBy: {
              createdAt:
                "asc",
            },
          },

          analyses: {
            where: {
              status:
                "PROCESSING",
            },

            select: {
              id: true,
            },

            take: 1,
          },
        },
      });

    if (!journey) {
      throw new Error(
        "Jornada não encontrada.",
      );
    }

    if (
      journey.status ===
      JourneyStatus.ARCHIVED
    ) {
      throw new Error(
        "Uma Jornada arquivada não pode ser analisada.",
      );
    }

    if (
      journey.analyses
        .length > 0
    ) {
      throw new Error(
        "Já existe uma análise em processamento para esta Jornada.",
      );
    }

    const chunks =
      journey.documents.flatMap(
        (
          document,
        ) =>
          document.chunks.map(
            (
              chunk,
            ) => ({
              id:
                chunk.id,

              documentId:
                document.id,

              chunkIndex:
                chunk.chunkIndex,

              text:
                chunk.text,

              textHash:
                chunk.textHash,
            }),
          ),
      );

    if (
      chunks.length ===
      0
    ) {
      throw new Error(
        "Adicione um roteiro antes de executar a análise.",
      );
    }

    const teacherProfiles =
      await prisma.teacherProfile.findMany({
        select: {
          subject:
            true,
        },
      });

    const configuredSubjects =
      [
        ...new Set(
          teacherProfiles.map(
            (
              profile,
            ) =>
              profile.subject,
          ),
        ),
      ];

    const availableSubjects:
      Subject[] =
      configuredSubjects.length >
      0
        ? configuredSubjects
        : Object.values(
            Subject,
          );

    const inputHash =
      sha256(
        JSON.stringify({
          journeyId:
            journey.id,

          title:
            journey.title,

          grade:
            journey.grade,

          description:
            journey.description,

          chunks:
            chunks.map(
              (
                chunk,
              ) => ({
                id:
                  chunk.id,

                textHash:
                  chunk.textHash ??
                  sha256(
                    chunk.text,
                  ),
              }),
            ),

          subjects:
            availableSubjects,
        }),
      );

    restoreStatus =
      journey.status ===
      JourneyStatus.IN_ANALYSIS
        ? JourneyStatus.DRAFT
        : journey.status;

    const analysis =
      await prisma.$transaction(
        async (
          tx,
        ) => {
          const created =
            await tx.journeyAnalysis.create({
              data: {
                journeyId:
                  journey.id,

                status:
                  "PROCESSING",

                provider:
                  "groq",

                promptVersion:
                  JOURNEY_ANALYSIS_PROMPT_VERSION,

                inputHash,

                startedAt:
                  new Date(),
              },

              select: {
                id:
                  true,
              },
            });

          await tx.journey.update({
            where: {
              id:
                journey.id,
            },

            data: {
              status:
                JourneyStatus.IN_ANALYSIS,
            },
          });

          return created;
        },
      );

    analysisId =
      analysis.id;

    const ai =
      await runJourneyAiAnalysis({
        journeyTitle:
          journey.title,

        journeyDescription:
          journey.description,

        grade:
          journey.grade,

        chunks,

        availableSubjects,
      });

    const chunkByIndex =
      new Map(
        chunks.map(
          (
            chunk,
          ) => [
            chunk.chunkIndex,
            chunk,
          ],
        ),
      );

    await prisma.$transaction(
      async (
        tx,
      ) => {
        for (
          const suggestion of
          ai.result.suggestions
        ) {
          const evidenceChunk =
            chunkByIndex.get(
              suggestion.evidenceChunkIndex,
            );

          if (
            !evidenceChunk
          ) {
            throw new Error(
              "A IA retornou uma referência de evidência inválida.",
            );
          }

          await tx.journeySuggestion.create({
            data: {
              journeyId:
                journey.id,

              analysisId:
                analysis.id,

              subject:
                suggestion.subject,

              type:
                suggestion.type,

              title:
                suggestion.title,

              objective:
                suggestion.objective,

              content:
                suggestion.content,

              rationale:
                suggestion.rationale,

              contentTopics:
                suggestion.contentTopics,

              evidenceChunkId:
                evidenceChunk.id,

              evidence:
                suggestion.evidence,

              status:
                "SUGGESTED",
            },
          });
        }

        await tx.journeyAnalysis.update({
          where: {
            id:
              analysis.id,
          },

          data: {
            status:
              "COMPLETED",

            modelName:
              ai.modelName,

            summary:
              ai.result.summary,

            output:
              ai.result as unknown as Prisma.InputJsonValue,

            completedAt:
              new Date(),

            errorMessage:
              null,
          },
        });

        await tx.journey.update({
          where: {
            id:
              journey.id,
          },

          data: {
            status:
              restoreStatus,
          },
        });
      },
    );

    revalidatePath(
      `/jornadas/${journeyId}`,
    );

    revalidatePath(
      "/jornadas",
    );

    return {
      status:
        "success",

      message:
        `${ai.result.suggestions.length} sugestões pedagógicas foram geradas.`,
    };
  } catch (error) {
    if (
      analysisId &&
      journeyId
    ) {
      try {
        await prisma.$transaction([
          prisma.journeyAnalysis.update({
            where: {
              id:
                analysisId,
            },

            data: {
              status:
                "FAILED",

              errorMessage:
                errorMessage(
                  error,
                ),

              completedAt:
                new Date(),
            },
          }),

          prisma.journey.update({
            where: {
              id:
                journeyId,
            },

            data: {
              status:
                restoreStatus,
            },
          }),
        ]);
      } catch {
        // O erro principal será retornado abaixo.
      }
    }

    if (journeyId) {
      revalidatePath(
        `/jornadas/${journeyId}`,
      );
    }

    return {
      status:
        "error",

      message:
        errorMessage(
          error,
        ),
    };
  }
}
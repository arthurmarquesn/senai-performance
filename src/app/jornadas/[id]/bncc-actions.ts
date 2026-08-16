"use server";

import {
  JourneyStatus,
} from "@prisma/client";

import {
  revalidatePath,
} from "next/cache";

import {
  getCurrentUser,
} from "@/lib/auth";

import {
  linkJourneySuggestionsToBncc,
} from "@/lib/journeys/link-bncc";

import {
  prisma,
} from "@/lib/prisma";

export type JourneyBnccActionState = {
  status:
    | "idle"
    | "success"
    | "error";

  message: string;
};

function readString(
  formData: FormData,
  field: string,
): string {
  const value =
    formData.get(
      field,
    );

  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function getErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return "Não foi possível realizar o cruzamento com a BNCC.";
}

function readStringArray(
  value: unknown,
): string[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .map((item) =>
      typeof item ===
      "string"
        ? item.trim()
        : "",
    )
    .filter(Boolean);
}

export async function linkJourneyBnccAction(
  _previousState:
    JourneyBnccActionState,

  formData:
    FormData,
): Promise<JourneyBnccActionState> {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      throw new Error(
        "Sessão inválida. Entre novamente no sistema.",
      );
    }

    const journeyId =
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

        select: {
          id:
            true,

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
        "Uma Jornada arquivada não pode receber novos vínculos BNCC.",
      );
    }

    if (
      journey.status ===
      JourneyStatus.IN_ANALYSIS
    ) {
      throw new Error(
        "Aguarde a análise pedagógica atual terminar antes de cruzar com a BNCC.",
      );
    }

    const latestAnalysis =
      await prisma.journeyAnalysis.findFirst({
        where: {
          journeyId,

          status:
            "COMPLETED",
        },

        orderBy: {
          createdAt:
            "desc",
        },

        include: {
          suggestions: {
            orderBy: {
              createdAt:
                "asc",
            },

            include: {
              evidenceChunk: {
                select: {
                  id:
                    true,

                  text:
                    true,
                },
              },
            },
          },
        },
      });

    if (!latestAnalysis) {
      throw new Error(
        "Execute uma análise pedagógica antes de realizar o cruzamento com a BNCC.",
      );
    }

    if (
      latestAnalysis.suggestions
        .length < 3
    ) {
      throw new Error(
        "A análise pedagógica não possui o mínimo de três sugestões.",
      );
    }

    const result =
      await linkJourneySuggestionsToBncc(
        latestAnalysis.suggestions.map(
          (suggestion) => ({
            id:
              suggestion.id,

            analysisId:
              suggestion.analysisId,

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
              readStringArray(
                suggestion.contentTopics,
              ),

            evidenceChunkId:
              suggestion.evidenceChunkId,

            evidenceText:
              suggestion.evidenceChunk
                ?.text ??
              null,

            evidenceExplanation:
              suggestion.evidence,
          }),
        ),
      );

    const suggestionIds =
      latestAnalysis.suggestions.map(
        (suggestion) =>
          suggestion.id,
      );

    // APPROVED e REJECTED representam decisão humana.
    // Nunca são apagados por uma nova execução automática.
    const protectedLinks =
      await prisma.journeyBnccLink.findMany({
        where: {
          suggestionId: {
            in:
              suggestionIds,
          },

          status: {
            in: [
              "APPROVED",
              "REJECTED",
            ],
          },
        },

        select: {
          suggestionId:
            true,

          bnccSkillId:
            true,
        },
      });

    const protectedKeys =
      new Set(
        protectedLinks.map(
          (link) =>
            `${link.suggestionId}:${link.bnccSkillId}`,
        ),
      );

    const linksToCreate =
      result.links.filter(
        (link) =>
          !protectedKeys.has(
            `${link.suggestionId}:${link.bnccSkillId}`,
          ),
      );

    await prisma.$transaction(
      async (tx) => {
        // Substituímos somente sugestões automáticas anteriores.
        // Decisões humanas permanecem intactas.
        await tx.journeyBnccLink.deleteMany({
          where: {
            suggestionId: {
              in:
                suggestionIds,
            },

            status:
              "SUGGESTED",
          },
        });

        if (
          linksToCreate.length >
          0
        ) {
          await tx.journeyBnccLink.createMany({
            data:
              linksToCreate.map(
                (link) => ({
                  suggestionId:
                    link.suggestionId,

                  bnccSkillId:
                    link.bnccSkillId,

                  analysisId:
                    link.analysisId,

                  evidenceChunkId:
                    link.evidenceChunkId,

                  evidenceExcerpt:
                    link.evidenceExcerpt,

                  retrievalScore:
                    link.retrievalScore,

                  aiRelevanceScore:
                    link.aiRelevanceScore,

                  confidence:
                    link.confidence,

                  candidateRank:
                    link.candidateRank,

                  justification:
                    link.justification,

                  status:
                    "SUGGESTED",
                }),
              ),
          });
        }
      },
    );

    revalidatePath(
      `/jornadas/${journeyId}`,
    );

    revalidatePath(
      "/jornadas",
    );

    if (
      linksToCreate.length ===
      0
    ) {
      return {
        status:
          "success",

        message:
          "O cruzamento foi concluído, mas nenhuma associação atingiu o nível mínimo de pertinência definido.",
      };
    }

    return {
      status:
        "success",

      message:
        `${linksToCreate.length} associação(ões) com habilidades oficiais da BNCC foram sugeridas.`,
    };
  } catch (error) {
    return {
      status:
        "error",

      message:
        getErrorMessage(
          error,
        ),
    };
  }
}
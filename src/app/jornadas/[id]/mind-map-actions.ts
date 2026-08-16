"use server";

import {
  JourneyStatus,
  Prisma,
} from "@prisma/client";

import {
  revalidatePath,
} from "next/cache";

import {
  getCurrentUser,
} from "@/lib/auth";

import {
  buildJourneyMindMap,
} from "@/lib/journeys/build-mind-map";

import {
  prisma,
} from "@/lib/prisma";

export type JourneyMindMapActionState = {
  status:
    | "idle"
    | "success"
    | "error";

  message:
    string;
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

  return "Não foi possível gerar o mapa mental.";
}

export async function generateJourneyMindMapAction(
  _previousState:
    JourneyMindMapActionState,

  formData:
    FormData,
): Promise<JourneyMindMapActionState> {
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

          title:
            true,

          description:
            true,

          grade:
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
        "Uma Jornada arquivada não pode gerar um novo mapa mental.",
      );
    }

    if (
      journey.status ===
      JourneyStatus.IN_ANALYSIS
    ) {
      throw new Error(
        "Aguarde a análise pedagógica atual terminar.",
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
              bnccLinks: {
                include: {
                  bnccSkill: {
                    select: {
                      id:
                        true,

                      code:
                        true,

                      description:
                        true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    if (!latestAnalysis) {
      throw new Error(
        "Execute uma análise pedagógica antes de gerar o mapa mental.",
      );
    }

    if (
      latestAnalysis.suggestions
        .length < 3
    ) {
      throw new Error(
        "A análise precisa possuir pelo menos três sugestões pedagógicas.",
      );
    }

    const structure =
      buildJourneyMindMap({
        journey: {
          id:
            journey.id,

          title:
            journey.title,

          description:
            journey.description,

          grade:
            journey.grade,
        },

        suggestions:
          latestAnalysis.suggestions.map(
            (suggestion) => ({
              id:
                suggestion.id,

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

              bnccLinks:
                suggestion.bnccLinks.map(
                  (link) => ({
                    id:
                      link.id,

                    status:
                      link.status,

                    justification:
                      link.justification,

                    bnccSkill: {
                      id:
                        link.bnccSkill.id,

                      code:
                        link.bnccSkill.code,

                      description:
                        link.bnccSkill.description,
                    },
                  }),
                ),
            }),
          ),
      });

    const created =
      await prisma.$transaction(
        async (tx) => {
          const versionData =
            await tx.journeyMindMap.aggregate({
              where: {
                journeyId,
              },

              _max: {
                version:
                  true,
              },
            });

          const nextVersion =
            (
              versionData._max
                .version ??
              0
            ) + 1;

          await tx.journeyMindMap.updateMany({
            where: {
              journeyId,

              isCurrent:
                true,
            },

            data: {
              isCurrent:
                false,
            },
          });

          return tx.journeyMindMap.create({
            data: {
              journeyId,

              analysisId:
                latestAnalysis.id,

              title:
                `${journey.title} — mapa pedagógico`,

              structure:
                structure as unknown as
                  Prisma.InputJsonValue,

              schemaVersion:
                1,

              version:
                nextVersion,

              isCurrent:
                true,

              // O mapa não chama IA novamente.
              // Ele apenas reorganiza informações já existentes.
              generatedByAi:
                false,
            },

            select: {
              version:
                true,
            },
          });
        },
      );

    revalidatePath(
      `/jornadas/${journeyId}`,
    );

    return {
      status:
        "success",

      message:
        `Mapa mental v${created.version} gerado com sucesso.`,
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
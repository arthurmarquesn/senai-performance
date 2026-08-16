"use server";

import {
  JourneyActivityStatus,
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
  generateJourneyActivity,
} from "@/lib/journeys/generate-activity";

import {
  prisma,
} from "@/lib/prisma";

export type GenerateActivityActionState = {
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
    formData.get(field);

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

  return "Não foi possível gerar a atividade.";
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

export async function generateActivityAction(
  _previousState:
    GenerateActivityActionState,

  formData:
    FormData,
): Promise<GenerateActivityActionState> {
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

    const suggestionId =
      readString(
        formData,
        "suggestionId",
      );

    if (!journeyId) {
      throw new Error(
        "Jornada inválida.",
      );
    }

    if (!suggestionId) {
      throw new Error(
        "Sugestão pedagógica inválida.",
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
        "Uma Jornada arquivada não pode gerar novas atividades.",
      );
    }

    if (
      journey.status ===
      JourneyStatus.IN_ANALYSIS
    ) {
      throw new Error(
        "Aguarde a análise atual da Jornada terminar.",
      );
    }

    const suggestion =
      await prisma.journeySuggestion.findFirst({
        where: {
          id:
            suggestionId,

          journeyId,
        },

        include: {
          evidenceChunk: {
            select: {
              text:
                true,
            },
          },

          bnccLinks: {
            where: {
              status:
                "APPROVED",
            },

            include: {
              bnccSkill: {
                select: {
                  id:
                    true,

                  code:
                    true,

                  description:
                    true,

                  isCurrent:
                    true,

                  source: {
                    select: {
                      status:
                        true,
                    },
                  },
                },
              },
            },

            orderBy: {
              candidateRank:
                "asc",
            },
          },
        },
      });

    if (!suggestion) {
      throw new Error(
        "Sugestão pedagógica não encontrada nesta Jornada.",
      );
    }

    const approvedLinks =
      suggestion.bnccLinks.filter(
        (link) =>
          link.bnccSkill.isCurrent &&
          link.bnccSkill.source.status ===
            "VERIFIED",
      );

    if (
      approvedLinks.length ===
      0
    ) {
      throw new Error(
        "Aprove pelo menos uma habilidade BNCC antes de gerar a atividade.",
      );
    }

    const generated =
      await generateJourneyActivity({
        journey: {
          title:
            journey.title,

          description:
            journey.description,

          grade:
            journey.grade,
        },

        suggestion: {
          subject:
            suggestion.subject,

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

          evidence:
            suggestion.evidenceChunk
              ?.text ??
            suggestion.evidence ??
            null,
        },

        approvedBnccSkills:
          approvedLinks.map(
            (link) => ({
              id:
                link.bnccSkill.id,

              code:
                link.bnccSkill.code,

              description:
                link.bnccSkill.description,
            }),
          ),
      });

    const activity =
      await prisma.$transaction(
        async (tx) => {
          const created =
            await tx.journeyActivity.create({
              data: {
                journeyId:
                  journey.id,

                suggestionId:
                  suggestion.id,

                teacherProfileId:
                  null,

                subject:
                  suggestion.subject,

                title:
                  generated.activity.title,

                objective:
                  generated.activity.objective,

                instructions:
                  generated.activity.instructions,

                materials: {
                  estimatedMinutes:
                    generated.activity.estimatedMinutes,

                  studentOrganization:
                    generated.activity.studentOrganization,

                  resources:
                    generated.activity.resources,

                  expectedProduct:
                    generated.activity.expectedProduct,

                  assessmentCriteria:
                    generated.activity.assessmentCriteria,

                  teacherNotes:
                    generated.activity.teacherNotes,

                  generation: {
                    provider:
                      "groq",

                    model:
                      generated.modelName,

                    promptVersion:
                      "journey-activity-v1",

                    generatedAt:
                      new Date().toISOString(),
                  },
                } satisfies Prisma.InputJsonValue,

                status:
                  JourneyActivityStatus.DRAFT,

                generatedByAi:
                  true,

                bnccSkills: {
                  create:
                    approvedLinks.map(
                      (link) => ({
                        bnccSkillId:
                          link.bnccSkill.id,
                      }),
                    ),
                },
              },

              select: {
                id:
                  true,

                title:
                  true,
              },
            });

          return created;
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
        `Atividade "${activity.title}" criada como rascunho.`,
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
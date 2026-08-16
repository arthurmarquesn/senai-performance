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
  prisma,
} from "@/lib/prisma";

export type JourneyActivityEditorStatus =
  | "DRAFT"
  | "APPROVED"
  | "PUBLISHED"
  | "ARCHIVED";

export type SaveJourneyActivityInput = {
  journeyId: string;
  activityId: string;
  title: string;
  objective: string;
  instructions: string;
  estimatedMinutes: number;
  studentOrganization: string;
  resources: string[];
  expectedProduct: string;
  assessmentCriteria: string[];
  teacherNotes: string;
};

export type JourneyActivityMutationResult =
  | {
      ok: true;
      message: string;
      status: JourneyActivityEditorStatus;
    }
  | {
      ok: false;
      message: string;
    };

type ValidatedActivityInput = {
  title: string;
  objective: string;
  instructions: string;
  estimatedMinutes: number;
  studentOrganization: string;
  resources: string[];
  expectedProduct: string;
  assessmentCriteria: string[];
  teacherNotes: string;
};

type ActivityMaterials = {
  estimatedMinutes: number;
  studentOrganization: string;
  resources: string[];
  expectedProduct: string;
  assessmentCriteria: string[];
  teacherNotes: string;
};

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizeRequiredText(
  value: string,
  label: string,
  maxLength?: number,
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${label} é obrigatório.`,
    );
  }

  if (
    maxLength &&
    normalized.length >
      maxLength
  ) {
    throw new Error(
      `${label} deve possuir no máximo ${maxLength} caracteres.`,
    );
  }

  return normalized;
}

function normalizeList(
  values: string[],
  label: string,
): string[] {
  const normalized =
    Array.from(
      new Set(
        values
          .map((value) =>
            value.trim(),
          )
          .filter(Boolean),
      ),
    );

  if (
    normalized.length === 0
  ) {
    throw new Error(
      `${label} deve possuir ao menos um item.`,
    );
  }

  return normalized;
}

function validateActivityInput(
  input: SaveJourneyActivityInput,
): ValidatedActivityInput {
  if (
    !Number.isInteger(
      input.estimatedMinutes,
    ) ||
    input.estimatedMinutes < 10 ||
    input.estimatedMinutes > 600
  ) {
    throw new Error(
      "A duração deve ser um número inteiro entre 10 e 600 minutos.",
    );
  }

  return {
    title:
      normalizeRequiredText(
        input.title,
        "Título",
        220,
      ),

    objective:
      normalizeRequiredText(
        input.objective,
        "Objetivo",
      ),

    instructions:
      normalizeRequiredText(
        input.instructions,
        "Desenvolvimento",
      ),

    estimatedMinutes:
      input.estimatedMinutes,

    studentOrganization:
      normalizeRequiredText(
        input.studentOrganization,
        "Organização dos estudantes",
      ),

    resources:
      normalizeList(
        input.resources,
        "Recursos",
      ),

    expectedProduct:
      normalizeRequiredText(
        input.expectedProduct,
        "Produto esperado",
      ),

    assessmentCriteria:
      normalizeList(
        input.assessmentCriteria,
        "Critérios de avaliação",
      ),

    teacherNotes:
      input.teacherNotes.trim(),
  };
}

function readActivityMaterials(
  value: unknown,
): ActivityMaterials | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.estimatedMinutes !== "number" ||
    typeof value.studentOrganization !== "string" ||
    typeof value.expectedProduct !== "string" ||
    typeof value.teacherNotes !== "string" ||
    !Array.isArray(value.resources) ||
    !Array.isArray(value.assessmentCriteria)
  ) {
    return null;
  }

  const resources =
    value.resources.filter(
      (item): item is string =>
        typeof item === "string" &&
        Boolean(item.trim()),
    );

  const assessmentCriteria =
    value.assessmentCriteria.filter(
      (item): item is string =>
        typeof item === "string" &&
        Boolean(item.trim()),
    );

  return {
    estimatedMinutes:
      value.estimatedMinutes,
    studentOrganization:
      value.studentOrganization,
    resources,
    expectedProduct:
      value.expectedProduct,
    assessmentCriteria,
    teacherNotes:
      value.teacherNotes,
  };
}

function readGenerationMetadata(
  value: unknown,
): Prisma.InputJsonObject | null {
  if (!isRecord(value)) {
    return null;
  }

  const generation =
    value.generation;

  if (!isRecord(generation)) {
    return null;
  }

  const provider =
    typeof generation.provider ===
    "string"
      ? generation.provider
      : null;

  const model =
    typeof generation.model ===
    "string"
      ? generation.model
      : null;

  const promptVersion =
    typeof generation.promptVersion ===
    "string"
      ? generation.promptVersion
      : null;

  const generatedAt =
    typeof generation.generatedAt ===
    "string"
      ? generation.generatedAt
      : null;

  if (
    !provider &&
    !model &&
    !promptVersion &&
    !generatedAt
  ) {
    return null;
  }

  return {
    ...(provider
      ? { provider }
      : {}),
    ...(model
      ? { model }
      : {}),
    ...(promptVersion
      ? { promptVersion }
      : {}),
    ...(generatedAt
      ? { generatedAt }
      : {}),
  };
}

function toMaterialsJson(
  data: ValidatedActivityInput,
  previousMaterials: unknown,
): Prisma.InputJsonValue {
  const generation =
    readGenerationMetadata(
      previousMaterials,
    );

  const materials:
    Prisma.InputJsonObject = {
      estimatedMinutes:
        data.estimatedMinutes,
      studentOrganization:
        data.studentOrganization,
      resources:
        data.resources,
      expectedProduct:
        data.expectedProduct,
      assessmentCriteria:
        data.assessmentCriteria,
      teacherNotes:
        data.teacherNotes,
      ...(generation
        ? { generation }
        : {}),
  };

  return materials;
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

  return "Não foi possível atualizar a atividade.";
}

export async function saveJourneyActivityAction(
  input: SaveJourneyActivityInput,
): Promise<JourneyActivityMutationResult> {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      throw new Error(
        "Sessão inválida. Entre novamente no sistema.",
      );
    }

    const journeyId =
      input.journeyId.trim();

    const activityId =
      input.activityId.trim();

    if (!journeyId) {
      throw new Error(
        "Jornada inválida.",
      );
    }

    if (!activityId) {
      throw new Error(
        "Atividade inválida.",
      );
    }

    const validated =
      validateActivityInput(
        input,
      );

    const activity =
      await prisma.journeyActivity.findFirst({
        where: {
          id:
            activityId,
          journeyId,
        },

        select: {
          id:
            true,
          status:
            true,
          materials:
            true,
          journey: {
            select: {
              status:
                true,
            },
          },
        },
      });

    if (!activity) {
      throw new Error(
        "Atividade não encontrada nesta Jornada.",
      );
    }

    if (
      activity.journey.status ===
      JourneyStatus.ARCHIVED
    ) {
      throw new Error(
        "Uma Jornada arquivada não pode ter atividades alteradas.",
      );
    }

    if (
      activity.status ===
        JourneyActivityStatus.PUBLISHED ||
      activity.status ===
        JourneyActivityStatus.ARCHIVED
    ) {
      throw new Error(
        "Esta atividade não pode mais ser editada.",
      );
    }

    const nextStatus =
      JourneyActivityStatus.DRAFT;

    await prisma.journeyActivity.update({
      where: {
        id:
          activity.id,
      },

      data: {
        title:
          validated.title,
        objective:
          validated.objective,
        instructions:
          validated.instructions,
        materials:
          toMaterialsJson(
            validated,
            activity.materials,
          ),
        status:
          nextStatus,
      },
    });

    revalidatePath(
      `/jornadas/${journeyId}`,
    );

    return {
      ok:
        true,
      message:
        activity.status ===
        JourneyActivityStatus.APPROVED
          ? "Alterações salvas. Como o conteúdo mudou, a atividade voltou para rascunho e precisa ser aprovada novamente."
          : "Alterações salvas.",
      status:
        "DRAFT",
    };
  } catch (error) {
    return {
      ok:
        false,
      message:
        getErrorMessage(
          error,
        ),
    };
  }
}

export async function approveJourneyActivityAction(
  input: {
    journeyId: string;
    activityId: string;
  },
): Promise<JourneyActivityMutationResult> {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      throw new Error(
        "Sessão inválida. Entre novamente no sistema.",
      );
    }

    const journeyId =
      input.journeyId.trim();

    const activityId =
      input.activityId.trim();

    if (
      !journeyId ||
      !activityId
    ) {
      throw new Error(
        "Atividade inválida.",
      );
    }

    const activity =
      await prisma.journeyActivity.findFirst({
        where: {
          id:
            activityId,
          journeyId,
        },

        include: {
          journey: {
            select: {
              status:
                true,
            },
          },

          bnccSkills: {
            include: {
              bnccSkill: {
                select: {
                  id:
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
          },
        },
      });

    if (!activity) {
      throw new Error(
        "Atividade não encontrada nesta Jornada.",
      );
    }

    if (
      activity.journey.status ===
        JourneyStatus.ARCHIVED ||
      activity.journey.status ===
        JourneyStatus.IN_ANALYSIS
    ) {
      throw new Error(
        "A Jornada não permite aprovar atividades neste momento.",
      );
    }

    if (
      activity.status ===
        JourneyActivityStatus.PUBLISHED ||
      activity.status ===
        JourneyActivityStatus.ARCHIVED
    ) {
      throw new Error(
        "Esta atividade não pode ser aprovada neste estado.",
      );
    }

    const title =
      activity.title.trim();
    const objective =
      activity.objective?.trim() ?? "";
    const instructions =
      activity.instructions?.trim() ?? "";
    const materials =
      readActivityMaterials(
        activity.materials,
      );

    if (
      !title ||
      !objective ||
      !instructions ||
      !materials
    ) {
      throw new Error(
        "Complete e salve todos os campos obrigatórios antes da aprovação.",
      );
    }

    if (
      !Number.isInteger(
        materials.estimatedMinutes,
      ) ||
      materials.estimatedMinutes < 10 ||
      materials.estimatedMinutes > 600 ||
      !materials.studentOrganization.trim() ||
      !materials.expectedProduct.trim() ||
      materials.resources.length === 0 ||
      materials.assessmentCriteria.length === 0
    ) {
      throw new Error(
        "A estrutura da atividade está incompleta. Revise e salve a atividade antes de aprová-la.",
      );
    }

    if (
      activity.bnccSkills.length ===
      0
    ) {
      throw new Error(
        "A atividade precisa possuir pelo menos uma habilidade BNCC validada.",
      );
    }

    const invalidBncc =
      activity.bnccSkills.find(
        (link) =>
          !link.bnccSkill.isCurrent ||
          link.bnccSkill.source.status !==
            "VERIFIED",
      );

    if (invalidBncc) {
      throw new Error(
        "A atividade possui uma habilidade BNCC que não pertence mais à base oficial vigente e verificada.",
      );
    }

    await prisma.journeyActivity.update({
      where: {
        id:
          activity.id,
      },

      data: {
        status:
          JourneyActivityStatus.APPROVED,
      },
    });

    revalidatePath(
      `/jornadas/${journeyId}`,
    );

    return {
      ok:
        true,
      message:
        "Atividade aprovada e pronta para a próxima etapa.",
      status:
        "APPROVED",
    };
  } catch (error) {
    return {
      ok:
        false,
      message:
        getErrorMessage(
          error,
        ),
    };
  }
}
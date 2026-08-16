"use server";

import {
  JourneyReviewStatus,
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

export type BnccReviewActionState = {
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

  return "Não foi possível atualizar a validação BNCC.";
}

function parseReviewStatus(
  value: string,
): JourneyReviewStatus {
  if (
    value ===
    JourneyReviewStatus.APPROVED
  ) {
    return JourneyReviewStatus.APPROVED;
  }

  if (
    value ===
    JourneyReviewStatus.REJECTED
  ) {
    return JourneyReviewStatus.REJECTED;
  }

  if (
    value ===
    JourneyReviewStatus.SUGGESTED
  ) {
    return JourneyReviewStatus.SUGGESTED;
  }

  throw new Error(
    "Status de validação inválido.",
  );
}

export async function reviewJourneyBnccLinkAction(
  _previousState:
    BnccReviewActionState,

  formData:
    FormData,
): Promise<BnccReviewActionState> {
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

    const linkId =
      readString(
        formData,
        "linkId",
      );

    const status =
      parseReviewStatus(
        readString(
          formData,
          "status",
        ),
      );

    const validationNote =
      readString(
        formData,
        "validationNote",
      );

    if (!journeyId) {
      throw new Error(
        "Jornada inválida.",
      );
    }

    if (!linkId) {
      throw new Error(
        "Vínculo BNCC inválido.",
      );
    }

    const link =
      await prisma.journeyBnccLink.findFirst({
        where: {
          id:
            linkId,

          suggestion: {
            journeyId,
          },
        },

        select: {
          id:
            true,

          status:
            true,

          suggestion: {
            select: {
              journeyId:
                true,
            },
          },
        },
      });

    if (!link) {
      throw new Error(
        "Associação BNCC não encontrada nesta Jornada.",
      );
    }

    await prisma.journeyBnccLink.update({
      where: {
        id:
          link.id,
      },

      data: {
        status,

        validatedById:
          status ===
          JourneyReviewStatus.SUGGESTED
            ? null
            : user.id,

        validatedAt:
          status ===
          JourneyReviewStatus.SUGGESTED
            ? null
            : new Date(),

        validationNote:
          status ===
          JourneyReviewStatus.SUGGESTED
            ? null
            : validationNote ||
              null,
      },
    });

    revalidatePath(
      `/jornadas/${journeyId}`,
    );

    revalidatePath(
      "/jornadas",
    );

    if (
      status ===
      JourneyReviewStatus.APPROVED
    ) {
      return {
        status:
          "success",

        message:
          "Habilidade BNCC aprovada.",
      };
    }

    if (
      status ===
      JourneyReviewStatus.REJECTED
    ) {
      return {
        status:
          "success",

        message:
          "Habilidade BNCC rejeitada.",
      };
    }

    return {
      status:
        "success",

      message:
        "Habilidade retornada para análise.",
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
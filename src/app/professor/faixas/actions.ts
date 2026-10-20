"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type PerformanceBandInput = {
  name: string;
  minPercentage: number;
  maxPercentage: number;
  requiresComplementaryActivity: boolean;
};

export type SavePerformanceBandsResult =
  | {
      status: "success";
      message: string;
      bands: Array<{
        id: string;
        name: string;
        minPercentage: number;
        maxPercentage: number;
        requiresComplementaryActivity: boolean;
        position: number;
      }>;
    }
  | {
      status: "error";
      message: string;
    };

function normalizeInteger(value: number) {
  return Math.round(Number(value));
}

function validateBands(input: PerformanceBandInput[]) {
  const normalized = input.map((band, index) => ({
    name: band.name.trim(),

    minPercentage: normalizeInteger(
      band.minPercentage,
    ),

    maxPercentage: normalizeInteger(
      band.maxPercentage,
    ),

    requiresComplementaryActivity: Boolean(
      band.requiresComplementaryActivity,
    ),

    originalPosition: index,
  }));

  for (const band of normalized) {
    if (!band.name) {
      throw new Error(
        "Todas as faixas precisam possuir um nome.",
      );
    }

    if (band.name.length > 100) {
      throw new Error(
        `O nome "${band.name}" ultrapassa 100 caracteres.`,
      );
    }

    if (
      band.minPercentage < 0 ||
      band.minPercentage > 100
    ) {
      throw new Error(
        `O valor mínimo da faixa "${band.name}" deve estar entre 0% e 100%.`,
      );
    }

    if (
      band.maxPercentage < 0 ||
      band.maxPercentage > 100
    ) {
      throw new Error(
        `O valor máximo da faixa "${band.name}" deve estar entre 0% e 100%.`,
      );
    }

    if (
      band.minPercentage >
      band.maxPercentage
    ) {
      throw new Error(
        `O início da faixa "${band.name}" não pode ser maior que o fim.`,
      );
    }
  }

  const ordered = [...normalized].sort(
    (a, b) =>
      a.minPercentage -
        b.minPercentage ||
      a.maxPercentage -
        b.maxPercentage ||
      a.originalPosition -
        b.originalPosition,
  );

  for (
    let index = 1;
    index < ordered.length;
    index++
  ) {
    const previous =
      ordered[index - 1];

    const current =
      ordered[index];

    if (
      current.minPercentage <=
      previous.maxPercentage
    ) {
      throw new Error(
        `As faixas "${previous.name}" e "${current.name}" estão sobrepostas.`,
      );
    }
  }

  return ordered.map(
    (
      band,
      position,
    ) => ({
      name: band.name,

      minPercentage:
        band.minPercentage,

      maxPercentage:
        band.maxPercentage,

      requiresComplementaryActivity:
        band.requiresComplementaryActivity,

      position,
    }),
  );
}

export async function savePerformanceBands(
  input: PerformanceBandInput[],
): Promise<SavePerformanceBandsResult> {
  const user =
    await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message:
        "Sua sessão expirou. Faça login novamente.",
    };
  }

  if (
    user.role !==
    "TEACHER"
  ) {
    return {
      status: "error",
      message:
        "As faixas de desempenho pertencem ao perfil do professor.",
    };
  }

  const teacherProfile =
    await prisma.teacherProfile.findUnique({
      where: {
        userId: user.id,
      },

      select: {
        id: true,
      },
    });

  if (!teacherProfile) {
    return {
      status: "error",
      message:
        "Seu perfil pedagógico não está configurado.",
    };
  }

  let normalizedBands: ReturnType<
    typeof validateBands
  >;

  try {
    normalizedBands =
      validateBands(input);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "As faixas informadas são inválidas.",
    };
  }

  try {
    const savedBands =
      await prisma.$transaction(
        async (tx) => {
          /*
           * A configuração inteira do professor
           * é substituída em uma única transação.
           *
           * Assim evitamos estado parcial.
           */
          await tx.teacherPerformanceBand.deleteMany({
            where: {
              teacherProfileId:
                teacherProfile.id,
            },
          });

          for (
            const band
            of normalizedBands
          ) {
            await tx.teacherPerformanceBand.create({
              data: {
                teacherProfileId:
                  teacherProfile.id,

                name:
                  band.name,

                minPercentage:
                  band.minPercentage,

                maxPercentage:
                  band.maxPercentage,

                requiresComplementaryActivity:
                  band.requiresComplementaryActivity,

                position:
                  band.position,
              },
            });
          }

          return tx.teacherPerformanceBand.findMany({
            where: {
              teacherProfileId:
                teacherProfile.id,
            },

            select: {
              id: true,
              name: true,

              minPercentage: true,
              maxPercentage: true,

              requiresComplementaryActivity:
                true,

              position: true,
            },

            orderBy: [
              {
                minPercentage:
                  "asc",
              },

              {
                position:
                  "asc",
              },
            ],
          });
        },
      );

    revalidatePath(
      "/professor",
    );

    revalidatePath(
      "/professor/faixas",
    );

    revalidatePath(
      "/professor/alunos",
    );

    revalidatePath(
      "/professor/questoes",
    );

    revalidatePath(
      "/professor/ranking",
    );

    revalidatePath(
      "/professor/comparar",
    );

    return {
      status:
        "success",

      message:
        normalizedBands.length ===
        0
          ? "Todas as faixas foram removidas."
          : "Faixas de desempenho salvas com sucesso.",

      bands:
        savedBands,
    };
  } catch (error) {
    console.error(
      "[teacher-performance-bands] Erro ao salvar faixas:",
      error,
    );

    return {
      status: "error",
      message:
        "Não foi possível salvar as faixas de desempenho.",
    };
  }
}
import "server-only";

import { prisma } from "@/lib/prisma";

export type TeacherPerformanceBandData = {
  id: string;
  name: string;

  minPercentage: number;
  maxPercentage: number;

  requiresComplementaryActivity: boolean;

  position: number;
};

/**
 * Retorna todas as faixas configuradas por um professor.
 *
 * Importante:
 * - as faixas pertencem ao TeacherProfile;
 * - um professor pode possuir nenhuma, uma ou várias faixas;
 * - espaços entre faixas são permitidos;
 * - a ordenação principal é pelo início da faixa.
 */
export async function getTeacherPerformanceBands(
  teacherProfileId: string,
): Promise<TeacherPerformanceBandData[]> {
  return prisma.teacherPerformanceBand.findMany({
    where: {
      teacherProfileId,
    },

    select: {
      id: true,
      name: true,

      minPercentage: true,
      maxPercentage: true,

      requiresComplementaryActivity: true,

      position: true,
    },

    orderBy: [
      {
        minPercentage: "asc",
      },

      {
        position: "asc",
      },
    ],
  });
}

/**
 * Localiza a faixa correspondente a determinado percentual.
 *
 * Exemplo:
 *
 * faixa:
 * 0% até 59%
 *
 * resultado:
 * 45% -> faixa
 * 59% -> faixa
 * 60% -> null
 */
export function findPerformanceBand(
  bands: readonly TeacherPerformanceBandData[],
  percentage: number,
): TeacherPerformanceBandData | null {
  const normalizedPercentage = Math.min(
    100,
    Math.max(0, percentage),
  );

  return (
    bands.find(
      (band) =>
        normalizedPercentage >= band.minPercentage &&
        normalizedPercentage <= band.maxPercentage,
    ) ?? null
  );
}

/**
 * Verifica se determinado desempenho exige
 * atividade complementar de acordo com a régua
 * criada pelo professor.
 */
export function requiresComplementaryActivity(
  bands: readonly TeacherPerformanceBandData[],
  percentage: number,
): boolean {
  const band = findPerformanceBand(
    bands,
    percentage,
  );

  return Boolean(
    band?.requiresComplementaryActivity,
  );
}

/**
 * Retorna todas as faixas marcadas pelo professor
 * como destinadas a atividade complementar.
 */
export function getComplementaryActivityBands(
  bands: readonly TeacherPerformanceBandData[],
): TeacherPerformanceBandData[] {
  return bands.filter(
    (band) =>
      band.requiresComplementaryActivity,
  );
}

/**
 * Retorna um texto simples para representar a faixa.
 *
 * Exemplo:
 *
 * Atividade complementar · 0%–59%
 */
export function formatPerformanceBand(
  band: TeacherPerformanceBandData,
): string {
  return `${band.name} · ${band.minPercentage}%–${band.maxPercentage}%`;
}
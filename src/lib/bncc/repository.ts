import "server-only";

import type {
  KnowledgeArea,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type {
  VerifiedBnccSkill,
} from "./types";

const VERIFIED_SOURCE_STATUS = "VERIFIED" as const;
const ENSINO_MEDIO_STAGE = "ENSINO_MEDIO" as const;

const verifiedSkillSelect = {
  id: true,
  code: true,
  stage: true,
  area: true,
  subject: true,
  description: true,
  competencyCode: true,
  competencyText: true,
  sourcePage: true,
  sourceLocator: true,
  officialTextHash: true,
  source: {
    select: {
      id: true,
      title: true,
      publisher: true,
      officialUrl: true,
      versionLabel: true,
      sha256: true,
      verifiedAt: true,
    },
  },
} as const;

/**
 * Este arquivo é a barreira de acesso à BNCC em produção.
 *
 * Nenhum fluxo de Jornada/IA deve consultar prisma.bnccSkill
 * diretamente.
 *
 * Toda leitura destinada à inteligência pedagógica deve passar por
 * funções deste repository, que exigem:
 *
 *   BnccSkill.isCurrent = true
 *   BnccSource.status = VERIFIED
 */
export async function listVerifiedBnccSkillsByArea(
  area: KnowledgeArea,
): Promise<VerifiedBnccSkill[]> {
  const rows = await prisma.bnccSkill.findMany({
    where: {
      stage: ENSINO_MEDIO_STAGE,
      area,
      isCurrent: true,
      source: {
        status: VERIFIED_SOURCE_STATUS,
      },
    },
    orderBy: {
      code: "asc",
    },
    select: verifiedSkillSelect,
  });

  return rows.map(mapVerifiedSkill);
}

export async function getVerifiedBnccSkillById(
  id: string,
): Promise<VerifiedBnccSkill | null> {
  const normalizedId = id.trim();

  if (!normalizedId) {
    return null;
  }

  const row = await prisma.bnccSkill.findFirst({
    where: {
      id: normalizedId,
      stage: ENSINO_MEDIO_STAGE,
      isCurrent: true,
      source: {
        status: VERIFIED_SOURCE_STATUS,
      },
    },
    select: verifiedSkillSelect,
  });

  return row ? mapVerifiedSkill(row) : null;
}

/**
 * Recupera somente IDs que continuam válidos e VERIFIED.
 *
 * A função NÃO considera a ausência de IDs um erro.
 * Para validar uma resposta de IA, prefira requireVerifiedBnccSkillsByIds.
 */
export async function getVerifiedBnccSkillsByIds(
  ids: readonly string[],
): Promise<VerifiedBnccSkill[]> {
  const uniqueIds = normalizeIds(ids);

  if (uniqueIds.length === 0) {
    return [];
  }

  const rows = await prisma.bnccSkill.findMany({
    where: {
      id: {
        in: uniqueIds,
      },
      stage: ENSINO_MEDIO_STAGE,
      isCurrent: true,
      source: {
        status: VERIFIED_SOURCE_STATUS,
      },
    },
    select: verifiedSkillSelect,
  });

  const byId = new Map(
    rows.map((row) => [
      row.id,
      mapVerifiedSkill(row),
    ]),
  );

  /**
   * Mantém a ordem recebida.
   * Isso será útil quando a IA devolver candidatos ranqueados.
   */
  return uniqueIds.flatMap((id) => {
    const skill = byId.get(id);

    return skill ? [skill] : [];
  });
}

/**
 * Validação fail-closed para IDs devolvidos por IA.
 *
 * Se o modelo tentar devolver:
 * - ID inexistente;
 * - habilidade antiga;
 * - habilidade de fonte não VERIFIED;
 *
 * o fluxo é interrompido.
 */
export async function requireVerifiedBnccSkillsByIds(
  ids: readonly string[],
): Promise<VerifiedBnccSkill[]> {
  const uniqueIds = normalizeIds(ids);

  if (uniqueIds.length === 0) {
    return [];
  }

  const skills =
    await getVerifiedBnccSkillsByIds(uniqueIds);

  const foundIds = new Set(
    skills.map((skill) => skill.id),
  );

  const missingIds = uniqueIds.filter(
    (id) => !foundIds.has(id),
  );

  if (missingIds.length > 0) {
    throw new Error(
      [
        "A resposta contém habilidades BNCC que não estão disponíveis",
        "na base VERIFIED/current.",
        `IDs inválidos: ${missingIds.join(", ")}`,
      ].join(" "),
    );
  }

  return skills;
}

function normalizeIds(
  ids: readonly string[],
): string[] {
  return [
    ...new Set(
      ids
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
}

function mapVerifiedSkill(
  row: {
    id: string;
    code: string;
    stage: VerifiedBnccSkill["stage"];
    area: VerifiedBnccSkill["area"];
    subject: VerifiedBnccSkill["officialSubject"];
    description: string;
    competencyCode: string | null;
    competencyText: string | null;
    sourcePage: number | null;
    sourceLocator: string | null;
    officialTextHash: string | null;
    source: {
      id: string;
      title: string;
      publisher: string;
      officialUrl: string;
      versionLabel: string | null;
      sha256: string;
      verifiedAt: Date | null;
    };
  },
): VerifiedBnccSkill {
  return {
    id: row.id,
    code: row.code,
    stage: row.stage,
    area: row.area,
    officialSubject: row.subject,
    description: row.description,
    competencyCode: row.competencyCode,
    competencyText: row.competencyText,
    sourcePage: row.sourcePage,
    sourceLocator: row.sourceLocator,
    officialTextHash: row.officialTextHash,
    source: row.source,
  };
}
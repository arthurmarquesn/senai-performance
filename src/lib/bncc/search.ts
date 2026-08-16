import "server-only";

import {
  KnowledgeArea,
  Subject,
} from "@prisma/client";

import {
  listVerifiedBnccSkillsByArea,
} from "./repository";

import type {
  BnccSearchInput,
  BnccSearchResult,
  VerifiedBnccSkill,
} from "./types";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 12;
const DEFAULT_MIN_SCORE = 0.12;

const SUBJECT_TO_AREA: Record<
  Subject,
  KnowledgeArea
> = {
  [Subject.MATEMATICA]:
    KnowledgeArea.MATEMATICA,

  [Subject.FISICA]:
    KnowledgeArea.CIENCIAS_DA_NATUREZA,
  [Subject.QUIMICA]:
    KnowledgeArea.CIENCIAS_DA_NATUREZA,
  [Subject.BIOLOGIA]:
    KnowledgeArea.CIENCIAS_DA_NATUREZA,

  [Subject.PORTUGUES]:
    KnowledgeArea.LINGUAGENS,
  [Subject.INGLES]:
    KnowledgeArea.LINGUAGENS,
  [Subject.ARTES]:
    KnowledgeArea.LINGUAGENS,
  [Subject.EDUCACAO_FISICA]:
    KnowledgeArea.LINGUAGENS,

  [Subject.HISTORIA]:
    KnowledgeArea.CIENCIAS_HUMANAS,
  [Subject.GEOGRAFIA]:
    KnowledgeArea.CIENCIAS_HUMANAS,
  [Subject.SOCIOLOGIA]:
    KnowledgeArea.CIENCIAS_HUMANAS,
  [Subject.FILOSOFIA]:
    KnowledgeArea.CIENCIAS_HUMANAS,
};

/**
 * Stopwords pequenas e estáveis.
 *
 * Não tentamos fazer NLP complexo nesta camada.
 * O objetivo é recuperar candidatos reais da BNCC de forma
 * determinística e auditável.
 */
const STOP_WORDS = new Set([
  "a",
  "as",
  "ao",
  "aos",
  "com",
  "como",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "entre",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "ou",
  "para",
  "pela",
  "pelas",
  "pelo",
  "pelos",
  "por",
  "que",
  "se",
  "sem",
  "sobre",
  "um",
  "uma",
  "uns",
  "umas",
]);

type ScoredCandidate = {
  skill: VerifiedBnccSkill;
  score: number;
  matchedTerms: string[];
  reasons: string[];
};

/**
 * Retriever lexical inicial da BNCC.
 *
 * Características:
 * - consulta SOMENTE base VERIFIED/current;
 * - restringe pela área oficial;
 * - não inventa códigos;
 * - não transforma habilidade de área em habilidade de disciplina;
 * - score é determinístico;
 * - score de retrieval NÃO é "confiança pedagógica".
 *
 * Como existem apenas 183 habilidades verificadas no Ensino Médio,
 * carregar as habilidades da área e ranquear em memória é simples,
 * previsível e evita depender de configuração FULLTEXT específica
 * do MySQL nesta primeira versão.
 */
export async function searchVerifiedBnccSkills(
  input: BnccSearchInput,
): Promise<BnccSearchResult[]> {
  const normalizedInput =
    normalizeSearchInput(input);

  validateSubjectAreaConsistency(
    normalizedInput.area,
    normalizedInput.teacherSubject,
  );

  const candidates =
    await listVerifiedBnccSkillsByArea(
      normalizedInput.area,
    );

  if (candidates.length === 0) {
    return [];
  }

  const queryTerms = buildQueryTerms(
    normalizedInput.query,
    normalizedInput.keywords,
  );

  if (queryTerms.length === 0) {
    throw new Error(
      "A busca BNCC precisa conter ao menos um termo relevante.",
    );
  }

  const documentFrequency =
    calculateDocumentFrequency(
      candidates,
      queryTerms,
    );

  const scored = candidates
    .map((skill) =>
      scoreSkill({
        skill,
        queryTerms,
        totalDocuments: candidates.length,
        documentFrequency,
        teacherSubject:
          normalizedInput.teacherSubject,
      }),
    )
    .filter(
      (candidate) =>
        candidate.score >=
        normalizedInput.minScore,
    )
    .sort(compareCandidates)
    .slice(0, normalizedInput.limit);

  return scored.map(
    (candidate, index): BnccSearchResult => ({
      ...candidate.skill,

      retrieval: {
        rank: index + 1,
        score: roundScore(
          candidate.score,
        ),
        matchedTerms:
          candidate.matchedTerms,
        reasons: candidate.reasons,
      },
    }),
  );
}

function normalizeSearchInput(
  input: BnccSearchInput,
): Required<
  Pick<
    BnccSearchInput,
    "area" | "query" | "limit" | "minScore"
  >
> & {
  teacherSubject: Subject | null;
  keywords: readonly string[];
} {
  const query = input.query.trim();

  if (!query) {
    throw new Error(
      "A intenção de busca BNCC não pode ser vazia.",
    );
  }

  if (query.length > 800) {
    throw new Error(
      "A intenção de busca BNCC excedeu 800 caracteres.",
    );
  }

  const limit = clampInteger(
    input.limit ?? DEFAULT_LIMIT,
    1,
    MAX_LIMIT,
  );

  const minScore = clampNumber(
    input.minScore ??
      DEFAULT_MIN_SCORE,
    0,
    1,
  );

  const keywords = (
    input.keywords ?? []
  )
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 20);

  return {
    area: input.area,
    teacherSubject:
      input.teacherSubject ?? null,
    query,
    keywords,
    limit,
    minScore,
  };
}

function validateSubjectAreaConsistency(
  area: KnowledgeArea,
  subject: Subject | null,
): void {
  if (!subject) {
    return;
  }

  const expectedArea =
    SUBJECT_TO_AREA[subject];

  if (expectedArea !== area) {
    throw new Error(
      [
        `Disciplina ${subject}`,
        `não pertence à área ${area}.`,
        `Área esperada: ${expectedArea}.`,
      ].join(" "),
    );
  }
}

function buildQueryTerms(
  query: string,
  keywords: readonly string[],
): string[] {
  const mainTerms = tokenize(query);

  const keywordTerms = keywords.flatMap(
    (keyword) => tokenize(keyword),
  );

  const terms = [
    ...new Set([
      ...mainTerms,
      ...keywordTerms,
    ]),
  ];

  /**
   * Se a frase era composta quase só de stopwords,
   * tentamos novamente sem removê-las para não transformar uma
   * entrada válida em uma lista vazia silenciosamente.
   */
  if (terms.length > 0) {
    return terms;
  }

  return [
    ...new Set(
      tokenize(query, {
        removeStopWords: false,
      }),
    ),
  ];
}

function calculateDocumentFrequency(
  candidates: readonly VerifiedBnccSkill[],
  queryTerms: readonly string[],
): Map<string, number> {
  const result = new Map<
    string,
    number
  >();

  for (const term of queryTerms) {
    let count = 0;

    for (const skill of candidates) {
      const documentTokens =
        getSkillTokenSet(skill);

      if (documentTokens.has(term)) {
        count++;
      }
    }

    result.set(term, count);
  }

  return result;
}

function scoreSkill({
  skill,
  queryTerms,
  totalDocuments,
  documentFrequency,
  teacherSubject,
}: {
  skill: VerifiedBnccSkill;
  queryTerms: readonly string[];
  totalDocuments: number;
  documentFrequency: ReadonlyMap<
    string,
    number
  >;
  teacherSubject: Subject | null;
}): ScoredCandidate {
  const codeTokens =
    new Set(tokenize(skill.code));

  const descriptionTokens =
    new Set(
      tokenize(
        skill.description,
        {
          removeStopWords: false,
        },
      ),
    );

  const competencyTokens =
    new Set(
      tokenize(
        [
          skill.competencyCode ?? "",
          skill.competencyText ?? "",
        ].join(" "),
        {
          removeStopWords: false,
        },
      ),
    );

  const matchedTerms: string[] = [];

  let matchedIdf = 0;
  let totalIdf = 0;
  let fieldStrength = 0;

  for (const term of queryTerms) {
    const documentFrequencyForTerm =
      documentFrequency.get(term) ?? 0;

    const idf =
      Math.log(
        (totalDocuments + 1) /
          (documentFrequencyForTerm + 1),
      ) + 1;

    totalIdf += idf;

    let termMatched = false;
    let termFieldStrength = 0;

    if (codeTokens.has(term)) {
      termMatched = true;
      termFieldStrength = Math.max(
        termFieldStrength,
        1,
      );
    }

    if (
      descriptionTokens.has(term)
    ) {
      termMatched = true;
      termFieldStrength = Math.max(
        termFieldStrength,
        0.9,
      );
    }

    if (
      competencyTokens.has(term)
    ) {
      termMatched = true;
      termFieldStrength = Math.max(
        termFieldStrength,
        0.7,
      );
    }

    if (termMatched) {
      matchedTerms.push(term);
      matchedIdf += idf;

      fieldStrength +=
        idf * termFieldStrength;
    }
  }

  const weightedCoverage =
    totalIdf > 0
      ? matchedIdf / totalIdf
      : 0;

  const normalizedFieldStrength =
    totalIdf > 0
      ? fieldStrength / totalIdf
      : 0;

  const phraseScore =
    calculatePhraseScore(
      skill,
      queryTerms,
    );

  const subjectBoost =
    teacherSubject &&
    skill.officialSubject ===
      teacherSubject
      ? 0.04
      : 0;

  const score = Math.min(
    1,
    weightedCoverage * 0.62 +
      normalizedFieldStrength * 0.23 +
      phraseScore * 0.15 +
      subjectBoost,
  );

  const reasons = buildReasons({
    skill,
    matchedTerms,
    queryTerms,
    weightedCoverage,
    phraseScore,
    teacherSubject,
  });

  return {
    skill,
    score,
    matchedTerms,
    reasons,
  };
}

function calculatePhraseScore(
  skill: VerifiedBnccSkill,
  queryTerms: readonly string[],
): number {
  if (queryTerms.length < 2) {
    return 0;
  }

  const description =
    normalizeText(skill.description);

  const bigrams: string[] = [];

  for (
    let index = 0;
    index < queryTerms.length - 1;
    index++
  ) {
    bigrams.push(
      `${queryTerms[index]} ${
        queryTerms[index + 1]
      }`,
    );
  }

  const matches = bigrams.filter(
    (bigram) =>
      description.includes(bigram),
  ).length;

  if (bigrams.length === 0) {
    return 0;
  }

  return matches / bigrams.length;
}

function buildReasons({
  skill,
  matchedTerms,
  queryTerms,
  weightedCoverage,
  phraseScore,
  teacherSubject,
}: {
  skill: VerifiedBnccSkill;
  matchedTerms: readonly string[];
  queryTerms: readonly string[];
  weightedCoverage: number;
  phraseScore: number;
  teacherSubject: Subject | null;
}): string[] {
  const reasons: string[] = [];

  if (matchedTerms.length > 0) {
    reasons.push(
      [
        `${matchedTerms.length}`,
        `de ${queryTerms.length}`,
        "termos relevantes encontrados",
        "no conteúdo oficial.",
      ].join(" "),
    );
  }

  if (weightedCoverage >= 0.6) {
    reasons.push(
      "Boa cobertura lexical da intenção de busca.",
    );
  }

  if (phraseScore > 0) {
    reasons.push(
      "Há termos consecutivos da intenção no texto oficial.",
    );
  }

  if (
    teacherSubject &&
    skill.officialSubject ===
      teacherSubject
  ) {
    reasons.push(
      `A própria base oficial registra a habilidade para ${teacherSubject}.`,
    );
  }

  if (
    skill.officialSubject === null
  ) {
    reasons.push(
      "Habilidade oficial de área; não foi atribuída artificialmente a uma disciplina.",
    );
  }

  return reasons;
}

function getSkillTokenSet(
  skill: VerifiedBnccSkill,
): Set<string> {
  return new Set(
    tokenize(
      [
        skill.code,
        skill.description,
        skill.competencyCode ?? "",
        skill.competencyText ?? "",
      ].join(" "),
      {
        removeStopWords: false,
      },
    ),
  );
}

function tokenize(
  value: string,
  options?: {
    removeStopWords?: boolean;
  },
): string[] {
  const removeStopWords =
    options?.removeStopWords ?? true;

  const normalized = normalizeText(
    value,
  );

  if (!normalized) {
    return [];
  }

  return normalized
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => {
      /**
       * Preserva códigos e números, mas descarta
       * palavras isoladas de 1 caractere.
       */
      if (/^\d+$/.test(token)) {
        return true;
      }

      if (
        token.startsWith("em13")
      ) {
        return true;
      }

      return token.length >= 2;
    })
    .filter(
      (token) =>
        !removeStopWords ||
        !STOP_WORDS.has(token),
    );
}

function normalizeText(
  value: string,
): string {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compareCandidates(
  left: ScoredCandidate,
  right: ScoredCandidate,
): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  /**
   * Desempate determinístico.
   */
  return left.skill.code.localeCompare(
    right.skill.code,
  );
}

function roundScore(
  value: number,
): number {
  return Math.round(value * 10_000) /
    10_000;
}

function clampInteger(
  value: number,
  min: number,
  max: number,
): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(
    max,
    Math.max(
      min,
      Math.trunc(value),
    ),
  );
}

function clampNumber(
  value: number,
  min: number,
  max: number,
): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(
    max,
    Math.max(min, value),
  );
}
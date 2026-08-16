import "server-only";

import {
  BnccLinkConfidence,
  Subject,
  type JourneySuggestionType,
} from "@prisma/client";

import Groq from "groq-sdk";

import {
  requireVerifiedBnccSkillsByIds,
} from "@/lib/bncc/repository";

import {
  searchVerifiedBnccSkills,
} from "@/lib/bncc/search";

import type {
  BnccSearchResult,
} from "@/lib/bncc/types";

import {
  knowledgeAreaForSubject,
} from "./subject-area";

export const JOURNEY_BNCC_PROMPT_VERSION =
  "journey-bncc-v1";

const DEFAULT_MODEL =
  "openai/gpt-oss-120b";

const MAX_CANDIDATES_PER_SUGGESTION =
  10;

const MAX_LINKS_PER_SUGGESTION =
  3;

const MIN_AI_RELEVANCE =
  70;

const BNCC_CODE_PATTERN =
  /\bEM\d{2}[A-Z]{2,4}\d{2,3}\b/i;

export type JourneyBnccSuggestionInput = {
  id: string;

  analysisId:
    | string
    | null;

  subject: Subject;

  type:
    JourneySuggestionType;

  title: string;

  objective:
    | string
    | null;

  content: string;

  rationale:
    | string
    | null;

  contentTopics:
    string[];

  evidenceChunkId:
    | string
    | null;

  evidenceText:
    | string
    | null;

  evidenceExplanation:
    | string
    | null;
};

type SearchIntent = {
  suggestionId: string;

  query: string;

  keywords: string[];

  rationale: string;
};

type CandidateBundle = {
  suggestion:
    JourneyBnccSuggestionInput;

  intent:
    SearchIntent;

  candidates:
    BnccSearchResult[];
};

type CandidateAssessment = {
  candidateId: string;

  relevanceScore: number;

  confidence:
    BnccLinkConfidence;

  justification: string;
};

type SuggestionAssessment = {
  suggestionId: string;

  matches:
    CandidateAssessment[];
};

export type JourneyBnccLinkDraft = {
  suggestionId: string;

  analysisId:
    | string
    | null;

  bnccSkillId: string;

  evidenceChunkId:
    | string
    | null;

  evidenceExcerpt:
    | string
    | null;

  retrievalScore: number;

  aiRelevanceScore: number;

  confidence:
    BnccLinkConfidence;

  candidateRank: number;

  justification: string;
};

export type JourneyBnccDiagnostic = {
  suggestionId: string;

  query: string;

  keywords: string[];

  candidateCount: number;

  selectedCount: number;
};

export type JourneyBnccLinkingResult = {
  modelName: string;

  links:
    JourneyBnccLinkDraft[];

  diagnostics:
    JourneyBnccDiagnostic[];
};

function getGroq(): {
  client: Groq;
  modelName: string;
} {
  const apiKey =
    process.env
      .GROQ_API_KEY
      ?.trim();

  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY não está configurada.",
    );
  }

  const modelName =
    process.env
      .GROQ_MODEL
      ?.trim() ||
    DEFAULT_MODEL;

  return {
    client:
      new Groq({
        apiKey,
      }),

    modelName,
  };
}

function requireString(
  value: unknown,
  field: string,
): string {
  if (
    typeof value !==
    "string"
  ) {
    throw new Error(
      `A IA retornou "${field}" em formato inválido.`,
    );
  }

  const text =
    value.trim();

  if (!text) {
    throw new Error(
      `A IA retornou "${field}" vazio.`,
    );
  }

  return text;
}

function readStringArray(
  value: unknown,
  field: string,
): string[] {
  if (
    !Array.isArray(value)
  ) {
    throw new Error(
      `A IA retornou "${field}" em formato inválido.`,
    );
  }

  const result =
    value
      .map((item) =>
        typeof item ===
        "string"
          ? item.trim()
          : "",
      )
      .filter(Boolean);

  if (
    result.length === 0
  ) {
    throw new Error(
      `A IA não retornou termos em "${field}".`,
    );
  }

  return result;
}

function assertNoBnccCode(
  value: string,
  field: string,
): void {
  if (
    BNCC_CODE_PATTERN.test(
      value,
    )
  ) {
    throw new Error(
      `A IA tentou inserir um código BNCC no campo "${field}". A operação foi bloqueada.`,
    );
  }
}

async function generateSearchIntents(
  client: Groq,
  modelName: string,
  suggestions:
    JourneyBnccSuggestionInput[],
): Promise<SearchIntent[]> {
  const suggestionIds =
    suggestions.map(
      (suggestion) =>
        suggestion.id,
    );

  const response =
    await client.chat.completions.create({
      model:
        modelName,

      messages: [
        {
          role:
            "system",

          content: `
Você prepara intenções de busca para um mecanismo controlado de recuperação da BNCC do Ensino Médio.

Você NÃO pesquisa a BNCC.
Você NÃO escolhe habilidades.
Você NÃO cria códigos.
Você NÃO cita códigos BNCC.

Sua única função é transformar cada sugestão pedagógica recebida em uma intenção textual de busca.

REGRAS:

1. Produza exatamente uma intenção para cada suggestionId recebido.

2. Preserve o suggestionId exatamente como recebido.

3. query deve descrever os processos cognitivos, objetos de conhecimento e ações educacionais relacionados à sugestão.

4. keywords deve possuir termos conceituais úteis para recuperação textual.

5. Não tente imitar a redação oficial da BNCC.

6. Não produza qualquer código começando por EM.

7. Não associe uma disciplina a uma habilidade oficial. A disciplina recebida representa apenas o contexto pedagógico da sugestão.

8. Baseie a intenção na sugestão e na evidência da Jornada.

9. Não invente elementos que não sejam sustentados pelo contexto.

10. Escreva em português do Brasil.
`.trim(),
        },

        {
          role:
            "user",

          content:
            JSON.stringify(
              {
                suggestions:
                  suggestions.map(
                    (
                      suggestion,
                    ) => ({
                      suggestionId:
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

                      evidence:
                        suggestion.evidenceText,

                      evidenceExplanation:
                        suggestion.evidenceExplanation,
                    }),
                  ),
              },
              null,
              2,
            ),
        },
      ],

      response_format: {
        type:
          "json_schema",

        json_schema: {
          name:
            "journey_bncc_search_intents",

          strict:
            true,

          schema: {
            type:
              "object",

            properties: {
              intents: {
                type:
                  "array",

                items: {
                  type:
                    "object",

                  properties: {
                    suggestionId: {
                      type:
                        "string",

                      enum:
                        suggestionIds,
                    },

                    query: {
                      type:
                        "string",
                    },

                    keywords: {
                      type:
                        "array",

                      items: {
                        type:
                          "string",
                      },
                    },

                    rationale: {
                      type:
                        "string",
                    },
                  },

                  required: [
                    "suggestionId",
                    "query",
                    "keywords",
                    "rationale",
                  ],

                  additionalProperties:
                    false,
                },
              },
            },

            required: [
              "intents",
            ],

            additionalProperties:
              false,
          },
        },
      },
    });

  const content =
    response.choices[0]
      ?.message
      ?.content;

  if (!content) {
    throw new Error(
      "A IA não retornou intenções de busca para a BNCC.",
    );
  }

  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        content,
      );
  } catch {
    throw new Error(
      "As intenções de busca BNCC não puderam ser interpretadas.",
    );
  }

  if (
    typeof parsed !==
      "object" ||
    parsed === null ||
    !(
      "intents" in
      parsed
    ) ||
    !Array.isArray(
      (
        parsed as {
          intents?: unknown;
        }
      ).intents,
    )
  ) {
    throw new Error(
      "A estrutura das intenções de busca BNCC é inválida.",
    );
  }

  const rawIntents =
    (
      parsed as {
        intents: unknown[];
      }
    ).intents;

  if (
    rawIntents.length !==
    suggestions.length
  ) {
    throw new Error(
      "A IA não retornou exatamente uma intenção de busca para cada sugestão.",
    );
  }

  const validIds =
    new Set(
      suggestionIds,
    );

  const seenIds =
    new Set<string>();

  const intents =
    rawIntents.map(
      (
        rawIntent,
        index,
      ): SearchIntent => {
        if (
          typeof rawIntent !==
            "object" ||
          rawIntent ===
            null
        ) {
          throw new Error(
            `A intenção ${index + 1} é inválida.`,
          );
        }

        const object =
          rawIntent as Record<
            string,
            unknown
          >;

        const suggestionId =
          requireString(
            object.suggestionId,
            `intents[${index}].suggestionId`,
          );

        if (
          !validIds.has(
            suggestionId,
          )
        ) {
          throw new Error(
            "A IA retornou uma sugestão inexistente ao preparar a busca BNCC.",
          );
        }

        if (
          seenIds.has(
            suggestionId,
          )
        ) {
          throw new Error(
            "A IA duplicou uma sugestão na preparação da busca BNCC.",
          );
        }

        seenIds.add(
          suggestionId,
        );

        const query =
          requireString(
            object.query,
            `intents[${index}].query`,
          );

        const keywords =
          readStringArray(
            object.keywords,
            `intents[${index}].keywords`,
          ).slice(
            0,
            12,
          );

        const rationale =
          requireString(
            object.rationale,
            `intents[${index}].rationale`,
          );

        assertNoBnccCode(
          query,
          "query",
        );

        assertNoBnccCode(
          rationale,
          "rationale",
        );

        for (
          const keyword of
          keywords
        ) {
          assertNoBnccCode(
            keyword,
            "keywords",
          );
        }

        return {
          suggestionId,
          query,
          keywords,
          rationale,
        };
      },
    );

  for (
    const suggestionId of
    suggestionIds
  ) {
    if (
      !seenIds.has(
        suggestionId,
      )
    ) {
      throw new Error(
        "Uma sugestão ficou sem intenção de busca BNCC.",
      );
    }
  }

  return intents;
}

async function retrieveCandidates(
  suggestions:
    JourneyBnccSuggestionInput[],
  intents:
    SearchIntent[],
): Promise<
  CandidateBundle[]
> {
  const intentBySuggestion =
    new Map(
      intents.map(
        (intent) => [
          intent.suggestionId,
          intent,
        ],
      ),
    );

  const bundles:
    CandidateBundle[] =
    [];

  for (
    const suggestion of
    suggestions
  ) {
    const intent =
      intentBySuggestion.get(
        suggestion.id,
      );

    if (!intent) {
      throw new Error(
        "Intenção de busca BNCC não localizada.",
      );
    }

    const area =
      knowledgeAreaForSubject(
        suggestion.subject,
      );

    const candidates =
      await searchVerifiedBnccSkills({
        area,

        teacherSubject:
          suggestion.subject,

        query:
          intent.query,

        keywords:
          intent.keywords,

        limit:
          MAX_CANDIDATES_PER_SUGGESTION,

        // Um corte um pouco mais aberto aumenta recall.
        // A IA ainda fará a avaliação pedagógica depois.
        minScore:
          0.05,
      });

    bundles.push({
      suggestion,
      intent,
      candidates,
    });
  }

  return bundles;
}

function clipText(
  value:
    | string
    | null,
  maxLength: number,
): string | null {
  if (!value) {
    return null;
  }

  const normalized =
    value.trim();

  if (!normalized) {
    return null;
  }

  if (
    normalized.length <=
    maxLength
  ) {
    return normalized;
  }

  return `${normalized.slice(
    0,
    maxLength,
  )}…`;
}

async function assessCandidates(
  client: Groq,
  modelName: string,
  bundles:
    CandidateBundle[],
): Promise<
  SuggestionAssessment[]
> {
  const bundlesWithCandidates =
    bundles.filter(
      (bundle) =>
        bundle.candidates.length >
        0,
    );

  if (
    bundlesWithCandidates.length ===
    0
  ) {
    return [];
  }

  const candidateIds =
    [
      ...new Set(
        bundlesWithCandidates.flatMap(
          (bundle) =>
            bundle.candidates.map(
              (candidate) =>
                candidate.id,
            ),
        ),
      ),
    ];

  const suggestionIds =
    bundlesWithCandidates.map(
      (bundle) =>
        bundle.suggestion.id,
    );

  const payload =
    bundlesWithCandidates.map(
      (bundle) => ({
        suggestion: {
          id:
            bundle.suggestion.id,

          subject:
            bundle.suggestion.subject,

          title:
            bundle.suggestion.title,

          objective:
            bundle.suggestion.objective,

          content:
            bundle.suggestion.content,

          rationale:
            bundle.suggestion.rationale,

          contentTopics:
            bundle.suggestion.contentTopics,

          evidence:
            clipText(
              bundle.suggestion
                .evidenceText,
              1600,
            ),
        },

        searchIntent: {
          query:
            bundle.intent.query,

          keywords:
            bundle.intent.keywords,
        },

        candidates:
          bundle.candidates.map(
            (candidate) => ({
              candidateId:
                candidate.id,

              code:
                candidate.code,

              area:
                candidate.area,

              officialSubject:
                candidate.officialSubject,

              description:
                candidate.description,

              competencyCode:
                candidate.competencyCode,

              competencyText:
                clipText(
                  candidate.competencyText,
                  1000,
                ),

              sourcePage:
                candidate.sourcePage,

              retrievalRank:
                candidate.retrieval.rank,

              retrievalScore:
                candidate.retrieval.score,
            }),
          ),
      }),
    );

  const response =
    await client.chat.completions.create({
      model:
        modelName,

      messages: [
        {
          role:
            "system",

          content: `
Você avalia candidatos da BNCC previamente recuperados de uma base oficial e verificada.

IMPORTANTE:

Você NÃO pode criar habilidades.
Você NÃO pode criar códigos.
Você NÃO pode alterar códigos.
Você NÃO pode escolher habilidades que não estejam na lista recebida.

Sua resposta só pode selecionar candidateId que tenha sido fornecido.

OBJETIVO

Avaliar se cada candidato possui relação pedagógica defensável com a sugestão da Jornada.

REGRAS

1. Para cada sugestão, selecione de ZERO a TRÊS candidatos.

2. É melhor retornar zero candidatos do que criar uma associação fraca.

3. relevanceScore deve representar pertinência pedagógica entre 0 e 100.

4. Só selecione candidatos que você considere claramente defensáveis.

5. Uma coincidência lexical isolada não é suficiente.

6. Considere:
- objetivo da sugestão;
- conteúdo;
- justificativa;
- conteúdos possíveis;
- evidência da Jornada;
- descrição oficial da habilidade.

7. A disciplina da sugestão representa contexto pedagógico.
Não transforme uma habilidade oficial de área em uma habilidade oficialmente disciplinar.

8. officialSubject = null é normal para várias habilidades do Ensino Médio.

9. confidence:
HIGH = conexão direta e fortemente sustentada;
MEDIUM = conexão consistente e defensável;
LOW = conexão limitada ou indireta.

10. Evite selecionar LOW.

11. justification deve explicar por que a habilidade oficial se relaciona à sugestão.

12. Não utilize conhecimento de códigos BNCC fora dos candidatos recebidos.

13. Responda em português do Brasil.
`.trim(),
        },

        {
          role:
            "user",

          content:
            JSON.stringify(
              {
                analyses:
                  payload,
              },
              null,
              2,
            ),
        },
      ],

      response_format: {
        type:
          "json_schema",

        json_schema: {
          name:
            "journey_bncc_candidate_assessment",

          strict:
            true,

          schema: {
            type:
              "object",

            properties: {
              assessments: {
                type:
                  "array",

                items: {
                  type:
                    "object",

                  properties: {
                    suggestionId: {
                      type:
                        "string",

                      enum:
                        suggestionIds,
                    },

                    matches: {
                      type:
                        "array",

                      items: {
                        type:
                          "object",

                        properties: {
                          candidateId: {
                            type:
                              "string",

                            enum:
                              candidateIds,
                          },

                          relevanceScore: {
                            type:
                              "number",
                          },

                          confidence: {
                            type:
                              "string",

                            enum: [
                              "HIGH",
                              "MEDIUM",
                              "LOW",
                            ],
                          },

                          justification: {
                            type:
                              "string",
                          },
                        },

                        required: [
                          "candidateId",
                          "relevanceScore",
                          "confidence",
                          "justification",
                        ],

                        additionalProperties:
                          false,
                      },
                    },
                  },

                  required: [
                    "suggestionId",
                    "matches",
                  ],

                  additionalProperties:
                    false,
                },
              },
            },

            required: [
              "assessments",
            ],

            additionalProperties:
              false,
          },
        },
      },
    });

  const content =
    response.choices[0]
      ?.message
      ?.content;

  if (!content) {
    throw new Error(
      "A IA não retornou avaliação dos candidatos BNCC.",
    );
  }

  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        content,
      );
  } catch {
    throw new Error(
      "A avaliação dos candidatos BNCC não pôde ser interpretada.",
    );
  }

  if (
    typeof parsed !==
      "object" ||
    parsed === null ||
    !(
      "assessments" in
      parsed
    ) ||
    !Array.isArray(
      (
        parsed as {
          assessments?: unknown;
        }
      ).assessments,
    )
  ) {
    throw new Error(
      "A estrutura da avaliação BNCC é inválida.",
    );
  }

  const rawAssessments =
    (
      parsed as {
        assessments: unknown[];
      }
    ).assessments;

  if (
    rawAssessments.length !==
    bundlesWithCandidates.length
  ) {
    throw new Error(
      "A IA não avaliou exatamente todas as sugestões que possuíam candidatos BNCC.",
    );
  }

  const bundleBySuggestion =
    new Map(
      bundlesWithCandidates.map(
        (bundle) => [
          bundle.suggestion.id,
          bundle,
        ],
      ),
    );

  const seenSuggestions =
    new Set<string>();

  const assessments =
    rawAssessments.map(
      (
        rawAssessment,
        index,
      ): SuggestionAssessment => {
        if (
          typeof rawAssessment !==
            "object" ||
          rawAssessment ===
            null
        ) {
          throw new Error(
            `Avaliação BNCC ${index + 1} inválida.`,
          );
        }

        const object =
          rawAssessment as Record<
            string,
            unknown
          >;

        const suggestionId =
          requireString(
            object.suggestionId,
            `assessments[${index}].suggestionId`,
          );

        const bundle =
          bundleBySuggestion.get(
            suggestionId,
          );

        if (!bundle) {
          throw new Error(
            "A IA avaliou uma sugestão que não pertence ao conjunto atual.",
          );
        }

        if (
          seenSuggestions.has(
            suggestionId,
          )
        ) {
          throw new Error(
            "A IA duplicou uma sugestão durante a avaliação BNCC.",
          );
        }

        seenSuggestions.add(
          suggestionId,
        );

        if (
          !Array.isArray(
            object.matches,
          )
        ) {
          throw new Error(
            "A IA retornou uma lista de vínculos BNCC inválida.",
          );
        }

        if (
          object.matches.length >
          MAX_LINKS_PER_SUGGESTION
        ) {
          throw new Error(
            `A IA tentou relacionar mais de ${MAX_LINKS_PER_SUGGESTION} habilidades a uma única sugestão.`,
          );
        }

        const allowedCandidates =
          new Set(
            bundle.candidates.map(
              (candidate) =>
                candidate.id,
            ),
          );

        const seenCandidates =
          new Set<string>();

        const matches =
          object.matches
            .map(
              (
                rawMatch,
                matchIndex,
              ): CandidateAssessment => {
                if (
                  typeof rawMatch !==
                    "object" ||
                  rawMatch ===
                    null
                ) {
                  throw new Error(
                    `Vínculo BNCC ${matchIndex + 1} inválido.`,
                  );
                }

                const match =
                  rawMatch as Record<
                    string,
                    unknown
                  >;

                const candidateId =
                  requireString(
                    match.candidateId,
                    "candidateId",
                  );

                if (
                  !allowedCandidates.has(
                    candidateId,
                  )
                ) {
                  throw new Error(
                    "A IA tentou selecionar uma habilidade fora dos candidatos recuperados.",
                  );
                }

                if (
                  seenCandidates.has(
                    candidateId,
                  )
                ) {
                  throw new Error(
                    "A IA duplicou uma habilidade BNCC na mesma sugestão.",
                  );
                }

                seenCandidates.add(
                  candidateId,
                );

                if (
                  typeof match.relevanceScore !==
                    "number" ||
                  !Number.isFinite(
                    match.relevanceScore,
                  )
                ) {
                  throw new Error(
                    "A IA retornou um score de pertinência inválido.",
                  );
                }

                const relevanceScore =
                  Math.max(
                    0,
                    Math.min(
                      100,
                      match.relevanceScore,
                    ),
                  );

                if (
                  typeof match.confidence !==
                    "string" ||
                  !Object.values(
                    BnccLinkConfidence,
                  ).includes(
                    match.confidence as
                      BnccLinkConfidence,
                  )
                ) {
                  throw new Error(
                    "A IA retornou um nível de confiança BNCC inválido.",
                  );
                }

                return {
                  candidateId,

                  relevanceScore,

                  confidence:
                    match.confidence as
                      BnccLinkConfidence,

                  justification:
                    requireString(
                      match.justification,
                      "justification",
                    ),
                };
              },
            )
            .filter(
              (match) =>
                match.relevanceScore >=
                MIN_AI_RELEVANCE,
            )
            .sort(
              (
                a,
                b,
              ) =>
                b.relevanceScore -
                a.relevanceScore,
            );

        return {
          suggestionId,
          matches,
        };
      },
    );

  return assessments;
}

export async function linkJourneySuggestionsToBncc(
  suggestions:
    JourneyBnccSuggestionInput[],
): Promise<JourneyBnccLinkingResult> {
  if (
    suggestions.length ===
    0
  ) {
    throw new Error(
      "Não existem sugestões pedagógicas para cruzar com a BNCC.",
    );
  }

  const {
    client,
    modelName,
  } =
    getGroq();

  const intents =
    await generateSearchIntents(
      client,
      modelName,
      suggestions,
    );

  const bundles =
    await retrieveCandidates(
      suggestions,
      intents,
    );

  const assessments =
    await assessCandidates(
      client,
      modelName,
      bundles,
    );

  const assessmentBySuggestion =
    new Map(
      assessments.map(
        (assessment) => [
          assessment.suggestionId,
          assessment,
        ],
      ),
    );

  const links:
    JourneyBnccLinkDraft[] =
    [];

  for (
    const bundle of bundles
  ) {
    const assessment =
      assessmentBySuggestion.get(
        bundle.suggestion.id,
      );

    if (!assessment) {
      continue;
    }

    const candidateById =
      new Map(
        bundle.candidates.map(
          (candidate) => [
            candidate.id,
            candidate,
          ],
        ),
      );

    for (
      const match of
      assessment.matches
    ) {
      const candidate =
        candidateById.get(
          match.candidateId,
        );

      if (!candidate) {
        throw new Error(
          "Candidato BNCC selecionado não pertence ao conjunto recuperado.",
        );
      }

      links.push({
        suggestionId:
          bundle.suggestion.id,

        analysisId:
          bundle.suggestion.analysisId,

        bnccSkillId:
          candidate.id,

        evidenceChunkId:
          bundle.suggestion
            .evidenceChunkId,

        evidenceExcerpt:
          clipText(
            bundle.suggestion
              .evidenceText,
            1200,
          ),

        retrievalScore:
          candidate.retrieval
            .score,

        aiRelevanceScore:
          match.relevanceScore /
          100,

        confidence:
          match.confidence,

        // Este rank pertence ao retriever determinístico.
        candidateRank:
          candidate.retrieval
            .rank,

        justification:
          match.justification,
      });
    }
  }

  // Última barreira:
  // todos os IDs selecionados precisam continuar sendo
  // habilidades ENSINO_MEDIO + current + fonte VERIFIED.
  await requireVerifiedBnccSkillsByIds(
    links.map(
      (link) =>
        link.bnccSkillId,
    ),
  );

  const diagnostics =
    bundles.map(
      (
        bundle,
      ): JourneyBnccDiagnostic => ({
        suggestionId:
          bundle.suggestion.id,

        query:
          bundle.intent.query,

        keywords:
          bundle.intent.keywords,

        candidateCount:
          bundle.candidates.length,

        selectedCount:
          links.filter(
            (link) =>
              link.suggestionId ===
              bundle.suggestion.id,
          ).length,
      }),
    );

  return {
    modelName,
    links,
    diagnostics,
  };
}
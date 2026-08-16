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

// ======================================================
// CONFIGURAÇÃO
// ======================================================

export const JOURNEY_BNCC_PROMPT_VERSION =
  "journey-bncc-v2";

const DEFAULT_MODEL =
  "openai/gpt-oss-120b";

// O retriever pode procurar um conjunto relativamente amplo.
//
// Estes candidatos NÃO são todos enviados para a IA.
// O objetivo é manter recall no mecanismo determinístico.
const MAX_RETRIEVED_CANDIDATES_PER_SUGGESTION =
  8;

// Apenas os melhores candidatos recuperados são enviados
// ao modelo.
//
// Isso reduz drasticamente o payload da chamada Groq.
const MAX_AI_CANDIDATES_PER_SUGGESTION =
  4;

const MAX_LINKS_PER_SUGGESTION =
  3;

const MIN_AI_RELEVANCE =
  70;

// A resposta do modelo contém somente:
//
// candidateId
// relevanceScore
// confidence
// justification
//
// Portanto não precisamos reservar milhares de tokens.
const MAX_COMPLETION_TOKENS =
  900;

// ======================================================
// LIMITES DE COMPACTAÇÃO
// ======================================================

const MAX_SEARCH_QUERY_CHARS =
  1800;

const MAX_SEARCH_CONTENT_CHARS =
  1200;

const MAX_SEARCH_EVIDENCE_CHARS =
  500;

const MAX_AI_TITLE_CHARS =
  240;

const MAX_AI_OBJECTIVE_CHARS =
  450;

const MAX_AI_CONTENT_CHARS =
  700;

const MAX_AI_EVIDENCE_CHARS =
  320;

const MAX_AI_TOPIC_CHARS =
  120;

const MAX_AI_TOPICS =
  6;

const MAX_AI_BNCC_DESCRIPTION_CHARS =
  700;

const MAX_SAVED_EVIDENCE_CHARS =
  1200;

// ======================================================
// SEGURANÇA BNCC
// ======================================================

const BNCC_CODE_PATTERN =
  /\bEM\d{2}[A-Z]{2,4}\d{2,3}\b/i;

const BNCC_CODE_REPLACE_PATTERN =
  /\bEM\d{2}[A-Z]{2,4}\d{2,3}\b/gi;

// ======================================================
// STOP WORDS
// ======================================================
//
// Usadas somente para gerar keywords determinísticas.
//
// Isso NÃO altera o conteúdo oficial da BNCC.
// ======================================================

const SEARCH_STOP_WORDS =
  new Set([
    "a",
    "as",
    "ao",
    "aos",
    "aquela",
    "aquele",
    "aqueles",
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
    "essa",
    "esse",
    "esta",
    "este",
    "isso",
    "mais",
    "nas",
    "no",
    "nos",
    "na",
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
    "ser",
    "sobre",
    "sua",
    "suas",
    "seu",
    "seus",
    "um",
    "uma",
    "umas",
    "uns",
  ]);

// ======================================================
// TIPOS PÚBLICOS
// ======================================================

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

// ======================================================
// GROQ
// ======================================================

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

// ======================================================
// UTILITÁRIOS
// ======================================================

function normalizeWhitespace(
  value: string,
): string {
  return value
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function clipText(
  value:
    | string
    | null
    | undefined,
  maxLength: number,
): string | null {
  if (!value) {
    return null;
  }

  const normalized =
    normalizeWhitespace(
      value,
    );

  if (!normalized) {
    return null;
  }

  if (
    normalized.length <=
    maxLength
  ) {
    return normalized;
  }

  return `${normalized
    .slice(
      0,
      maxLength,
    )
    .trimEnd()}…`;
}

function stripBnccCodes(
  value: string,
): string {
  return normalizeWhitespace(
    value.replace(
      BNCC_CODE_REPLACE_PATTERN,
      " ",
    ),
  );
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
      `Um código BNCC foi encontrado indevidamente no campo "${field}".`,
    );
  }
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

function uniqueStrings(
  values: string[],
): string[] {
  return [
    ...new Set(
      values,
    ),
  ];
}

// ======================================================
// KEYWORDS DETERMINÍSTICAS
// ======================================================
//
// Antes a IA era chamada somente para gerar uma query.
//
// Isso consumia TPM sem necessidade.
//
// Agora usamos os próprios dados já validados da sugestão
// para construir a consulta.
// ======================================================

function extractSearchKeywords(
  values: Array<
    string |
    null |
    undefined
  >,
): string[] {
  const text =
    stripBnccCodes(
      values
        .filter(
          (
            value,
          ): value is string =>
            typeof value ===
              "string" &&
            value.trim().length >
              0,
        )
        .join(
          " ",
        ),
    )
      .toLocaleLowerCase(
        "pt-BR",
      );

  const words =
    text.match(
      /[\p{L}\p{N}]+/gu,
    ) ??
    [];

  const keywords:
    string[] =
    [];

  const seen =
    new Set<string>();

  for (
    const word of words
  ) {
    const normalized =
      word.trim();

    if (
      normalized.length <
      4
    ) {
      continue;
    }

    if (
      SEARCH_STOP_WORDS.has(
        normalized,
      )
    ) {
      continue;
    }

    if (
      seen.has(
        normalized,
      )
    ) {
      continue;
    }

    seen.add(
      normalized,
    );

    keywords.push(
      normalized,
    );

    if (
      keywords.length >=
      12
    ) {
      break;
    }
  }

  return keywords;
}

// ======================================================
// INTENÇÃO DE BUSCA DETERMINÍSTICA
// ======================================================

function buildSearchIntent(
  suggestion:
    JourneyBnccSuggestionInput,
): SearchIntent {
  const content =
    clipText(
      suggestion.content,
      MAX_SEARCH_CONTENT_CHARS,
    );

  const evidence =
    clipText(
      suggestion.evidenceText,
      MAX_SEARCH_EVIDENCE_CHARS,
    );

  const queryParts =
    [
      suggestion.title,

      suggestion.objective,

      suggestion.contentTopics.join(
        ", ",
      ),

      content,

      evidence,
    ]
      .filter(
        (
          value,
        ): value is string =>
          typeof value ===
            "string" &&
          value.trim().length >
            0,
      );

  const rawQuery =
    stripBnccCodes(
      queryParts.join(
        ". ",
      ),
    );

  const query =
    clipText(
      rawQuery,
      MAX_SEARCH_QUERY_CHARS,
    );

  if (!query) {
    throw new Error(
      `Não foi possível construir uma intenção de busca para a sugestão "${suggestion.title}".`,
    );
  }

  const keywords =
    extractSearchKeywords([
      suggestion.title,

      suggestion.objective,

      ...suggestion
        .contentTopics,

      content,
    ]);

  if (
    keywords.length ===
    0
  ) {
    throw new Error(
      `Não foi possível extrair termos de busca da sugestão "${suggestion.title}".`,
    );
  }

  assertNoBnccCode(
    query,
    "query",
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
    suggestionId:
      suggestion.id,

    query,

    keywords,

    rationale:
      "Intenção construída deterministicamente a partir do título, objetivo, conteúdos e evidência da sugestão pedagógica.",
  };
}

function generateSearchIntents(
  suggestions:
    JourneyBnccSuggestionInput[],
): SearchIntent[] {
  return suggestions.map(
    buildSearchIntent,
  );
}

// ======================================================
// RECUPERAÇÃO DETERMINÍSTICA
// ======================================================

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
          MAX_RETRIEVED_CANDIDATES_PER_SUGGESTION,

        // Mantemos recall relativamente aberto.
        //
        // A etapa seguinte fará a avaliação pedagógica.
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

// ======================================================
// COMPACTAÇÃO PARA IA
// ======================================================
//
// A base oficial permanece COMPLETA no banco.
//
// Estamos compactando somente o contexto enviado ao LLM.
// ======================================================

function buildAssessmentPayload(
  bundles:
    CandidateBundle[],
) {
  return bundles.map(
    (bundle) => {
      const candidates =
        bundle.candidates
          .slice(
            0,
            MAX_AI_CANDIDATES_PER_SUGGESTION,
          );

      return {
        suggestionId:
          bundle.suggestion.id,

        context: {
          subject:
            bundle.suggestion.subject,

          title:
            clipText(
              bundle.suggestion
                .title,

              MAX_AI_TITLE_CHARS,
            ),

          objective:
            clipText(
              bundle.suggestion
                .objective,

              MAX_AI_OBJECTIVE_CHARS,
            ),

          content:
            clipText(
              bundle.suggestion
                .content,

              MAX_AI_CONTENT_CHARS,
            ),

          topics:
            bundle.suggestion
              .contentTopics
              .slice(
                0,
                MAX_AI_TOPICS,
              )
              .map(
                (topic) =>
                  clipText(
                    topic,
                    MAX_AI_TOPIC_CHARS,
                  ),
              )
              .filter(
                (
                  topic,
                ): topic is string =>
                  Boolean(
                    topic,
                  ),
              ),

          evidence:
            clipText(
              bundle.suggestion
                .evidenceText,

              MAX_AI_EVIDENCE_CHARS,
            ),
        },

        candidates:
          candidates.map(
            (
              candidate,
            ) => ({
              candidateId:
                candidate.id,

              description:
                clipText(
                  candidate.description,

                  MAX_AI_BNCC_DESCRIPTION_CHARS,
                ),

              retrievalRank:
                candidate.retrieval
                  .rank,

              retrievalScore:
                candidate.retrieval
                  .score,
            }),
          ),
      };
    },
  );
}

// ======================================================
// AVALIAÇÃO PELA IA
// ======================================================
//
// Esta é agora a ÚNICA chamada ao Groq neste fluxo.
//
// A IA:
//
// - não pesquisa;
// - não cria habilidades;
// - não recebe liberdade para criar IDs;
// - não recebe códigos BNCC;
// - somente classifica candidatos recuperados do banco.
// ======================================================

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

  // ----------------------------------------------------
  // Somente candidatos realmente enviados à IA
  // ----------------------------------------------------

  const candidateIds =
    uniqueStrings(
      bundlesWithCandidates.flatMap(
        (bundle) =>
          bundle.candidates
            .slice(
              0,
              MAX_AI_CANDIDATES_PER_SUGGESTION,
            )
            .map(
              (candidate) =>
                candidate.id,
            ),
      ),
    );

  const suggestionIds =
    bundlesWithCandidates.map(
      (bundle) =>
        bundle.suggestion.id,
    );

  const payload =
    buildAssessmentPayload(
      bundlesWithCandidates,
    );

  // ----------------------------------------------------
  // Chamada Groq
  // ----------------------------------------------------

  const response =
    await client.chat.completions.create({
      model:
        modelName,

      // Para esta tarefa o modelo não precisa de uma
      // cadeia de raciocínio longa.
      reasoning_effort:
        "low",

      // Saída curta e estruturada.
      max_completion_tokens:
        MAX_COMPLETION_TOKENS,

      temperature:
        0.1,

      messages: [
        {
          role:
            "system",

          content: `
Você avalia relações pedagógicas entre sugestões de uma Jornada e candidatos previamente recuperados de uma base oficial e verificada da BNCC.

Você NÃO pesquisa a BNCC.
Você NÃO cria habilidades.
Você NÃO cria códigos.
Você NÃO altera habilidades.
Você NÃO pode escolher IDs que não tenham sido fornecidos.

Os candidateId são identificadores internos e opacos do sistema.

TAREFA

Para cada suggestionId:

1. avalie apenas os candidatos fornecidos;
2. selecione de ZERO a TRÊS;
3. prefira ZERO a uma associação pedagógica fraca;
4. relevanceScore deve ficar entre 0 e 100;
5. coincidência lexical isolada não é suficiente;
6. considere objetivo, conteúdo, tópicos, evidência e descrição oficial;
7. subject representa o contexto do professor, não transforma uma habilidade de área em habilidade disciplinar;
8. HIGH significa relação direta e forte;
9. MEDIUM significa relação consistente e defensável;
10. LOW significa relação limitada ou indireta;
11. evite LOW;
12. justification deve ser curta, objetiva e explicar a relação pedagógica;
13. preserve suggestionId e candidateId exatamente;
14. responda em português do Brasil.
`.trim(),
        },

        {
          role:
            "user",

          content:
            JSON.stringify({
              analyses:
                payload,
            }),
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

  // ====================================================
  // RESPOSTA
  // ====================================================

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
        assessments:
          unknown[];
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

  // ====================================================
  // VALIDAÇÃO DA RESPOSTA
  // ====================================================

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

        // ------------------------------------------------
        // Somente os TOP candidatos realmente enviados
        // ao modelo são permitidos.
        // ------------------------------------------------

        const allowedCandidates =
          new Set(
            bundle.candidates
              .slice(
                0,
                MAX_AI_CANDIDATES_PER_SUGGESTION,
              )
              .map(
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
                    "A IA tentou selecionar uma habilidade fora dos candidatos efetivamente enviados.",
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

                const justification =
                  requireString(
                    match.justification,

                    "justification",
                  );

                return {
                  candidateId,

                  relevanceScore,

                  confidence:
                    match.confidence as
                      BnccLinkConfidence,

                  justification,
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

  // ====================================================
  // GARANTIR QUE TODAS FORAM PROCESSADAS
  // ====================================================

  for (
    const suggestionId of
    suggestionIds
  ) {
    if (
      !seenSuggestions.has(
        suggestionId,
      )
    ) {
      throw new Error(
        "Uma sugestão com candidatos ficou sem avaliação BNCC.",
      );
    }
  }

  return assessments;
}

// ======================================================
// FUNÇÃO PRINCIPAL
// ======================================================

export async function linkJourneySuggestionsToBncc(
  suggestions:
    JourneyBnccSuggestionInput[],
): Promise<
  JourneyBnccLinkingResult
> {
  if (
    suggestions.length ===
    0
  ) {
    throw new Error(
      "Não existem sugestões pedagógicas para cruzar com a BNCC.",
    );
  }

  // ====================================================
  // 1. INTENÇÕES DETERMINÍSTICAS
  // ====================================================
  //
  // Não há mais chamada Groq nesta etapa.
  // ====================================================

  const intents =
    generateSearchIntents(
      suggestions,
    );

  // ====================================================
  // 2. RECUPERAÇÃO DA BASE OFICIAL
  // ====================================================

  const bundles =
    await retrieveCandidates(
      suggestions,
      intents,
    );

  // ====================================================
  // 3. ÚNICA CHAMADA À IA
  // ====================================================

  const {
    client,
    modelName,
  } =
    getGroq();

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

  // ====================================================
  // 4. CONSTRUIR LINKS
  // ====================================================

  const links:
    JourneyBnccLinkDraft[] =
    [];

  for (
    const bundle of
    bundles
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
          bundle.suggestion
            .analysisId,

        bnccSkillId:
          candidate.id,

        evidenceChunkId:
          bundle.suggestion
            .evidenceChunkId,

        evidenceExcerpt:
          clipText(
            bundle.suggestion
              .evidenceText,

            MAX_SAVED_EVIDENCE_CHARS,
          ),

        retrievalScore:
          candidate.retrieval
            .score,

        aiRelevanceScore:
          match.relevanceScore /
          100,

        confidence:
          match.confidence,

        // Rank produzido pelo retriever determinístico.
        candidateRank:
          candidate.retrieval
            .rank,

        justification:
          match.justification,
      });
    }
  }

  // ====================================================
  // 5. BARREIRA FINAL DE SEGURANÇA
  // ====================================================
  //
  // Mesmo depois do LLM:
  //
  // - o ID precisa existir;
  // - precisa ser Ensino Médio;
  // - precisa estar current;
  // - a fonte precisa estar VERIFIED.
  //
  // Portanto a IA nunca consegue persistir uma habilidade
  // que não pertença à nossa base oficial.
  // ====================================================

  await requireVerifiedBnccSkillsByIds(
    links.map(
      (link) =>
        link.bnccSkillId,
    ),
  );

  // ====================================================
  // 6. DIAGNÓSTICOS
  // ====================================================

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
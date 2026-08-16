import "server-only";

import {
  JourneySuggestionType,
  Subject,
} from "@prisma/client";

import Groq from "groq-sdk";

export const JOURNEY_ANALYSIS_PROMPT_VERSION =
  "journey-analysis-v1";

const DEFAULT_MODEL =
  "openai/gpt-oss-120b";

const MIN_SUGGESTIONS = 3;
const MAX_SUGGESTIONS = 6;

const MAX_CONTEXT_CHARACTERS =
  180_000;

const SUBJECT_VALUES =
  Object.values(Subject);

const SUGGESTION_TYPE_VALUES =
  Object.values(
    JourneySuggestionType,
  );

export type JourneyAnalysisChunkInput = {
  id: string;

  documentId: string;

  chunkIndex: number;

  text: string;

  textHash:
    | string
    | null;
};

export type JourneyAnalysisInput = {
  journeyTitle: string;

  journeyDescription:
    | string
    | null;

  grade: number;

  chunks:
    JourneyAnalysisChunkInput[];

  availableSubjects:
    Subject[];
};

export type JourneyAiSuggestion = {
  subject: Subject;

  type:
    JourneySuggestionType;

  title: string;

  objective: string;

  content: string;

  rationale: string;

  contentTopics:
    string[];

  evidenceChunkIndex:
    number;

  evidence: string;
};

export type JourneyAiAnalysisResult = {
  summary: string;

  suggestions:
    JourneyAiSuggestion[];
};

export type RunJourneyAiAnalysisResult = {
  modelName: string;

  result:
    JourneyAiAnalysisResult;
};

function isSubject(
  value: unknown,
): value is Subject {
  return (
    typeof value ===
      "string" &&
    SUBJECT_VALUES.includes(
      value as Subject,
    )
  );
}

function isSuggestionType(
  value: unknown,
): value is JourneySuggestionType {
  return (
    typeof value ===
      "string" &&
    SUGGESTION_TYPE_VALUES.includes(
      value as JourneySuggestionType,
    )
  );
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
      `A IA retornou o campo "${field}" em formato inválido.`,
    );
  }

  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `A IA retornou o campo "${field}" vazio.`,
    );
  }

  return normalized;
}

function readStringArray(
  value: unknown,
  field: string,
): string[] {
  if (
    !Array.isArray(value)
  ) {
    throw new Error(
      `A IA retornou o campo "${field}" em formato inválido.`,
    );
  }

  const values =
    value
      .map((item) => {
        if (
          typeof item !==
          "string"
        ) {
          return "";
        }

        return item.trim();
      })
      .filter(Boolean);

  if (
    values.length === 0
  ) {
    throw new Error(
      `A IA não retornou conteúdos em "${field}".`,
    );
  }

  return values;
}

function validateResult(
  value: unknown,
  input:
    JourneyAnalysisInput,
): JourneyAiAnalysisResult {
  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    throw new Error(
      "A resposta estruturada da IA é inválida.",
    );
  }

  const object =
    value as Record<
      string,
      unknown
    >;

  const summary =
    requireString(
      object.summary,
      "summary",
    );

  if (
    !Array.isArray(
      object.suggestions,
    )
  ) {
    throw new Error(
      "A IA não retornou uma lista válida de sugestões.",
    );
  }

  if (
    object.suggestions
      .length <
    MIN_SUGGESTIONS
  ) {
    throw new Error(
      `A análise retornou apenas ${object.suggestions.length} sugestão(ões). São necessárias pelo menos ${MIN_SUGGESTIONS}.`,
    );
  }

  if (
    object.suggestions
      .length >
    MAX_SUGGESTIONS
  ) {
    throw new Error(
      `A análise retornou mais de ${MAX_SUGGESTIONS} sugestões.`,
    );
  }

  const allowedSubjects =
    new Set(
      input.availableSubjects,
    );

  const validChunkIndexes =
    new Set(
      input.chunks.map(
        (chunk) =>
          chunk.chunkIndex,
      ),
    );

  const suggestions =
    object.suggestions.map(
      (
        rawSuggestion,
        index,
      ) => {
        if (
          typeof rawSuggestion !==
            "object" ||
          rawSuggestion ===
            null
        ) {
          throw new Error(
            `A sugestão ${index + 1} retornada pela IA é inválida.`,
          );
        }

        const suggestion =
          rawSuggestion as Record<
            string,
            unknown
          >;

        if (
          !isSubject(
            suggestion.subject,
          )
        ) {
          throw new Error(
            `A sugestão ${index + 1} possui uma disciplina inválida.`,
          );
        }

        if (
          !allowedSubjects.has(
            suggestion.subject,
          )
        ) {
          throw new Error(
            `A sugestão ${index + 1} foi relacionada a uma disciplina indisponível no contexto atual.`,
          );
        }

        if (
          !isSuggestionType(
            suggestion.type,
          )
        ) {
          throw new Error(
            `A sugestão ${index + 1} possui um tipo inválido.`,
          );
        }

        if (
          !Number.isInteger(
            suggestion.evidenceChunkIndex,
          )
        ) {
          throw new Error(
            `A sugestão ${index + 1} não possui uma evidência válida.`,
          );
        }

        const evidenceChunkIndex =
          suggestion.evidenceChunkIndex as number;

        if (
          !validChunkIndexes.has(
            evidenceChunkIndex,
          )
        ) {
          throw new Error(
            `A sugestão ${index + 1} apontou para um fragmento que não existe.`,
          );
        }

        return {
          subject:
            suggestion.subject,

          type:
            suggestion.type,

          title:
            requireString(
              suggestion.title,
              `suggestions[${index}].title`,
            ),

          objective:
            requireString(
              suggestion.objective,
              `suggestions[${index}].objective`,
            ),

          content:
            requireString(
              suggestion.content,
              `suggestions[${index}].content`,
            ),

          rationale:
            requireString(
              suggestion.rationale,
              `suggestions[${index}].rationale`,
            ),

          contentTopics:
            readStringArray(
              suggestion.contentTopics,
              `suggestions[${index}].contentTopics`,
            ),

          evidenceChunkIndex,

          evidence:
            requireString(
              suggestion.evidence,
              `suggestions[${index}].evidence`,
            ),
        };
      },
    );

  return {
    summary,
    suggestions,
  };
}

function buildContext(
  input:
    JourneyAnalysisInput,
): string {
  const chunksText =
    input.chunks
      .map(
        (chunk) => `
[CHUNK ${chunk.chunkIndex}]
${chunk.text}
`.trim(),
      )
      .join("\n\n");

  if (
    chunksText.length >
    MAX_CONTEXT_CHARACTERS
  ) {
    throw new Error(
      "O roteiro é grande demais para esta versão da análise. Reduza o conteúdo antes de executar a IA.",
    );
  }

  const subjects =
    input.availableSubjects.join(
      ", ",
    );

  return `
JORNADA

Título:
${input.journeyTitle}

Série:
${input.grade}º ano

Descrição:
${input.journeyDescription ?? "Não informada"}

DISCIPLINAS DISPONÍVEIS

${subjects}

ROTEIRO

${chunksText}
`.trim();
}

function buildSystemPrompt(): string {
  return `
Você é um assistente de planejamento pedagógico para o Ensino Médio.

Sua função é interpretar uma Jornada pedagógica a partir EXCLUSIVAMENTE do roteiro fornecido.

OBJETIVO

Identificar possibilidades pedagógicas concretas que professores de diferentes disciplinas podem explorar a partir da Jornada.

REGRAS OBRIGATÓRIAS

1. Gere entre 3 e 6 sugestões pedagógicas.

2. Cada sugestão deve estar relacionada a exatamente uma disciplina dentre as disciplinas fornecidas.

3. Priorize pertinência pedagógica real. Não tente envolver disciplinas sem conexão justificável com o roteiro.

4. As sugestões podem abranger:
- conteúdos;
- conceitos;
- conexões interdisciplinares;
- referências;
- repertórios socioculturais;
- possibilidades em sala;
- temas de produção textual.

5. Toda sugestão deve possuir uma evidência concreta do roteiro.

6. evidenceChunkIndex deve ser exatamente o número de um CHUNK fornecido.

7. O campo evidence deve explicar qual elemento daquele fragmento sustenta a sugestão.

8. Não invente acontecimentos, características ou elementos que não estejam sustentados pelo roteiro.

9. É permitido propor uma exploração pedagógica além do texto literal, desde que a conexão seja claramente justificada a partir do roteiro.

10. NÃO gere códigos da BNCC.

11. NÃO cite habilidades BNCC.

12. NÃO invente competências ou habilidades BNCC.

13. O cruzamento com a BNCC será realizado posteriormente por outro mecanismo baseado em registros oficiais verificados.

14. Escreva em português do Brasil.

15. O conteúdo deve ser útil para professores e suficientemente específico para permitir posterior geração de atividades.

16. Evite sugestões genéricas como "fazer um debate" sem explicar conteúdo, objetivo e relação pedagógica.

17. O resumo deve sintetizar as principais possibilidades educacionais identificadas na Jornada.
`.trim();
}

export async function runJourneyAiAnalysis(
  input:
    JourneyAnalysisInput,
): Promise<RunJourneyAiAnalysisResult> {
  const apiKey =
    process.env
      .GROQ_API_KEY
      ?.trim();

  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY não está configurada.",
    );
  }

  if (
    input.chunks.length ===
    0
  ) {
    throw new Error(
      "Não existem fragmentos de roteiro para analisar.",
    );
  }

  if (
    input.availableSubjects
      .length === 0
  ) {
    throw new Error(
      "Não existem disciplinas disponíveis para a análise.",
    );
  }

  const modelName =
    process.env
      .GROQ_MODEL
      ?.trim() ||
    DEFAULT_MODEL;

  const groq =
    new Groq({
      apiKey,
    });

  const response =
    await groq.chat.completions.create(
      {
        model:
          modelName,

        messages: [
          {
            role:
              "system",

            content:
              buildSystemPrompt(),
          },

          {
            role:
              "user",

            content:
              buildContext(
                input,
              ),
          },
        ],

        response_format: {
          type:
            "json_schema",

          json_schema: {
            name:
              "journey_pedagogical_analysis",

            strict:
              true,

            schema: {
              type:
                "object",

              properties: {
                summary: {
                  type:
                    "string",
                },

                suggestions: {
                  type:
                    "array",

                  items: {
                    type:
                      "object",

                    properties: {
                      subject: {
                        type:
                          "string",

                        enum:
                          input.availableSubjects,
                      },

                      type: {
                        type:
                          "string",

                        enum:
                          SUGGESTION_TYPE_VALUES,
                      },

                      title: {
                        type:
                          "string",
                      },

                      objective: {
                        type:
                          "string",
                      },

                      content: {
                        type:
                          "string",
                      },

                      rationale: {
                        type:
                          "string",
                      },

                      contentTopics:
                        {
                          type:
                            "array",

                          items:
                            {
                              type:
                                "string",
                            },
                        },

                      evidenceChunkIndex:
                        {
                          type:
                            "integer",
                        },

                      evidence: {
                        type:
                          "string",
                      },
                    },

                    required: [
                      "subject",
                      "type",
                      "title",
                      "objective",
                      "content",
                      "rationale",
                      "contentTopics",
                      "evidenceChunkIndex",
                      "evidence",
                    ],

                    additionalProperties:
                      false,
                  },
                },
              },

              required: [
                "summary",
                "suggestions",
              ],

              additionalProperties:
                false,
            },
          },
        },
      },
    );

  const content =
    response.choices[0]
      ?.message
      ?.content;

  if (!content) {
    throw new Error(
      "A IA não retornou conteúdo para a análise.",
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
      "A resposta da IA não pôde ser interpretada como JSON.",
    );
  }

  return {
    modelName,

    result:
      validateResult(
        parsed,
        input,
      ),
  };
}
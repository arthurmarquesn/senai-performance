import "server-only";

import {
  Subject,
} from "@prisma/client";

import Groq from "groq-sdk";

const DEFAULT_MODEL =
  "openai/gpt-oss-120b";

export const JOURNEY_ACTIVITY_PROMPT_VERSION =
  "journey-activity-v1";

export type JourneyActivityBnccInput = {
  id: string;
  code: string;
  description: string;
};

export type GenerateJourneyActivityInput = {
  journey: {
    title: string;
    description: string | null;
    grade: number;
  };

  suggestion: {
    subject: Subject;
    title: string;
    objective: string | null;
    content: string;
    rationale: string | null;
    contentTopics: string[];
    evidence: string | null;
  };

  approvedBnccSkills:
    JourneyActivityBnccInput[];
};

export type GeneratedJourneyActivity = {
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

export type GenerateJourneyActivityResult = {
  modelName: string;

  activity:
    GeneratedJourneyActivity;
};

function getGroq() {
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

  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `A IA retornou "${field}" vazio.`,
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
      `A IA retornou "${field}" em formato inválido.`,
    );
  }

  const values =
    value
      .map((item) =>
        typeof item ===
        "string"
          ? item.trim()
          : "",
      )
      .filter(Boolean);

  if (
    values.length === 0
  ) {
    throw new Error(
      `A IA não retornou itens em "${field}".`,
    );
  }

  return values;
}

function validateActivity(
  value: unknown,
): GeneratedJourneyActivity {
  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    throw new Error(
      "A atividade retornada pela IA possui estrutura inválida.",
    );
  }

  const object =
    value as Record<
      string,
      unknown
    >;

  if (
    typeof object.estimatedMinutes !==
      "number" ||
    !Number.isInteger(
      object.estimatedMinutes,
    ) ||
    object.estimatedMinutes <
      10 ||
    object.estimatedMinutes >
      600
  ) {
    throw new Error(
      "A duração estimada retornada pela IA é inválida.",
    );
  }

  return {
    title:
      requireString(
        object.title,
        "title",
      ),

    objective:
      requireString(
        object.objective,
        "objective",
      ),

    instructions:
      requireString(
        object.instructions,
        "instructions",
      ),

    estimatedMinutes:
      object.estimatedMinutes,

    studentOrganization:
      requireString(
        object.studentOrganization,
        "studentOrganization",
      ),

    resources:
      readStringArray(
        object.resources,
        "resources",
      ),

    expectedProduct:
      requireString(
        object.expectedProduct,
        "expectedProduct",
      ),

    assessmentCriteria:
      readStringArray(
        object.assessmentCriteria,
        "assessmentCriteria",
      ),

    teacherNotes:
      requireString(
        object.teacherNotes,
        "teacherNotes",
      ),
  };
}

export async function generateJourneyActivity(
  input:
    GenerateJourneyActivityInput,
): Promise<GenerateJourneyActivityResult> {
  if (
    input.approvedBnccSkills.length ===
    0
  ) {
    throw new Error(
      "A atividade precisa possuir ao menos uma habilidade BNCC aprovada.",
    );
  }

  const {
    client,
    modelName,
  } =
    getGroq();

  const response =
    await client.chat.completions.create({
      model:
        modelName,

      messages: [
        {
          role:
            "system",

          content: `
Você é um assistente de planejamento pedagógico para o Ensino Médio.

Sua tarefa é transformar uma possibilidade pedagógica já analisada em uma atividade concreta para aplicação com estudantes.

REGRAS OBRIGATÓRIAS

1. Utilize exclusivamente o contexto fornecido.

2. A atividade deve ser adequada à série informada.

3. A atividade deve manter coerência com a disciplina da sugestão.

4. As habilidades BNCC recebidas já foram selecionadas e aprovadas por um professor.

5. Você NÃO pode adicionar outras habilidades BNCC.

6. Você NÃO pode remover habilidades BNCC.

7. Você NÃO pode criar códigos BNCC.

8. Você NÃO pode sugerir substituição de habilidades BNCC.

9. As habilidades recebidas devem orientar objetivo, execução e avaliação da atividade.

10. A proposta deve ser aplicável em contexto escolar real.

11. Evite instruções genéricas.

12. Descreva uma sequência clara de execução.

13. A atividade deve permitir ao professor compreender:
- o que preparar;
- o que os alunos farão;
- o produto esperado;
- como observar a aprendizagem.

14. assessmentCriteria deve conter critérios observáveis, não apenas palavras como "participação" ou "interesse".

15. estimatedMinutes deve representar o tempo total aproximado da atividade.

16. resources deve listar recursos concretos.

17. teacherNotes deve conter orientações úteis para mediação, adaptações ou cuidados pedagógicos.

18. Não trate a atividade como publicada ou definitiva.

19. Não mencione Google Classroom.

20. Escreva em português do Brasil.
`.trim(),
        },

        {
          role:
            "user",

          content:
            JSON.stringify(
              input,
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
            "journey_activity",

          strict:
            true,

          schema: {
            type:
              "object",

            properties: {
              title: {
                type:
                  "string",
              },

              objective: {
                type:
                  "string",
              },

              instructions: {
                type:
                  "string",
              },

              estimatedMinutes: {
                type:
                  "integer",
              },

              studentOrganization: {
                type:
                  "string",
              },

              resources: {
                type:
                  "array",

                items: {
                  type:
                    "string",
                },
              },

              expectedProduct: {
                type:
                  "string",
              },

              assessmentCriteria: {
                type:
                  "array",

                items: {
                  type:
                    "string",
                },
              },

              teacherNotes: {
                type:
                  "string",
              },
            },

            required: [
              "title",
              "objective",
              "instructions",
              "estimatedMinutes",
              "studentOrganization",
              "resources",
              "expectedProduct",
              "assessmentCriteria",
              "teacherNotes",
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
      "A IA não retornou conteúdo para a atividade.",
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
      "A atividade retornada pela IA não pôde ser interpretada.",
    );
  }

  return {
    modelName,

    activity:
      validateActivity(
        parsed,
      ),
  };
}
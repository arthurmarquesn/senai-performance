import type {
  JourneyMindMapNode,
  JourneyMindMapNodeStatus,
  JourneyMindMapStructure,
} from "./mind-map-types";

const subjectLabels = {
  MATEMATICA:
    "Matemática",

  FISICA:
    "Física",

  QUIMICA:
    "Química",

  BIOLOGIA:
    "Biologia",

  PORTUGUES:
    "Língua Portuguesa",

  INGLES:
    "Língua Inglesa",

  ARTES:
    "Artes",

  EDUCACAO_FISICA:
    "Educação Física",

  SOCIOLOGIA:
    "Sociologia",

  FILOSOFIA:
    "Filosofia",

  GEOGRAFIA:
    "Geografia",

  HISTORIA:
    "História",
} as const;

type SubjectName =
  keyof typeof subjectLabels;

type MindMapBnccLinkInput = {
  id: string;

  status:
    | "SUGGESTED"
    | "APPROVED"
    | "REJECTED";

  justification:
    string | null;

  bnccSkill: {
    id: string;

    code:
      string;

    description:
      string;
  };
};

type MindMapSuggestionInput = {
  id: string;

  subject:
    SubjectName;

  type:
    string;

  title:
    string;

  objective:
    string | null;

  content:
    string;

  rationale:
    string | null;

  contentTopics:
    unknown;

  bnccLinks:
    MindMapBnccLinkInput[];
};

type BuildJourneyMindMapInput = {
  journey: {
    id:
      string;

    title:
      string;

    description:
      string | null;

    grade:
      number;
  };

  suggestions:
    MindMapSuggestionInput[];
};

function readStringArray(
  value: unknown,
): string[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value
    .map(
      (item) =>
        typeof item ===
        "string"
          ? item.trim()
          : "",
    )
    .filter(Boolean);
}

function clip(
  value:
    | string
    | null,
  maxLength = 300,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized =
    value.trim();

  if (!normalized) {
    return undefined;
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

function isVisibleBnccLink(
  link:
    MindMapBnccLinkInput,
): link is
  MindMapBnccLinkInput & {
    status:
      | "SUGGESTED"
      | "APPROVED";
  } {
  return (
    link.status !==
    "REJECTED"
  );
}

function mindMapStatusFromBnccLink(
  status:
    | "SUGGESTED"
    | "APPROVED",
): JourneyMindMapNodeStatus {
  if (
    status ===
    "APPROVED"
  ) {
    return "APPROVED";
  }

  return "SUGGESTED";
}

function suggestionNode(
  suggestion:
    MindMapSuggestionInput,
): JourneyMindMapNode {
  const children:
    JourneyMindMapNode[] =
    [];

  const topics =
    readStringArray(
      suggestion.contentTopics,
    );

  for (
    let index = 0;
    index <
    topics.length;
    index += 1
  ) {
    children.push({
      id:
        `content:${suggestion.id}:${index}`,

      type:
        "CONTENT",

      label:
        topics[index],

      referenceId:
        suggestion.id,
    });
  }

  // BNCC rejeitada não aparece no mapa.
  //
  // O type predicate acima garante também para o
  // TypeScript que depois deste filtro só existem
  // SUGGESTED ou APPROVED.
  const bnccLinks =
    suggestion.bnccLinks
      .filter(
        isVisibleBnccLink,
      )
      .sort(
        (a, b) => {
          if (
            a.status ===
              "APPROVED" &&
            b.status !==
              "APPROVED"
          ) {
            return -1;
          }

          if (
            b.status ===
              "APPROVED" &&
            a.status !==
              "APPROVED"
          ) {
            return 1;
          }

          return a.bnccSkill.code.localeCompare(
            b.bnccSkill.code,
          );
        },
      );

  for (
    const link of
    bnccLinks
  ) {
    const status =
      mindMapStatusFromBnccLink(
        link.status,
      );

    children.push({
      id:
        `bncc:${link.id}`,

      type:
        "BNCC",

      label:
        link.bnccSkill.code,

      description:
        clip(
          link.bnccSkill.description,
          420,
        ),

      // referenceId aponta para JourneyBnccLink.id,
      // e não para um código livre.
      referenceId:
        link.id,

      status,

      tags:
        status ===
        "APPROVED"
          ? [
              "BNCC validada",
            ]
          : [
              "BNCC sugerida",
            ],
    });
  }

  const node:
    JourneyMindMapNode = {
      id:
        `suggestion:${suggestion.id}`,

      type:
        "SUGGESTION",

      label:
        suggestion.title,

      referenceId:
        suggestion.id,

      tags: [
        suggestion.type,
      ],
  };

  const description =
    clip(
      suggestion.objective,
      320,
    ) ??
    clip(
      suggestion.rationale,
      320,
    ) ??
    clip(
      suggestion.content,
      320,
    );

  if (description) {
    node.description =
      description;
  }

  if (
    children.length >
    0
  ) {
    node.children =
      children;
  }

  return node;
}

export function buildJourneyMindMap(
  input:
    BuildJourneyMindMapInput,
): JourneyMindMapStructure {
  const bySubject =
    new Map<
      SubjectName,
      MindMapSuggestionInput[]
    >();

  for (
    const suggestion of
    input.suggestions
  ) {
    const current =
      bySubject.get(
        suggestion.subject,
      ) ?? [];

    current.push(
      suggestion,
    );

    bySubject.set(
      suggestion.subject,
      current,
    );
  }

  const subjectNodes =
    Array.from(
      bySubject.entries(),
    )
      .sort(
        (
          [subjectA],
          [subjectB],
        ) =>
          subjectLabels[
            subjectA
          ].localeCompare(
            subjectLabels[
              subjectB
            ],
            "pt-BR",
          ),
      )
      .map(
        (
          [
            subject,
            suggestions,
          ],
        ): JourneyMindMapNode => ({
          id:
            `subject:${subject}`,

          type:
            "SUBJECT",

          label:
            subjectLabels[
              subject
            ],

          tags: [
            `${suggestions.length} sugestão(ões)`,
          ],

          children:
            suggestions
              .slice()
              .sort(
                (a, b) =>
                  a.title.localeCompare(
                    b.title,
                    "pt-BR",
                  ),
              )
              .map(
                suggestionNode,
              ),
        }),
      );

  return {
    schemaVersion:
      1,

    root: {
      id:
        `journey:${input.journey.id}`,

      type:
        "JOURNEY",

      label:
        input.journey.title,

      description:
        clip(
          input.journey.description,
          400,
        ) ??
        `${input.journey.grade}º ano`,

      referenceId:
        input.journey.id,

      tags: [
        `${input.journey.grade}º ano`,
        `${input.suggestions.length} sugestão(ões)`,
      ],

      children:
        subjectNodes,
    },
  };
}
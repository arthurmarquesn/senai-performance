import {
  KnowledgeArea,
  Subject,
} from "@prisma/client";

export const SUBJECT_TO_KNOWLEDGE_AREA: Record<
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

export function knowledgeAreaForSubject(
  subject: Subject,
): KnowledgeArea {
  return SUBJECT_TO_KNOWLEDGE_AREA[
    subject
  ];
}
import type {
  BnccStage,
  KnowledgeArea,
  Subject,
} from "@prisma/client";

/**
 * Fonte BNCC já liberada para uso pela aplicação.
 *
 * Importante:
 * um objeto desse tipo só deve ser construído pelo repository.ts,
 * que exige simultaneamente:
 *
 * source.status = VERIFIED
 * skill.isCurrent = true
 */
export type VerifiedBnccSource = {
  id: string;
  title: string;
  publisher: string;
  officialUrl: string;
  versionLabel: string | null;
  sha256: string;
  verifiedAt: Date | null;
};

export type VerifiedBnccSkill = {
  id: string;
  code: string;
  stage: BnccStage;
  area: KnowledgeArea;

  /**
   * Disciplina oficialmente registrada na própria base.
   *
   * No Ensino Médio, a maior parte das habilidades é de área e,
   * portanto, permanece null.
   *
   * Exemplo específico:
   * EM13LPxx -> PORTUGUES
   */
  officialSubject: Subject | null;

  description: string;

  competencyCode: string | null;
  competencyText: string | null;

  sourcePage: number | null;
  sourceLocator: string | null;
  officialTextHash: string | null;

  source: VerifiedBnccSource;
};

export type BnccSearchInput = {
  /**
   * Área NÃO deve ser escolhida livremente pela IA.
   *
   * Quando integrarmos Jornadas, este valor deverá vir do
   * TeacherProfile/participação do professor.
   */
  area: KnowledgeArea;

  /**
   * Disciplina do professor.
   *
   * Ela é usada para validação de coerência e para um pequeno boost
   * quando a BNCC realmente possui uma habilidade específica daquela
   * disciplina.
   *
   * Não convertemos habilidades de área em habilidades disciplinares.
   */
  teacherSubject?: Subject | null;

  /**
   * Intenção de busca.
   *
   * Não deve conter um código BNCC inventado pela IA.
   * Pode ser, por exemplo:
   *
   * "analisar transformações sociais e relações de trabalho"
   */
  query: string;

  /**
   * Termos adicionais, se a análise da Jornada tiver separado
   * conceitos relevantes.
   */
  keywords?: readonly string[];

  /**
   * Quantidade máxima de candidatos.
   *
   * O search.ts limita o valor novamente no servidor.
   */
  limit?: number;

  /**
   * Corte mínimo do score lexical determinístico.
   *
   * Intervalo: 0..1
   */
  minScore?: number;
};

export type BnccRetrievalEvidence = {
  rank: number;

  /**
   * Score do RETRIEVER.
   *
   * Não representa confiança pedagógica da IA.
   * A avaliação pedagógica será feita em uma etapa posterior.
   */
  score: number;

  matchedTerms: string[];

  reasons: string[];
};

export type BnccSearchResult = VerifiedBnccSkill & {
  retrieval: BnccRetrievalEvidence;
};

/**
 * Estrutura que futuramente poderá ser produzida pela IA antes
 * da busca BNCC.
 *
 * Repare que NÃO existe campo "bnccCode".
 */
export type BnccSearchIntent = {
  query: string;
  keywords: string[];
  rationale: string;
};

/**
 * Estrutura permitida para a IA avaliar um candidato já recuperado.
 *
 * O modelo não devolve código livre.
 * Ele devolve somente o ID interno de uma habilidade real que recebeu.
 */
export type BnccCandidateAssessment = {
  bnccSkillId: string;
  relevanceScore: number;
  justification: string;
  evidenceChunkId: string | null;
};
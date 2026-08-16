import {
  KnowledgeArea,
  Subject,
} from "@prisma/client";

import {
  searchVerifiedBnccSkills,
} from "../../src/lib/bncc/search-core";

type SmokeCase = {
  title: string;
  area: KnowledgeArea;
  teacherSubject: Subject;
  query: string;
  keywords: string[];
};

const cases: SmokeCase[] = [
  {
    title: "História / Humanas",
    area:
      KnowledgeArea.CIENCIAS_HUMANAS,
    teacherSubject:
      Subject.HISTORIA,
    query:
      "analisar transformações sociais, relações de trabalho e processos históricos",
    keywords: [
      "mudanças sociais",
      "trabalho",
      "processos históricos",
    ],
  },
  {
    title: "Biologia / Natureza",
    area:
      KnowledgeArea.CIENCIAS_DA_NATUREZA,
    teacherSubject:
      Subject.BIOLOGIA,
    query:
      "analisar impactos ambientais, sustentabilidade e uso de recursos naturais",
    keywords: [
      "meio ambiente",
      "sustentabilidade",
      "recursos naturais",
    ],
  },
  {
    title: "Matemática",
    area:
      KnowledgeArea.MATEMATICA,
    teacherSubject:
      Subject.MATEMATICA,
    query:
      "modelar situações, interpretar dados e utilizar representações matemáticas",
    keywords: [
      "modelagem",
      "dados",
      "representações",
    ],
  },
  {
    title: "Português / Linguagens",
    area:
      KnowledgeArea.LINGUAGENS,
    teacherSubject:
      Subject.PORTUGUES,
    query:
      "analisar criticamente discursos, argumentação e produção de textos",
    keywords: [
      "argumentação",
      "discursos",
      "produção textual",
    ],
  },
];

async function main() {
  for (const smokeCase of cases) {
    console.log("");
    console.log(
      "==============================================",
    );
    console.log(smokeCase.title);
    console.log(
      "==============================================",
    );

    const results =
      await searchVerifiedBnccSkills({
        area: smokeCase.area,
        teacherSubject:
          smokeCase.teacherSubject,
        query: smokeCase.query,
        keywords:
          smokeCase.keywords,
        limit: 5,
      });

    if (results.length === 0) {
      console.log(
        "Nenhum candidato encontrado.",
      );
      continue;
    }

    for (const result of results) {
      console.log("");
      console.log(
        `#${result.retrieval.rank} ${result.code}`,
      );
      console.log(
        `score=${result.retrieval.score}`,
      );
      console.log(
        `area=${result.area}`,
      );
      console.log(
        `officialSubject=${
          result.officialSubject ??
          "null"
        }`,
      );
      console.log(
        `page=${
          result.sourcePage ??
          "n/a"
        }`,
      );
      console.log(
        `matched=${
          result.retrieval.matchedTerms.join(
            ", ",
          )
        }`,
      );
      console.log(
        result.description,
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
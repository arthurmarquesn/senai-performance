#!/usr/bin/env node

"use strict";

/**
 * REPARO CONTROLADO DA IMPORTAÇÃO BNCC
 *
 * Corrige dois problemas encontrados pela verificação independente:
 *
 * 1. Língua Portuguesa:
 *    o parser antigo juntou a coluna "Competências específicas" ao texto
 *    da habilidade porque agrupava itens apenas por coordenada Y.
 *
 * 2. EM13MAT502:
 *    o PDF representa o expoente "2" de "ax²" como item tipográfico
 *    separado; no pdfjs-dist ele pode ser ordenado antes da linha-base.
 *
 * O reparo:
 * - só atua sobre uma BnccSource IMPORTED;
 * - exige SHA-256 canônico do PDF;
 * - exige exatamente 183 habilidades;
 * - exige todas as habilidades com isCurrent=false;
 * - aborta se qualquer habilidade já estiver vinculada a Jornada/atividade;
 * - reextrai as 183 habilidades;
 * - isola geometricamente a coluna de habilidades de Língua Portuguesa;
 * - só aceita a extração se 183/183 fingerprints coincidirem com o
 *   manifesto independente V3;
 * - atualiza os textos preservando os IDs das BnccSkill;
 * - NÃO promove para VERIFIED.
 *
 * Uso:
 *   node scripts/bncc/repair-imported-source.cjs --dry-run
 *   node scripts/bncc/repair-imported-source.cjs
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

loadProjectEnv();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const OFFICIAL_PDF_URL =
  "https://basenacionalcomum.mec.gov.br/images/BNCC_EI_EF_110518_versaofinal_site.pdf";

const CANONICAL_PDF_SHA256 =
  "ad623d7b33986a4e87e1441a4e675064cd30db3650b86a75caefa476e802272b";

const EXPECTED_SKILL_COUNT = 183;

const CANONICAL_RANGES = [
  {
    key: "LINGUAGENS",
    pdfStartPage: 493,
    pdfEndPage: 499,
    printedStartPage: 491,
    printedEndPage: 497,
    prefixes: ["EM13LGG"],
  },
  {
    key: "PORTUGUES",
    pdfStartPage: 508,
    pdfEndPage: 528,
    printedStartPage: 506,
    printedEndPage: 526,
    prefixes: ["EM13LP"],
    maxItemStartX: 460,
  },
  {
    key: "MATEMATICA",
    pdfStartPage: 535,
    pdfEndPage: 543,
    printedStartPage: 533,
    printedEndPage: 541,
    prefixes: ["EM13MAT"],
  },
  {
    key: "CIENCIAS_DA_NATUREZA",
    pdfStartPage: 557,
    pdfEndPage: 562,
    printedStartPage: 555,
    printedEndPage: 560,
    prefixes: ["EM13CNT"],
  },
  {
    key: "CIENCIAS_HUMANAS",
    pdfStartPage: 574,
    pdfEndPage: 581,
    printedStartPage: 572,
    printedEndPage: 579,
    prefixes: ["EM13CHS"],
  },
];

const SKILL_CODE_EXACT =
  /^(?:EM13(?:LGG|MAT|CNT|CHS)\d{3}|EM13LP\d{2})$/;

const SKILL_CODE_GLOBAL =
  /\b(?:EM13(?:LGG|MAT|CNT|CHS)\d{3}|EM13LP\d{2})\b/g;

const STOP_MARKERS = [
  "COMPETÊNCIA ESPECÍFICA",
  "COMPETENCIAS ESPECÍFICAS",
  "COMPETÊNCIAS ESPECÍFICAS",
  "CONSIDERAÇÕES SOBRE A ORGANIZAÇÃO CURRICULAR",
  "FICHA TÉCNICA",
  "BASE NACIONAL COMUM CURRICULAR",
  "MATEMÁTICA E SUAS TECNOLOGIAS",
  "CIÊNCIAS DA NATUREZA E SUAS TECNOLOGIAS",
  "CIÊNCIAS HUMANAS E SOCIAIS APLICADAS",
  "LINGUAGENS E SUAS TECNOLOGIAS",
];

function loadProjectEnv() {
  for (const fileName of [".env.local", ".env"]) {
    const filePath = path.resolve(process.cwd(), fileName);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, "utf8");

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (!line || line.startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");

      if (separatorIndex <= 0) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();

      if (!key || process.env[key] !== undefined) {
        continue;
      }

      let value = line.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  }
}

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const keys = Object.keys(value).sort();

  return `{${keys
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableStringify(value[key])}`
    )
    .join(",")}}`;
}

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\u00ad/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function normalizeLexically(value) {
  let text = String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\u00ad/g, "");

  text = text.replace(
    /([0-9a-zà-ÿ])-\s+([0-9a-zà-ÿ])/gi,
    "$1$2"
  );

  const tokens =
    text.match(/[0-9a-zà-ÿ]+/gi) ?? [];

  return tokens.join(" ");
}

function lexicalFingerprint(value) {
  const normalized = normalizeLexically(value);

  return {
    hash: sha256(Buffer.from(normalized, "utf8")),
    tokenCount:
      normalized.length === 0
        ? 0
        : normalized.split(" ").length,
  };
}

function normalizeForSearch(value) {
  return normalizeWhitespace(value)
    .normalize("NFKC")
    .toLowerCase();
}

function loadManifest() {
  const manifestPath = path.join(
    __dirname,
    "bncc-canonical-manifest.json"
  );

  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8")
  );

  if (
    manifest?.source?.sha256 !== CANONICAL_PDF_SHA256 ||
    manifest?.skills?.length !== EXPECTED_SKILL_COUNT
  ) {
    throw new Error("Manifesto V3 inválido.");
  }

  return manifest;
}

function isAllowedMecHost(hostname) {
  const normalized = String(hostname ?? "")
    .trim()
    .toLowerCase();

  return (
    normalized === "mec.gov.br" ||
    normalized.endsWith(".mec.gov.br")
  );
}

async function downloadPdf() {
  const response = await fetch(OFFICIAL_PDF_URL, {
    redirect: "follow",
    headers: {
      "user-agent": "SENAI-Performance-BNCC-Repair/1.0",
      accept: "application/pdf,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Falha no download: HTTP ${response.status}.`
    );
  }

  const finalUrl = new URL(response.url);

  if (
    finalUrl.protocol !== "https:" ||
    !isAllowedMecHost(finalUrl.hostname)
  ) {
    throw new Error(
      `Redirecionamento não autorizado: ${response.url}`
    );
  }

  const bytes = Buffer.from(
    await response.arrayBuffer()
  );

  if (
    bytes.subarray(0, 5).toString("ascii") !== "%PDF-"
  ) {
    throw new Error("Arquivo recebido não é PDF.");
  }

  const actualSha = sha256(bytes);

  if (actualSha !== CANONICAL_PDF_SHA256) {
    throw new Error(
      "SHA-256 do PDF divergiu da versão auditada.\n" +
        `Esperado: ${CANONICAL_PDF_SHA256}\n` +
        `Recebido: ${actualSha}`
    );
  }

  return bytes;
}

async function loadPdf(bytes) {
  const pdfjs = await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  );

  const task = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    disableWorker: true,
    useSystemFonts: true,
  });

  return task.promise;
}

async function extractPageLines(
  pdf,
  pdfPageNumber,
  maxItemStartX = null
) {
  const page = await pdf.getPage(pdfPageNumber);
  const textContent = await page.getTextContent();

  const items = textContent.items
    .filter(
      (item) =>
        item &&
        typeof item.str === "string" &&
        Array.isArray(item.transform) &&
        item.str.trim()
    )
    .map((item) => ({
      text: normalizeWhitespace(item.str),
      x: Number(item.transform[4]),
      y: Number(item.transform[5]),
    }))
    .filter(
      (item) =>
        maxItemStartX == null ||
        item.x < maxItemStartX
    );

  const lines = [];
  const yTolerance = 2.5;

  for (const item of items) {
    let line = lines.find(
      (candidate) =>
        Math.abs(candidate.y - item.y) <= yTolerance
    );

    if (!line) {
      line = {
        y: item.y,
        items: [],
      };

      lines.push(line);
    }

    line.items.push(item);
  }

  lines.sort((a, b) => b.y - a.y);

  return lines
    .map((line) => {
      line.items.sort((a, b) => a.x - b.x);

      return normalizeWhitespace(
        line.items
          .map((item) => item.text)
          .join(" ")
      );
    })
    .filter(Boolean);
}

function findCodes(text) {
  return [...text.matchAll(SKILL_CODE_GLOBAL)].map(
    (match) => match[0]
  );
}

function lineContainsStopMarker(line) {
  const normalized = line.toUpperCase();

  return STOP_MARKERS.some((marker) =>
    normalized.includes(marker)
  );
}

function decodeSkillCode(code) {
  if (!SKILL_CODE_EXACT.test(code)) {
    throw new Error(`Código não reconhecido: ${code}`);
  }

  if (code.startsWith("EM13LP")) {
    return {
      area: "LINGUAGENS",
      subject: "PORTUGUES",
    };
  }

  if (code.startsWith("EM13LGG")) {
    return {
      area: "LINGUAGENS",
      subject: null,
    };
  }

  if (code.startsWith("EM13MAT")) {
    return {
      area: "MATEMATICA",
      subject: null,
    };
  }

  if (code.startsWith("EM13CNT")) {
    return {
      area: "CIENCIAS_DA_NATUREZA",
      subject: null,
    };
  }

  return {
    area: "CIENCIAS_HUMANAS",
    subject: null,
  };
}

function parseSkillsFromPage({
  pdfPageNumber,
  printedPageNumber,
  lines,
  allowedPrefixes,
}) {
  const occurrences = [];

  for (
    let lineIndex = 0;
    lineIndex < lines.length;
    lineIndex++
  ) {
    const codes = [
      ...new Set(findCodes(lines[lineIndex])),
    ];

    if (codes.length === 0) {
      continue;
    }

    if (codes.length > 1) {
      throw new Error(
        `Página ${printedPageNumber}: mais de um código na mesma linha.`
      );
    }

    const code = codes[0];

    if (
      !allowedPrefixes.some((prefix) =>
        code.startsWith(prefix)
      )
    ) {
      throw new Error(
        `Código ${code} fora da seção esperada.`
      );
    }

    occurrences.push({
      code,
      lineIndex,
    });
  }

  const skills = [];

  for (
    let index = 0;
    index < occurrences.length;
    index++
  ) {
    const occurrence = occurrences[index];
    const next = occurrences[index + 1];

    const segment = [];

    for (
      let lineIndex = occurrence.lineIndex;
      lineIndex <
      (next?.lineIndex ?? lines.length);
      lineIndex++
    ) {
      const line = lines[lineIndex];

      if (
        lineIndex > occurrence.lineIndex &&
        lineContainsStopMarker(line)
      ) {
        break;
      }

      segment.push(line);
    }

    const joined = normalizeWhitespace(
      segment.join(" ")
    );

    const codeIndex = joined.indexOf(
      occurrence.code
    );

    let description = joined.slice(
      codeIndex + occurrence.code.length
    );

    description = description.replace(
      /^[\s()[\]{}:;–—-]+/,
      ""
    );

    description = normalizeWhitespace(description);
    description = description.replace(
      /\s+\d{3}$/,
      ""
    );
    description = normalizeWhitespace(description);

    const decoded =
      decodeSkillCode(occurrence.code);

    skills.push({
      code: occurrence.code,
      area: decoded.area,
      subject: decoded.subject,
      stage: "ENSINO_MEDIO",
      description,
      sourcePage: printedPageNumber,
      sourceLocator:
        `PDF:impressa-p${printedPageNumber};` +
        `fisica-p${pdfPageNumber}`,
    });
  }

  return skills;
}

/**
 * Só corrige diferenças tipográficas se o resultado final bater
 * EXATAMENTE com o fingerprint independente do manifesto.
 *
 * EM13MAT502 possui um expoente "2" em "ax²".
 * No pdfjs-dist, esse expoente é um item tipográfico separado e possui Y
 * diferente da linha-base. O agrupamento geométrico antigo pode colocá-lo
 * antes de "essa representação", produzindo lexicalmente:
 *
 *   "... reconhecendo quando 2 essa representação ... y = ax"
 *
 * em vez de:
 *
 *   "... reconhecendo quando essa representação ... y = ax2"
 *
 * A correção abaixo é fail-closed:
 * - só é aplicada ao EM13MAT502;
 * - só é aceita para o fingerprint defeituoso já observado;
 * - o texto corrigido ainda precisa coincidir EXATAMENTE com o manifesto
 *   independente antes de ser aceito.
 */
function matchCanonicalTypography(
  skill,
  expected
) {
  const normalizedDescription =
    normalizeWhitespace(skill.description);

  const candidates = new Set([
    normalizedDescription,
  ]);

  if (skill.code === "EM13MAT502") {
    const raw =
      lexicalFingerprint(
        normalizedDescription
      );

    const KNOWN_PDFJS_LAYOUT_HASH =
      "083807622c7411e5ffcc17eb2857829d9eb0e6ea7901dbcde378d1d20e455146";

    // Variante simples: alguns extratores mantêm o expoente ao lado de "ax",
    // mas com espaço.
    for (const candidate of [...candidates]) {
      candidates.add(
        normalizeWhitespace(
          candidate.replace(
            /\bax\s+2\b/gi,
            "ax2"
          )
        )
      );
    }

    // Variante observada nesta versão do pdfjs-dist:
    // o item sobrescrito "2" é promovido para uma linha anterior.
    if (
      raw.hash === KNOWN_PDFJS_LAYOUT_HASH &&
      raw.tokenCount === 41
    ) {
      const movedExponentCandidate =
        normalizeWhitespace(
          normalizedDescription
            .replace(
              /\breconhecendo quando\s+2\s+essa representação\b/i,
              "reconhecendo quando essa representação"
            )
            .replace(
              /\by\s*=\s*ax(?=\s*(?:[.,;:]|$))/i,
              "y = ax2"
            )
        );

      candidates.add(
        movedExponentCandidate
      );
    }
  }

  const matches = [];

  for (const candidate of candidates) {
    const fp = lexicalFingerprint(candidate);

    if (
      fp.hash === expected.lexicalHash &&
      fp.tokenCount === expected.tokenCount
    ) {
      matches.push(candidate);
    }
  }

  if (matches.length === 0) {
    const raw = lexicalFingerprint(
      skill.description
    );

    throw new Error(
      `${skill.code}: texto reextraído não coincide com o manifesto. ` +
        `hash=${raw.hash}; tokens=${raw.tokenCount}; ` +
        `esperado=${expected.lexicalHash}; ` +
        `tokens esperados=${expected.tokenCount}`
    );
  }

  if (matches.length > 1) {
    const uniqueMatches = [
      ...new Set(matches),
    ];

    if (uniqueMatches.length > 1) {
      throw new Error(
        `${skill.code}: mais de uma correção textual distinta ` +
          "coincidiu com o manifesto. Reparo bloqueado."
      );
    }

    return uniqueMatches[0];
  }

  return matches[0];
}

async function parseAll(pdf, manifest) {
  const expectedByCode = new Map(
    manifest.skills.map((skill) => [
      skill.code,
      skill,
    ])
  );

  const byCode = new Map();

  for (const range of CANONICAL_RANGES) {
    for (
      let pdfPageNumber = range.pdfStartPage;
      pdfPageNumber <= range.pdfEndPage;
      pdfPageNumber++
    ) {
      const printedPageNumber =
        range.printedStartPage +
        (pdfPageNumber - range.pdfStartPage);

      const lines = await extractPageLines(
        pdf,
        pdfPageNumber,
        range.maxItemStartX ?? null
      );

      const skills = parseSkillsFromPage({
        pdfPageNumber,
        printedPageNumber,
        lines,
        allowedPrefixes: range.prefixes,
      });

      for (const skill of skills) {
        const expected =
          expectedByCode.get(skill.code);

        if (!expected) {
          throw new Error(
            `${skill.code}: ausente no manifesto V3.`
          );
        }

        skill.description =
          matchCanonicalTypography(
            skill,
            expected
          );

        const fp = lexicalFingerprint(
          skill.description
        );

        if (
          fp.hash !== expected.lexicalHash ||
          fp.tokenCount !== expected.tokenCount
        ) {
          throw new Error(
            `${skill.code}: pós-validação textual falhou.`
          );
        }

        byCode.set(skill.code, skill);
      }
    }
  }

  if (byCode.size !== EXPECTED_SKILL_COUNT) {
    throw new Error(
      `Extração final: ${byCode.size}; esperado=${EXPECTED_SKILL_COUNT}.`
    );
  }

  return [...byCode.values()].sort(
    (a, b) => a.code.localeCompare(b.code)
  );
}

async function findImportedSource() {
  const source =
    await prisma.bnccSource.findUnique({
      where: {
        sha256: CANONICAL_PDF_SHA256,
      },
    });

  if (!source) {
    throw new Error(
      "BnccSource canônica não encontrada."
    );
  }

  if (source.status !== "IMPORTED") {
    throw new Error(
      `O reparo só pode atuar em fonte IMPORTED. Atual=${source.status}`
    );
  }

  return source;
}

async function validateDatabaseQuarantine(
  source
) {
  const skills =
    await prisma.bnccSkill.findMany({
      where: {
        sourceId: source.id,
      },
      include: {
        _count: {
          select: {
            journeyLinks: true,
            activityLinks: true,
          },
        },
      },
    });

  if (
    skills.length !== EXPECTED_SKILL_COUNT
  ) {
    throw new Error(
      `Banco possui ${skills.length} habilidades; esperado=${EXPECTED_SKILL_COUNT}.`
    );
  }

  const currentCount = skills.filter(
    (skill) => skill.isCurrent
  ).length;

  if (currentCount !== 0) {
    throw new Error(
      `${currentCount} habilidade(s) já estão isCurrent=true. Reparo bloqueado.`
    );
  }

  const linked = skills.filter(
    (skill) =>
      skill._count.journeyLinks > 0 ||
      skill._count.activityLinks > 0
  );

  if (linked.length > 0) {
    throw new Error(
      `${linked.length} habilidade(s) já possuem vínculos pedagógicos. Reparo bloqueado.`
    );
  }

  return skills;
}

async function applyRepair(
  source,
  extracted
) {
  await prisma.$transaction(
    async (tx) => {
      for (const skill of extracted) {
        const officialTextHash = sha256(
          Buffer.from(
            skill.description,
            "utf8"
          )
        );

        await tx.bnccSkill.update({
          where: {
            sourceId_code: {
              sourceId: source.id,
              code: skill.code,
            },
          },
          data: {
            area: skill.area,
            subject: skill.subject,
            stage: skill.stage,
            description: skill.description,
            sourcePage: skill.sourcePage,
            sourceLocator:
              skill.sourceLocator,
            officialTextHash,
            searchText:
              normalizeForSearch(
                `${skill.code} ${skill.description}`
              ),
            isCurrent: false,
          },
        });
      }
    },
    {
      maxWait: 10_000,
      timeout: 120_000,
    }
  );
}

async function releasePdf(pdf) {
  if (
    pdf &&
    typeof pdf.destroy === "function"
  ) {
    await pdf.destroy();
    return;
  }

  if (
    pdf &&
    typeof pdf.cleanup === "function"
  ) {
    await pdf.cleanup();
  }
}

async function main() {
  const dryRun =
    process.argv.includes("--dry-run");

  console.log("");
  console.log(
    "================================================="
  );
  console.log(
    "BNCC - REPARO CONTROLADO DA FONTE IMPORTED"
  );
  console.log(
    "================================================="
  );
  console.log(
    `Modo: ${dryRun ? "DRY RUN" : "REPARO"}`
  );
  console.log("");

  const manifest = loadManifest();

  const source =
    await findImportedSource();

  await validateDatabaseQuarantine(
    source
  );

  console.log(
    `BnccSource: ${source.id}`
  );
  console.log(
    "Quarentena do banco: OK"
  );

  const bytes = await downloadPdf();

  console.log(
    `PDF oficial SHA-256: ${sha256(bytes)}`
  );

  const pdf = await loadPdf(bytes);

  try {
    if (pdf.numPages !== 600) {
      throw new Error(
        `PDF possui ${pdf.numPages} páginas; esperado=600.`
      );
    }

    const extracted =
      await parseAll(
        pdf,
        manifest
      );

    console.log(
      `Extração corrigida: ${extracted.length}/183`
    );
    console.log(
      "Fingerprints independentes: 183/183"
    );

    if (dryRun) {
      console.log("");
      console.log(
        "DRY RUN concluído. Nenhum registro foi alterado."
      );
      return;
    }

    await applyRepair(
      source,
      extracted
    );

    console.log("");
    console.log(
      "REPARO CONCLUÍDO."
    );
    console.log(
      "183 habilidades atualizadas preservando seus IDs."
    );
    console.log(
      "A fonte continua IMPORTED."
    );
    console.log(
      "Todas as habilidades continuam isCurrent=false."
    );
  } finally {
    await releasePdf(pdf);
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "ERRO NO REPARO BNCC"
    );
    console.error(
      error instanceof Error
        ? error.stack ?? error.message
        : error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
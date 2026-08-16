#!/usr/bin/env node

"use strict";

/**
 * Importador oficial da BNCC - Ensino Médio a partir do PDF canônico do MEC.
 *
 * Não depende de planilha.
 *
 * Estratégia de confiabilidade:
 * 1. baixa o PDF diretamente de basenacionalcomum.mec.gov.br;
 * 2. exige HTTPS + domínio oficial;
 * 3. exige assinatura %PDF;
 * 4. calcula SHA-256 do arquivo;
 * 5. lê somente os intervalos canônicos do Ensino Médio.
 *    O código diferencia página física do PDF (pdfjs 1-based)
 *    da numeração impressa no documento:
 *      LGG : impressas 491-497 | PDF físico 493-499
 *      LP  : impressas 506-526 | PDF físico 508-528
 *      MAT : impressas 533-541 | PDF físico 535-543
 *      CNT : impressas 555-560 | PDF físico 557-562
 *      CHS : impressas 572-579 | PDF físico 574-581
 * 6. aceita somente códigos oficiais com gramática conhecida;
 * 7. deriva área exclusivamente do código;
 * 8. não inventa disciplina para habilidades de área;
 * 9. associa PORTUGUES somente a EM13LPxx;
 * 10. registra página, localização e hash do texto;
 * 11. aborta antes de gravar se houver ambiguidade;
 * 12. exige códigos-sentinela das extremidades das seções;
 * 13. não usa IA em nenhuma etapa da importação.
 *
 * Uso:
 *   node scripts/bncc/import-official-pdf.cjs --dry-run
 *   node scripts/bncc/import-official-pdf.cjs
 *
 * Opcional:
 *   node scripts/bncc/import-official-pdf.cjs --pdf="C:\BNCC\BNCC.pdf" --dry-run
 *
 * O projeto precisa ter pdfjs-dist instalado.
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

loadProjectEnv();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const OFFICIAL_PDF_URL =
  "https://basenacionalcomum.mec.gov.br/images/BNCC_EI_EF_110518_versaofinal_site.pdf";

const OFFICIAL_PRIMARY_HOST = "basenacionalcomum.mec.gov.br";

// Fingerprint verificado da versão final atualmente usada pelo projeto.
// Se o MEC substituir o arquivo, a importação deve BLOQUEAR até nova auditoria.
const CANONICAL_PDF_SHA256 =
  "ad623d7b33986a4e87e1441a4e675064cd30db3650b86a75caefa476e802272b";

function isAllowedMecHost(hostname) {
  const normalized = String(hostname ?? "").trim().toLowerCase();

  return (
    normalized === "mec.gov.br" ||
    normalized.endsWith(".mec.gov.br")
  );
}

const CANONICAL_RANGES = [
  {
    key: "LINGUAGENS",
    pdfStartPage: 493,
    pdfEndPage: 499,
    printedStartPage: 491,
    printedEndPage: 497,
    prefixes: ["EM13LGG"],
    sentinels: ["EM13LGG101", "EM13LGG704"],
    expectedUniqueCodes: 28,
  },
  {
    key: "PORTUGUES",
    pdfStartPage: 508,
    pdfEndPage: 528,
    printedStartPage: 506,
    printedEndPage: 526,
    prefixes: ["EM13LP"],
    sentinels: ["EM13LP01", "EM13LP54"],
    expectedUniqueCodes: 54,
  },
  {
    key: "MATEMATICA",
    pdfStartPage: 535,
    pdfEndPage: 543,
    printedStartPage: 533,
    printedEndPage: 541,
    prefixes: ["EM13MAT"],
    sentinels: ["EM13MAT101", "EM13MAT511"],
    expectedUniqueCodes: 43,
  },
  {
    key: "CIENCIAS_DA_NATUREZA",
    pdfStartPage: 557,
    pdfEndPage: 562,
    printedStartPage: 555,
    printedEndPage: 560,
    prefixes: ["EM13CNT"],
    sentinels: ["EM13CNT101", "EM13CNT310"],
    expectedUniqueCodes: 26,
  },
  {
    key: "CIENCIAS_HUMANAS",
    pdfStartPage: 574,
    pdfEndPage: 581,
    printedStartPage: 572,
    printedEndPage: 579,
    prefixes: ["EM13CHS"],
    sentinels: ["EM13CHS101", "EM13CHS606"],
    expectedUniqueCodes: 32,
  },
];

const EXPECTED_TOTAL_UNIQUE_SKILLS = 183;

const SKILL_CODE_EXACT =
  /^(?:EM13(?:LGG|MAT|CNT|CHS)\d{3}|EM13LP\d{2})$/;

const SKILL_CODE_GLOBAL =
  /\b(?:EM13(?:LGG|MAT|CNT|CHS)\d{3}|EM13LP\d{2})\b/g;

const SUSPICIOUS_EM13_CODE_GLOBAL = /\bEM13[A-Z]{2,4}\d{2,3}\b/g;

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

function parseArgs(argv) {
  const args = argv.slice(2);

  const dryRun = args.includes("--dry-run");

  const pdfArg = args.find((arg) => arg.startsWith("--pdf="));
  const urlArg = args.find((arg) => arg.startsWith("--url="));
  const versionArg = args.find((arg) => arg.startsWith("--version="));

  return {
    dryRun,
    localPdf: pdfArg ? pdfArg.slice("--pdf=".length) : null,
    officialUrl: urlArg ? urlArg.slice("--url=".length) : OFFICIAL_PDF_URL,
    versionLabel: versionArg
      ? versionArg.slice("--version=".length)
      : "BNCC - Ensino Médio - versão final homologada",
  };
}

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\u00ad/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function normalizeForComparison(value) {
  return normalizeWhitespace(value)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForSearch(value) {
  return normalizeForComparison(value).toLowerCase();
}

function assertOfficialUrl(urlString) {
  const url = new URL(urlString);

  if (url.protocol !== "https:") {
    throw new Error("A fonte BNCC precisa usar HTTPS.");
  }

  if (!isAllowedMecHost(url.hostname)) {
    throw new Error(
      `Domínio não autorizado para fonte oficial: ${url.hostname}`
    );
  }

  if (
    url.hostname !== OFFICIAL_PRIMARY_HOST &&
    !url.hostname.endsWith(".mec.gov.br")
  ) {
    throw new Error(
      `Host de origem não reconhecido como infraestrutura oficial do MEC: ${url.hostname}`
    );
  }

  if (!url.pathname.toLowerCase().endsWith(".pdf")) {
    throw new Error("A URL oficial precisa apontar para um PDF.");
  }
}

async function fetchOfficialPdf(url) {
  assertOfficialUrl(url);

  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": "SENAI-Performance-BNCC-Importer/1.0",
      accept: "application/pdf,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Falha ao baixar BNCC do MEC: HTTP ${response.status}.`
    );
  }

  const finalUrl = new URL(response.url);

  if (!isAllowedMecHost(finalUrl.hostname)) {
    throw new Error(
      `O download foi redirecionado para domínio não autorizado: ${finalUrl.hostname}`
    );
  }

  if (finalUrl.protocol !== "https:") {
    throw new Error(
      `O redirecionamento final não usa HTTPS: ${finalUrl.protocol}`
    );
  }

  const bytes = Buffer.from(await response.arrayBuffer());

  assertPdfBytes(bytes);

  return {
    bytes,
    finalUrl: finalUrl.toString(),
  };
}

function assertPdfBytes(bytes) {
  if (bytes.length < 100_000) {
    throw new Error(
      `Arquivo pequeno demais para ser a BNCC oficial (${bytes.length} bytes).`
    );
  }

  const signature = bytes.subarray(0, 5).toString("ascii");

  if (signature !== "%PDF-") {
    throw new Error("O arquivo recebido não possui assinatura PDF válida.");
  }

  const eofTail = bytes
    .subarray(Math.max(0, bytes.length - 2048))
    .toString("latin1");

  if (!eofTail.includes("%%EOF")) {
    throw new Error(
      "O PDF recebido parece incompleto: marcador %%EOF não encontrado."
    );
  }
}

async function readPdfSource({ localPdf, officialUrl }) {
  if (localPdf) {
    const absolutePath = path.resolve(process.cwd(), localPdf);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`PDF não encontrado: ${absolutePath}`);
    }

    const bytes = fs.readFileSync(absolutePath);
    assertPdfBytes(bytes);

    return {
      bytes,
      sourceUrl: officialUrl,
      sourceDescription: absolutePath,
    };
  }

  console.log("Baixando o PDF diretamente do portal oficial do MEC...");
  const downloaded = await fetchOfficialPdf(officialUrl);

  return {
    bytes: downloaded.bytes,
    sourceUrl: downloaded.finalUrl,
    sourceDescription: downloaded.finalUrl,
  };
}

async function loadPdfDocument(bytes) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    disableWorker: true,
    useSystemFonts: true,
  });

  return loadingTask.promise;
}

/**
 * Reconstrói linhas usando coordenadas dos itens do PDF.
 * Isso é mais estável do que simplesmente concatenar todos os tokens.
 */
async function extractPageLines(pdf, pdfPageNumber) {
  // pdfjs-dist usa numeração física 1-based.
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
    }));

  const lines = [];

  const yTolerance = 2.5;

  for (const item of items) {
    let line = lines.find(
      (candidate) => Math.abs(candidate.y - item.y) <= yTolerance
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
        line.items.map((item) => item.text).join(" ")
      );
    })
    .filter(Boolean);
}

function findCodes(text) {
  return [...text.matchAll(SKILL_CODE_GLOBAL)].map(
    (match) => match[0]
  );
}

function findSuspiciousCodes(text) {
  return [...text.matchAll(SUSPICIOUS_EM13_CODE_GLOBAL)].map(
    (match) => match[0]
  );
}

function decodeSkillCode(code) {
  if (!SKILL_CODE_EXACT.test(code)) {
    throw new Error(`Código BNCC não reconhecido: ${code}`);
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

  if (code.startsWith("EM13CHS")) {
    return {
      area: "CIENCIAS_HUMANAS",
      subject: null,
    };
  }

  throw new Error(`Área não determinada para ${code}.`);
}

function lineContainsStopMarker(line) {
  const normalized = line.toUpperCase();

  return STOP_MARKERS.some((marker) =>
    normalized.includes(marker.toUpperCase())
  );
}

function cleanDescription(value) {
  let text = normalizeWhitespace(value);

  // Remove numeração de competência específica que aparece na coluna
  // lateral da tabela de Língua Portuguesa: "1", "1, 2", "1, 3" etc.
  text = text.replace(
    /\s+(?:[1-7](?:\s*,\s*[1-7])*)$/,
    ""
  );

  // Remove número de página isolado no final.
  text = text.replace(/\s+\d{3}$/, "");

  return normalizeWhitespace(text);
}

function isDescriptionPlausible(description) {
  if (description.length < 20) {
    return false;
  }

  if (!/[A-Za-zÀ-ÿ]/.test(description)) {
    return false;
  }

  return true;
}

/**
 * Extrai habilidades de uma página.
 *
 * O texto de uma habilidade começa no código e termina:
 * - antes do próximo código;
 * - antes de um marcador estrutural forte;
 * - no fim da página.
 */
function parseSkillsFromPage({
  pdfPageNumber,
  printedPageNumber,
  lines,
  allowedPrefixes,
}) {
  const occurrences = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    const recognized = [...new Set(findCodes(line))];

    const suspicious = [...new Set(findSuspiciousCodes(line))];

    const unsupported = suspicious.filter(
      (code) => !SKILL_CODE_EXACT.test(code)
    );

    if (unsupported.length > 0) {
      throw new Error(
        `Página impressa ${printedPageNumber}: código(s) EM13 não reconhecido(s): ${unsupported.join(
          ", "
        )}`
      );
    }

    if (recognized.length === 0) {
      continue;
    }

    if (recognized.length > 1) {
      throw new Error(
        `Página impressa ${printedPageNumber}, linha ${lineIndex + 1}: mais de um código na mesma linha: ${recognized.join(
          ", "
        )}`
      );
    }

    const code = recognized[0];

    if (!allowedPrefixes.some((prefix) => code.startsWith(prefix))) {
      throw new Error(
        `Página impressa ${printedPageNumber}: ${code} apareceu fora da seção canônica esperada.`
      );
    }

    occurrences.push({
      code,
      lineIndex,
    });
  }

  const skills = [];

  for (let occurrenceIndex = 0; occurrenceIndex < occurrences.length; occurrenceIndex++) {
    const occurrence = occurrences[occurrenceIndex];

    const nextOccurrence = occurrences[occurrenceIndex + 1];

    const segment = [];

    for (
      let lineIndex = occurrence.lineIndex;
      lineIndex < (nextOccurrence?.lineIndex ?? lines.length);
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

    const joined = normalizeWhitespace(segment.join(" "));

    const codeIndex = joined.indexOf(occurrence.code);

    if (codeIndex < 0) {
      throw new Error(
        `Falha interna ao localizar ${occurrence.code} na página ${pageNumber}.`
      );
    }

    let description = joined.slice(
      codeIndex + occurrence.code.length
    );

    description = description
      .replace(/^[\s()[\]{}:;–—-]+/, "");

    description = cleanDescription(description);

    if (!isDescriptionPlausible(description)) {
      throw new Error(
        `Página impressa ${printedPageNumber}: texto inválido/curto para ${occurrence.code}: "${description}"`
      );
    }

    const decoded = decodeSkillCode(occurrence.code);

    skills.push({
      code: occurrence.code,
      stage: "ENSINO_MEDIO",
      area: decoded.area,
      subject: decoded.subject,
      description,
      competencyCode: null,
      competencyText: null,
      sourcePage: printedPageNumber,
      sourceLocator: `PDF:impressa-p${printedPageNumber};fisica-p${pdfPageNumber}`,
      officialTextHash: sha256(
        Buffer.from(description, "utf8")
      ),
      searchText: normalizeForSearch(
        `${occurrence.code} ${description}`
      ),
      isCurrent: false,
    });
  }

  return skills;
}

async function parseCanonicalSkills(pdf) {
  const byCode = new Map();
  const issues = [];
  const rangeStats = [];

  for (const range of CANONICAL_RANGES) {
    const detectedCodes = new Set();
    let rawOccurrences = 0;

    const physicalPageCount =
      range.pdfEndPage - range.pdfStartPage;

    const printedPageCount =
      range.printedEndPage - range.printedStartPage;

    if (physicalPageCount !== printedPageCount) {
      issues.push(
        `${range.key}: mapeamento de páginas físicas/impressas inconsistente.`
      );
      continue;
    }

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
        pdfPageNumber
      );

      let pageSkills;

      try {
        pageSkills = parseSkillsFromPage({
          pdfPageNumber,
          printedPageNumber,
          lines,
          allowedPrefixes: range.prefixes,
        });
      } catch (error) {
        issues.push(
          error instanceof Error
            ? error.message
            : String(error)
        );

        continue;
      }

      for (const skill of pageSkills) {
        rawOccurrences++;
        detectedCodes.add(skill.code);

        const existing = byCode.get(skill.code);

        if (!existing) {
          byCode.set(skill.code, skill);
          continue;
        }

        const existingText = normalizeForComparison(
          existing.description
        );

        const incomingText = normalizeForComparison(
          skill.description
        );

        if (existingText !== incomingText) {
          issues.push(
            `${skill.code} apareceu com textos divergentes em ` +
              `${existing.sourceLocator} e ${skill.sourceLocator}.`
          );
        }
      }
    }

    for (const sentinel of range.sentinels) {
      if (!detectedCodes.has(sentinel)) {
        issues.push(
          `Código-sentinela ausente em ${range.key}: ${sentinel}.`
        );
      }
    }

    if (
      detectedCodes.size !== range.expectedUniqueCodes
    ) {
      issues.push(
        `${range.key}: quantidade inesperada de habilidades. ` +
          `Esperado=${range.expectedUniqueCodes}; detectado=${detectedCodes.size}.`
      );
    }

    rangeStats.push({
      key: range.key,
      pdfStartPage: range.pdfStartPage,
      pdfEndPage: range.pdfEndPage,
      printedStartPage: range.printedStartPage,
      printedEndPage: range.printedEndPage,
      rawOccurrences,
      uniqueCodes: detectedCodes.size,
      expectedUniqueCodes: range.expectedUniqueCodes,
    });
  }

  const skills = [...byCode.values()].sort((a, b) =>
    a.code.localeCompare(b.code)
  );

  if (skills.length !== EXPECTED_TOTAL_UNIQUE_SKILLS) {
    issues.push(
      `Total inesperado de habilidades do Ensino Médio. ` +
        `Esperado=${EXPECTED_TOTAL_UNIQUE_SKILLS}; detectado=${skills.length}.`
    );
  }

  return {
    skills,
    issues,
    rangeStats,
  };
}

function validateFinalDataset(skills) {
  const issues = [];

  if (skills.length === 0) {
    issues.push("Nenhuma habilidade foi extraída.");
    return issues;
  }

  const allSentinels = CANONICAL_RANGES.flatMap(
    (range) => range.sentinels
  );

  const codes = new Set(skills.map((skill) => skill.code));

  for (const sentinel of allSentinels) {
    if (!codes.has(sentinel)) {
      issues.push(`Sentinela global ausente: ${sentinel}.`);
    }
  }

  for (const skill of skills) {
    if (!SKILL_CODE_EXACT.test(skill.code)) {
      issues.push(`Código inválido no dataset final: ${skill.code}.`);
    }

    const decoded = decodeSkillCode(skill.code);

    if (skill.area !== decoded.area) {
      issues.push(
        `${skill.code}: área divergente da gramática do código.`
      );
    }

    if (skill.subject !== decoded.subject) {
      issues.push(
        `${skill.code}: disciplina divergente da gramática do código.`
      );
    }

    if (!isDescriptionPlausible(skill.description)) {
      issues.push(
        `${skill.code}: descrição final inválida.`
      );
    }

    if (
      skill.subject &&
      skill.subject !== "PORTUGUES"
    ) {
      issues.push(
        `${skill.code}: importador não pode inferir ${skill.subject} como disciplina.`
      );
    }
  }

  return issues;
}

function printSummary({
  sourceDescription,
  sourceSha256,
  parsed,
  dryRun,
  totalPdfPages,
}) {
  console.log("");
  console.log("=================================================");
  console.log("BNCC - IMPORTADOR OFICIAL PDF - ENSINO MÉDIO");
  console.log("=================================================");
  console.log(`Fonte: ${sourceDescription}`);
  console.log(`SHA-256: ${sourceSha256}`);
  console.log(`Páginas no PDF: ${totalPdfPages}`);
  console.log(`Modo: ${dryRun ? "DRY RUN" : "IMPORTAÇÃO"}`);
  console.log("");

  for (const stat of parsed.rangeStats) {
    console.log(
      `${stat.key}: páginas impressas ${stat.printedStartPage}-${stat.printedEndPage} | ` +
        `PDF físico ${stat.pdfStartPage}-${stat.pdfEndPage} | ` +
        `${stat.uniqueCodes}/${stat.expectedUniqueCodes} código(s)`
    );
  }

  console.log("");
  console.log(
    `Total de habilidades únicas: ${parsed.skills.length}`
  );

  const counts = new Map();

  for (const skill of parsed.skills) {
    const key =
      skill.subject === "PORTUGUES"
        ? "PORTUGUES"
        : skill.area;

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  for (const [key, count] of counts.entries()) {
    console.log(`- ${key}: ${count}`);
  }

  console.log("");
}

async function importDataset({
  sourceSha256,
  sourceUrl,
  versionLabel,
  skills,
}) {
  const existing = await prisma.bnccSource.findUnique({
    where: {
      sha256: sourceSha256,
    },
    include: {
      _count: {
        select: {
          skills: true,
        },
      },
    },
  });

  if (existing) {
    console.log(
      `Fonte já cadastrada: ${existing.id} | ` +
        `${existing.status} | ${existing._count.skills} habilidade(s).`
    );

    return existing;
  }

  return prisma.$transaction(
    async (tx) => {
      const source = await tx.bnccSource.create({
        data: {
          title: "Base Nacional Comum Curricular - Ensino Médio",
          publisher: "Ministério da Educação (MEC)",
          type: "OFFICIAL_PDF",

          /**
           * A origem foi verificada, mas mantemos IMPORTED porque
           * ainda faremos a segunda verificação de integridade do
           * dataset antes de liberar para IA.
           */
          status: "IMPORTED",

          officialUrl: sourceUrl,
          storageKey: null,
          versionLabel,
          publishedAt: null,
          retrievedAt: new Date(),
          verifiedAt: null,
          sha256: sourceSha256,
        },
      });

      const batchSize = 200;

      for (
        let index = 0;
        index < skills.length;
        index += batchSize
      ) {
        const batch = skills.slice(
          index,
          index + batchSize
        );

        await tx.bnccSkill.createMany({
          data: batch.map((skill) => ({
            sourceId: source.id,
            code: skill.code,
            stage: skill.stage,
            area: skill.area,
            subject: skill.subject,
            description: skill.description,
            competencyCode: skill.competencyCode,
            competencyText: skill.competencyText,
            sourcePage: skill.sourcePage,
            sourceLocator: skill.sourceLocator,
            officialTextHash: skill.officialTextHash,
            searchText: skill.searchText,

            /**
             * Só ficará true após a etapa de verificação.
             */
            isCurrent: false,
          })),
        });
      }

      return source;
    },
    {
      maxWait: 10_000,
      timeout: 60_000,
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
  const args = parseArgs(process.argv);

  const source = await readPdfSource({
    localPdf: args.localPdf,
    officialUrl: args.officialUrl,
  });

  const sourceSha256 = sha256(source.bytes);

  if (sourceSha256 !== CANONICAL_PDF_SHA256) {
    throw new Error(
      "O PDF oficial recebido possui um SHA-256 diferente da versão canônica " +
        "já auditada pelo projeto.\n" +
        `Esperado: ${CANONICAL_PDF_SHA256}\n` +
        `Recebido: ${sourceSha256}\n` +
        "A importação foi bloqueada. Verifique se o MEC publicou uma nova versão " +
        "antes de atualizar o fingerprint."
    );
  }

  const pdf = await loadPdfDocument(source.bytes);

  try {
    if (pdf.numPages !== 600) {
      throw new Error(
        `Quantidade de páginas divergente da versão canônica: ${pdf.numPages}. ` +
          "Esperado: 600."
      );
    }

    const parsed = await parseCanonicalSkills(pdf);

    const finalIssues = validateFinalDataset(
      parsed.skills
    );

    parsed.issues.push(...finalIssues);

    printSummary({
      sourceDescription: source.sourceDescription,
      sourceSha256,
      parsed,
      dryRun: args.dryRun,
      totalPdfPages: pdf.numPages,
    });

    if (parsed.issues.length > 0) {
      console.error("IMPORTAÇÃO BLOQUEADA.");
      console.error("");
      console.error(
        "Foram encontradas inconsistências. " +
          "Nenhum registro foi escrito no banco:"
      );
      console.error("");

      for (const issue of parsed.issues.slice(0, 100)) {
        console.error(`- ${issue}`);
      }

      if (parsed.issues.length > 100) {
        console.error(
          `... mais ${
            parsed.issues.length - 100
          } ocorrência(s).`
        );
      }

      process.exitCode = 1;
      return;
    }

    console.log("Validação estrutural do PDF: OK");
    console.log("");

    if (args.dryRun) {
      console.log(
        "DRY RUN concluído. Nenhum dado foi gravado."
      );
      return;
    }

    const importedSource = await importDataset({
      sourceSha256,
      sourceUrl: source.sourceUrl,
      versionLabel: args.versionLabel,
      skills: parsed.skills,
    });

    console.log("");
    console.log("Importação concluída.");
    console.log(`BnccSource: ${importedSource.id}`);
    console.log(`Status: ${importedSource.status}`);
    console.log("");
    console.log(
      "A fonte permanece IMPORTED e as habilidades " +
        "isCurrent=false até a etapa final de verificação."
    );
  } finally {
    await releasePdf(pdf);
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("ERRO NO IMPORTADOR BNCC");
    console.error(
      error instanceof Error ? error.stack ?? error.message : error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

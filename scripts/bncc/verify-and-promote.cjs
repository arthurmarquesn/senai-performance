#!/usr/bin/env node

"use strict";

/**
 * Verificador textual + promoção segura da base BNCC.
 *
 * IMPORTANTE:
 * - este script NÃO reusa a lógica de extração do importador;
 * - compara o banco contra um manifesto de fingerprints textuais
 *   produzido por um segundo motor de PDF (PyMuPDF);
 * - o manifesto contém apenas hashes/metadados, não o texto da BNCC;
 * - o manifesto é protegido por SHA-256 embutido neste arquivo;
 * - o PDF oficial é baixado novamente e seu SHA-256 também precisa
 *   corresponder à versão canônica.
 *
 * Uso seguro:
 *
 *   1) Verificar sem alterar nada:
 *      node scripts/bncc/verify-and-promote.cjs
 *
 *   2) Somente se 183/183 passarem:
 *      node scripts/bncc/verify-and-promote.cjs --promote
 *
 * Opcional:
 *      node scripts/bncc/verify-and-promote.cjs --source-id=<id>
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

loadProjectEnv();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const CANONICAL_PDF_URL =
  "https://basenacionalcomum.mec.gov.br/images/BNCC_EI_EF_110518_versaofinal_site.pdf";

const CANONICAL_PDF_SHA256 =
  "ad623d7b33986a4e87e1441a4e675064cd30db3650b86a75caefa476e802272b";

const EXPECTED_MANIFEST_CANONICAL_SHA256 =
  "989e74ad629886ce53eec45f238efbaff49bab767f47c010f6d4d273f279135d";

const EXPECTED_SKILL_COUNT = 183;

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

  const sourceArg = args.find((arg) =>
    arg.startsWith("--source-id=")
  );

  return {
    promote: args.includes("--promote"),
    sourceId: sourceArg
      ? sourceArg.slice("--source-id=".length)
      : null,
  };
}

function sha256(input) {
  return crypto
    .createHash("sha256")
    .update(input)
    .digest("hex");
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

async function downloadCanonicalPdf() {
  const originalUrl = new URL(CANONICAL_PDF_URL);

  if (
    originalUrl.protocol !== "https:" ||
    !isAllowedMecHost(originalUrl.hostname)
  ) {
    throw new Error(
      "URL canônica da BNCC não está em infraestrutura HTTPS do MEC."
    );
  }

  const response = await fetch(CANONICAL_PDF_URL, {
    redirect: "follow",
    headers: {
      "user-agent": "SENAI-Performance-BNCC-Verifier/1.0",
      accept: "application/pdf,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Falha ao baixar a BNCC oficial: HTTP ${response.status}.`
    );
  }

  const finalUrl = new URL(response.url);

  if (
    finalUrl.protocol !== "https:" ||
    !isAllowedMecHost(finalUrl.hostname)
  ) {
    throw new Error(
      `Redirecionamento não autorizado: ${finalUrl.toString()}`
    );
  }

  const bytes = Buffer.from(
    await response.arrayBuffer()
  );

  if (
    bytes.subarray(0, 5).toString("ascii") !== "%PDF-"
  ) {
    throw new Error(
      "A resposta do MEC não possui assinatura PDF."
    );
  }

  const actualSha = sha256(bytes);

  if (actualSha !== CANONICAL_PDF_SHA256) {
    throw new Error(
      "O PDF disponível no MEC mudou em relação à versão " +
        "canônica auditada.\n" +
        `Esperado: ${CANONICAL_PDF_SHA256}\n` +
        `Recebido: ${actualSha}\n` +
        "Nenhuma promoção foi realizada."
    );
  }

  return {
    finalUrl: finalUrl.toString(),
    sha256: actualSha,
    byteLength: bytes.length,
  };
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

function loadManifest() {
  const manifestPath = path.join(
    __dirname,
    "bncc-canonical-manifest.json"
  );

  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Manifesto canônico não encontrado: ${manifestPath}`
    );
  }

  const bytes = fs.readFileSync(manifestPath);

  let manifest;

  try {
    manifest = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(
      "O manifesto canônico não contém JSON válido."
    );
  }

  /**
   * O hash protege o CONTEÚDO do manifesto, não a formatação do arquivo.
   * Isso evita falsos negativos quando Windows converte LF -> CRLF ou
   * remove/adiciona a quebra de linha final.
   */
  const canonicalBytes = Buffer.from(
    stableStringify(manifest),
    "utf8"
  );

  const actualManifestCanonicalSha =
    sha256(canonicalBytes);

  if (
    actualManifestCanonicalSha !==
    EXPECTED_MANIFEST_CANONICAL_SHA256
  ) {
    throw new Error(
      "O conteúdo do manifesto canônico foi alterado.\n" +
        `Esperado: ${EXPECTED_MANIFEST_CANONICAL_SHA256}\n` +
        `Recebido: ${actualManifestCanonicalSha}`
    );
  }

  if (
    manifest?.schemaVersion !== 1 ||
    manifest?.source?.sha256 !== CANONICAL_PDF_SHA256 ||
    manifest?.verification?.expectedSkillCount !==
      EXPECTED_SKILL_COUNT ||
    !Array.isArray(manifest?.skills) ||
    manifest.skills.length !== EXPECTED_SKILL_COUNT
  ) {
    throw new Error(
      "Estrutura do manifesto canônico é inválida."
    );
  }

  const codes = new Set();

  for (const skill of manifest.skills) {
    if (!skill?.code || codes.has(skill.code)) {
      throw new Error(
        `Código inválido/duplicado no manifesto: ${skill?.code}`
      );
    }

    codes.add(skill.code);
  }

  return manifest;
}

/**
 * Normalização usada SOMENTE para a comparação independente.
 *
 * Ela ignora diferenças de apresentação que não alteram o texto:
 * - quebras de linha;
 * - soft hyphen;
 * - hifenização causada por quebra física de linha;
 * - caixa;
 * - pontuação.
 *
 * Depois disso, a comparação é SHA-256 do fluxo lexical inteiro.
 * Uma habilidade truncada, acrescida ou com palavras alteradas não passa.
 */
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
    hash: sha256(
      Buffer.from(normalized, "utf8")
    ),
    tokenCount:
      normalized.length === 0
        ? 0
        : normalized.split(" ").length,
  };
}

function expectedSourceLocator(skill) {
  return (
    `PDF:impressa-p${skill.printedPage};` +
    `fisica-p${skill.physicalPage}`
  );
}

async function findSource(sourceId) {
  if (sourceId) {
    const source =
      await prisma.bnccSource.findUnique({
        where: {
          id: sourceId,
        },
      });

    if (!source) {
      throw new Error(
        `BnccSource não encontrada: ${sourceId}`
      );
    }

    return source;
  }

  const source =
    await prisma.bnccSource.findUnique({
      where: {
        sha256: CANONICAL_PDF_SHA256,
      },
    });

  if (!source) {
    throw new Error(
      "Nenhuma BnccSource encontrada para o SHA-256 canônico."
    );
  }

  return source;
}

function pushIssue(issues, code, message) {
  issues.push({
    code,
    message,
  });
}

async function verifyDatabase({
  source,
  manifest,
}) {
  const issues = [];

  if (source.sha256 !== CANONICAL_PDF_SHA256) {
    pushIssue(
      issues,
      "SOURCE",
      `SHA da BnccSource divergente: ${source.sha256}`
    );
  }

  if (source.type !== "OFFICIAL_PDF") {
    pushIssue(
      issues,
      "SOURCE",
      `Tipo da fonte deveria ser OFFICIAL_PDF; atual=${source.type}`
    );
  }

  if (
    source.status !== "IMPORTED" &&
    source.status !== "VERIFIED"
  ) {
    pushIssue(
      issues,
      "SOURCE",
      `Status inesperado: ${source.status}`
    );
  }

  const dbSkills = await prisma.bnccSkill.findMany({
    where: {
      sourceId: source.id,
    },
    orderBy: {
      code: "asc",
    },
  });

  if (
    dbSkills.length !== EXPECTED_SKILL_COUNT
  ) {
    pushIssue(
      issues,
      "DATASET",
      `Quantidade no banco: ${dbSkills.length}; esperado=${EXPECTED_SKILL_COUNT}`
    );
  }

  const dbByCode = new Map(
    dbSkills.map((skill) => [
      skill.code,
      skill,
    ])
  );

  const manifestCodes = new Set(
    manifest.skills.map((skill) => skill.code)
  );

  for (const dbSkill of dbSkills) {
    if (!manifestCodes.has(dbSkill.code)) {
      pushIssue(
        issues,
        dbSkill.code,
        "Código existe no banco, mas não no manifesto canônico."
      );
    }
  }

  let passed = 0;

  for (const expected of manifest.skills) {
    const actual = dbByCode.get(
      expected.code
    );

    if (!actual) {
      pushIssue(
        issues,
        expected.code,
        "Habilidade ausente no banco."
      );
      continue;
    }

    const beforeIssueCount = issues.length;

    if (actual.stage !== "ENSINO_MEDIO") {
      pushIssue(
        issues,
        expected.code,
        `stage=${actual.stage}; esperado=ENSINO_MEDIO`
      );
    }

    if (actual.area !== expected.area) {
      pushIssue(
        issues,
        expected.code,
        `area=${actual.area}; esperado=${expected.area}`
      );
    }

    const actualSubject =
      actual.subject ?? null;

    const expectedSubject =
      expected.subject ?? null;

    if (
      actualSubject !== expectedSubject
    ) {
      pushIssue(
        issues,
        expected.code,
        `subject=${actualSubject}; esperado=${expectedSubject}`
      );
    }

    if (
      actual.sourcePage !==
      expected.printedPage
    ) {
      pushIssue(
        issues,
        expected.code,
        `sourcePage=${actual.sourcePage}; esperado=${expected.printedPage}`
      );
    }

    const locator =
      expectedSourceLocator(expected);

    if (
      actual.sourceLocator !== locator
    ) {
      pushIssue(
        issues,
        expected.code,
        `sourceLocator="${actual.sourceLocator}"; esperado="${locator}"`
      );
    }

    const rawDescriptionHash =
      sha256(
        Buffer.from(
          String(actual.description),
          "utf8"
        )
      );

    if (
      actual.officialTextHash !==
      rawDescriptionHash
    ) {
      pushIssue(
        issues,
        expected.code,
        "officialTextHash não corresponde ao texto atualmente armazenado."
      );
    }

    const lexical = lexicalFingerprint(
      actual.description
    );

    if (
      lexical.hash !==
      expected.lexicalHash
    ) {
      pushIssue(
        issues,
        expected.code,
        "Fingerprint textual divergente. " +
          `tokens banco=${lexical.tokenCount}, ` +
          `tokens canônico=${expected.tokenCount}, ` +
          `hash banco=${lexical.hash}, ` +
          `hash canônico=${expected.lexicalHash}`
      );
    }

    if (
      lexical.tokenCount !==
      expected.tokenCount
    ) {
      pushIssue(
        issues,
        expected.code,
        `Contagem lexical divergente: banco=${lexical.tokenCount}, ` +
          `canônico=${expected.tokenCount}`
      );
    }

    if (
      source.status !== "VERIFIED" &&
      actual.isCurrent
    ) {
      pushIssue(
        issues,
        expected.code,
        "Habilidade está isCurrent=true antes da fonte ser VERIFIED."
      );
    }

    if (
      issues.length === beforeIssueCount
    ) {
      passed++;
    }
  }

  return {
    issues,
    passed,
    total: manifest.skills.length,
    dbSkills,
  };
}

async function promoteAtomically({
  source,
  manifest,
}) {
  const codes = manifest.skills.map(
    (skill) => skill.code
  );

  const now = new Date();

  await prisma.$transaction(
    async (tx) => {
      /**
       * Garante que, para os mesmos códigos canônicos,
       * uma versão antiga não permaneça marcada como atual.
       */
      await tx.bnccSkill.updateMany({
        where: {
          sourceId: {
            not: source.id,
          },
          code: {
            in: codes,
          },
        },
        data: {
          isCurrent: false,
        },
      });

      await tx.bnccSkill.updateMany({
        where: {
          sourceId: source.id,
          code: {
            in: codes,
          },
        },
        data: {
          isCurrent: true,
        },
      });

      await tx.bnccSource.update({
        where: {
          id: source.id,
        },
        data: {
          status: "VERIFIED",
          verifiedAt: now,
        },
      });
    },
    {
      maxWait: 10_000,
      timeout: 60_000,
    }
  );

  const verifiedCount =
    await prisma.bnccSkill.count({
      where: {
        sourceId: source.id,
        isCurrent: true,
        source: {
          status: "VERIFIED",
        },
      },
    });

  if (
    verifiedCount !== EXPECTED_SKILL_COUNT
  ) {
    throw new Error(
      "Pós-condição da promoção falhou: " +
        `current+verified=${verifiedCount}; ` +
        `esperado=${EXPECTED_SKILL_COUNT}`
    );
  }

  return {
    verifiedAt: now,
    verifiedCount,
  };
}

function printIssues(issues) {
  for (const issue of issues.slice(0, 100)) {
    console.error(
      `- [${issue.code}] ${issue.message}`
    );
  }

  if (issues.length > 100) {
    console.error(
      `... e mais ${issues.length - 100} inconsistência(s).`
    );
  }
}

async function main() {
  const args = parseArgs(process.argv);

  console.log("");
  console.log(
    "================================================="
  );
  console.log(
    "BNCC - VERIFICAÇÃO TEXTUAL INDEPENDENTE V3"
  );
  console.log(
    "================================================="
  );

  const manifest = loadManifest();

  console.log(
    `Manifesto: ${manifest.skills.length} habilidades`
  );
  console.log(
    `SHA canônico do conteúdo do manifesto: ${EXPECTED_MANIFEST_CANONICAL_SHA256}`
  );
  console.log("");

  console.log(
    "Revalidando o arquivo atualmente publicado pelo MEC..."
  );

  const remotePdf =
    await downloadCanonicalPdf();

  console.log(
    `PDF oficial: ${remotePdf.sha256}`
  );
  console.log(
    `URL final: ${remotePdf.finalUrl}`
  );
  console.log("");

  const source = await findSource(
    args.sourceId
  );

  console.log(`BnccSource: ${source.id}`);
  console.log(`Status atual: ${source.status}`);
  console.log(`SHA no banco: ${source.sha256}`);
  console.log("");

  const verification =
    await verifyDatabase({
      source,
      manifest,
    });

  console.log(
    `Verificação textual: ${verification.passed}/${verification.total}`
  );

  if (
    verification.issues.length > 0
  ) {
    console.error("");
    console.error(
      "VERIFICAÇÃO BLOQUEADA."
    );
    console.error(
      "Nenhuma promoção foi realizada."
    );
    console.error("");

    printIssues(
      verification.issues
    );

    process.exitCode = 1;
    return;
  }

  console.log(
    "Integridade estrutural do banco: OK"
  );
  console.log(
    "Integridade textual 183/183: OK"
  );
  console.log(
    "Proveniência e páginas 183/183: OK"
  );
  console.log("");

  if (!args.promote) {
    console.log(
      "MODO VERIFICAÇÃO: nenhuma alteração foi feita."
    );
    console.log("");
    console.log(
      "Se quiser promover esta fonte após revisar este resultado:"
    );
    console.log(
      "node scripts/bncc/verify-and-promote.cjs --promote"
    );
    return;
  }

  const promoted =
    await promoteAtomically({
      source,
      manifest,
    });

  console.log(
    "PROMOÇÃO CONCLUÍDA."
  );
  console.log(
    `BnccSource.status = VERIFIED`
  );
  console.log(
    `BnccSkill.isCurrent = true: ${promoted.verifiedCount}/${EXPECTED_SKILL_COUNT}`
  );
  console.log(
    `verifiedAt = ${promoted.verifiedAt.toISOString()}`
  );
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "ERRO NO VERIFICADOR BNCC"
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
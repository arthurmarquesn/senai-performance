#!/usr/bin/env node

"use strict";

/**
 * AUDITORIA DE FIDELIDADE TEXTUAL DA BNCC
 *
 * - Não altera o banco.
 * - Revalida o PDF oficial.
 * - Exige fonte VERIFIED + 183 habilidades current.
 * - Confirma 183/183 fingerprints lexicais.
 * - Compara o texto armazenado com uma segunda extração independente
 *   que preserva os limites entre palavras.
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

const MANIFEST_SEMANTIC_SHA256 =
  "6c833f70862783e4f63a0769bd14a4b66d7e2193e70d4ad144dbe7e6a187b6fd";

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
  return crypto
    .createHash("sha256")
    .update(input)
    .digest("hex");
}

function stableStringify(value) {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value
      .map((item) => stableStringify(item))
      .join(",")}]`;
  }

  const keys = Object.keys(value).sort();

  return `{${keys
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableStringify(
          value[key]
        )}`
    )
    .join(",")}}`;
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
  const normalized =
    normalizeLexically(value);

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

function normalizeForSearch(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\u00ad/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadManifest() {
  const manifestPath = path.join(
    __dirname,
    "bncc-text-fidelity-manifest.json"
  );

  const manifest = JSON.parse(
    fs.readFileSync(
      manifestPath,
      "utf8"
    )
  );

  const semanticSha = sha256(
    Buffer.from(
      stableStringify(manifest),
      "utf8"
    )
  );

  if (
    semanticSha !==
    MANIFEST_SEMANTIC_SHA256
  ) {
    throw new Error(
      [
        "Manifesto de fidelidade textual foi alterado.",
        `Recebido=${semanticSha}`,
        `esperado=${MANIFEST_SEMANTIC_SHA256}`,
      ].join(" ")
    );
  }

  if (
    manifest?.source?.sha256 !==
      CANONICAL_PDF_SHA256 ||
    manifest?.skills?.length !==
      EXPECTED_SKILL_COUNT
  ) {
    throw new Error(
      "Estrutura do manifesto de fidelidade textual inválida."
    );
  }

  const codes = new Set(
    manifest.skills.map(
      (skill) => skill.code
    )
  );

  if (
    codes.size !==
    EXPECTED_SKILL_COUNT
  ) {
    throw new Error(
      "Manifesto possui códigos duplicados."
    );
  }

  for (const skill of manifest.skills) {
    const fingerprint =
      lexicalFingerprint(
        skill.canonicalDescription
      );

    if (
      fingerprint.hash !==
        skill.lexicalHash ||
      fingerprint.tokenCount !==
        skill.tokenCount
    ) {
      throw new Error(
        `${skill.code}: fingerprint lexical do manifesto não fecha.`
      );
    }

    const exactHash = sha256(
      Buffer.from(
        skill.canonicalDescription,
        "utf8"
      )
    );

    if (
      exactHash !==
      skill.canonicalTextHash
    ) {
      throw new Error(
        `${skill.code}: hash textual exato do manifesto não fecha.`
      );
    }
  }

  return manifest;
}

async function downloadOfficialPdf() {
  const response = await fetch(
    OFFICIAL_PDF_URL,
    {
      redirect: "follow",
      headers: {
        "user-agent":
          "senai-performance-bncc-text-fidelity/1.0",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Falha ao baixar PDF oficial: HTTP ${response.status}`
    );
  }

  const finalUrl = new URL(
    response.url
  );

  const host =
    finalUrl.hostname.toLowerCase();

  if (
    finalUrl.protocol !== "https:" ||
    !(
      host === "mec.gov.br" ||
      host.endsWith(".mec.gov.br")
    )
  ) {
    throw new Error(
      `Redirect fora do domínio oficial MEC: ${response.url}`
    );
  }

  const bytes = Buffer.from(
    await response.arrayBuffer()
  );

  const actualSha = sha256(bytes);

  if (
    actualSha !==
    CANONICAL_PDF_SHA256
  ) {
    throw new Error(
      [
        "O PDF atualmente publicado pelo MEC mudou.",
        `SHA atual=${actualSha}`,
        `SHA auditado=${CANONICAL_PDF_SHA256}`,
        "Processo bloqueado até nova auditoria humana.",
      ].join(" ")
    );
  }

  return {
    sha256: actualSha,
    finalUrl: response.url,
  };
}

async function loadVerifiedSource() {
  const source =
    await prisma.bnccSource.findUnique({
      where: {
        sha256:
          CANONICAL_PDF_SHA256,
      },
      select: {
        id: true,
        title: true,
        publisher: true,
        status: true,
        officialUrl: true,
        sha256: true,
        verifiedAt: true,
      },
    });

  if (!source) {
    throw new Error(
      "BnccSource canônica não encontrada no banco."
    );
  }

  if (
    source.status !== "VERIFIED"
  ) {
    throw new Error(
      `BnccSource.status=${source.status}; esperado=VERIFIED.`
    );
  }

  return source;
}

async function loadSourceSkills(
  sourceId
) {
  const skills =
    await prisma.bnccSkill.findMany({
      where: {
        sourceId,
      },
      orderBy: {
        code: "asc",
      },
      select: {
        id: true,
        sourceId: true,
        code: true,
        stage: true,
        area: true,
        subject: true,
        description: true,
        sourcePage: true,
        sourceLocator: true,
        officialTextHash: true,
        searchText: true,
        isCurrent: true,
        _count: {
          select: {
            journeyLinks: true,
            activityLinks: true,
          },
        },
      },
    });

  if (
    skills.length !==
    EXPECTED_SKILL_COUNT
  ) {
    throw new Error(
      `Banco possui ${skills.length} habilidades para a fonte; esperado=183.`
    );
  }

  const notCurrent =
    skills.filter(
      (skill) =>
        skill.isCurrent !== true
    );

  if (notCurrent.length > 0) {
    throw new Error(
      `${notCurrent.length} habilidade(s) da fonte não estão isCurrent=true.`
    );
  }

  return skills;
}

function inspectDatabaseAgainstManifest(
  skills,
  manifest
) {
  const expectedByCode = new Map(
    manifest.skills.map(
      (skill) => [
        skill.code,
        skill,
      ]
    )
  );

  const issues = [];
  const textMismatches = [];
  let lexicalOk = 0;
  let exactOk = 0;
  let metadataOk = 0;

  for (const skill of skills) {
    const expected =
      expectedByCode.get(
        skill.code
      );

    if (!expected) {
      issues.push(
        `${skill.code}: código ausente no manifesto.`
      );
      continue;
    }

    const metadataMatches =
      skill.stage ===
        expected.stage &&
      skill.area ===
        expected.area &&
      (skill.subject ?? null) ===
        (expected.subject ?? null) &&
      skill.sourcePage ===
        expected.printedPage &&
      skill.sourceLocator ===
        expected.sourceLocator;

    if (metadataMatches) {
      metadataOk++;
    } else {
      issues.push(
        `${skill.code}: metadados/proveniência divergentes.`
      );
    }

    const lexical =
      lexicalFingerprint(
        skill.description
      );

    const lexicalMatches =
      lexical.hash ===
        expected.lexicalHash &&
      lexical.tokenCount ===
        expected.tokenCount;

    if (lexicalMatches) {
      lexicalOk++;
    } else {
      issues.push(
        `${skill.code}: conteúdo lexical divergiu do canônico.`
      );
    }

    const currentExactHash = sha256(
      Buffer.from(
        skill.description,
        "utf8"
      )
    );

    const storedHashMatches =
      skill.officialTextHash ===
      currentExactHash;

    if (!storedHashMatches) {
      issues.push(
        `${skill.code}: officialTextHash não corresponde à descrição armazenada.`
      );
    }

    const exactMatches =
      currentExactHash ===
      expected.canonicalTextHash;

    if (exactMatches) {
      exactOk++;
    } else {
      textMismatches.push({
        id: skill.id,
        code: skill.code,
        currentDescription:
          skill.description,
        canonicalDescription:
          expected.canonicalDescription,
        currentExactHash,
        canonicalTextHash:
          expected.canonicalTextHash,
        lexicalMatches,
        links:
          skill._count.journeyLinks +
          skill._count.activityLinks,
      });
    }
  }

  if (
    expectedByCode.size !==
    skills.length
  ) {
    issues.push(
      "Conjunto de códigos do banco não corresponde integralmente ao manifesto."
    );
  }

  return {
    issues,
    textMismatches,
    lexicalOk,
    exactOk,
    metadataOk,
  };
}

function preview(value, max = 220) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  return text.length <= max
    ? text
    : `${text.slice(
        0,
        max
      )}…`;
}


async function main() {
  console.log("");
  console.log(
    "================================================="
  );
  console.log(
    "BNCC - AUDITORIA DE FIDELIDADE TEXTUAL"
  );
  console.log(
    "================================================="
  );
  console.log("");

  const manifest =
    loadManifest();

  console.log(
    `Manifesto: ${manifest.skills.length} habilidades`
  );
  console.log(
    `SHA semântico do manifesto: ${MANIFEST_SEMANTIC_SHA256}`
  );

  console.log("");
  console.log(
    "Revalidando o PDF atualmente publicado pelo MEC..."
  );

  const pdf =
    await downloadOfficialPdf();

  console.log(
    `PDF oficial SHA-256: ${pdf.sha256}`
  );
  console.log(
    `URL final: ${pdf.finalUrl}`
  );

  const source =
    await loadVerifiedSource();

  console.log("");
  console.log(
    `BnccSource: ${source.id}`
  );
  console.log(
    `Status: ${source.status}`
  );

  const skills =
    await loadSourceSkills(
      source.id
    );

  const result =
    inspectDatabaseAgainstManifest(
      skills,
      manifest
    );

  console.log("");
  console.log(
    `Integridade estrutural/proveniência: ${result.metadataOk}/183`
  );
  console.log(
    `Integridade lexical: ${result.lexicalOk}/183`
  );
  console.log(
    `Fidelidade textual exata: ${result.exactOk}/183`
  );

  if (
    result.issues.length > 0
  ) {
    console.log("");
    console.log(
      "PROBLEMAS DE INTEGRIDADE:"
    );

    for (const issue of result.issues) {
      console.log(
        `- ${issue}`
      );
    }
  }

  if (
    result.textMismatches.length > 0
  ) {
    console.log("");
    console.log(
      `Diferenças de texto encontradas: ${result.textMismatches.length}`
    );

    for (
      const mismatch of
      result.textMismatches
    ) {
      console.log("");
      console.log(
        `--- ${mismatch.code} ---`
      );
      console.log(
        `lexical=${mismatch.lexicalMatches ? "OK" : "FALHOU"} | vínculos=${mismatch.links}`
      );
      console.log(
        "ATUAL:"
      );
      console.log(
        preview(
          mismatch.currentDescription
        )
      );
      console.log(
        "CANÔNICO:"
      );
      console.log(
        preview(
          mismatch.canonicalDescription
        )
      );
    }
  }

  if (
    result.issues.length > 0
  ) {
    throw new Error(
      "A auditoria encontrou divergência de integridade. Não reparar automaticamente."
    );
  }

  console.log("");

  if (
    result.exactOk ===
    EXPECTED_SKILL_COUNT
  ) {
    console.log(
      "AUDITORIA CONCLUÍDA: 183/183 textos já estão canônicos."
    );
    return;
  }

  console.log(
    "AUDITORIA CONCLUÍDA SEM ALTERAÇÕES."
  );
  console.log(
    "O conteúdo lexical permanece íntegro, mas há diferenças de segmentação/espaçamento a reparar."
  );
  console.log("");
  console.log(
    "Próximo comando, somente após revisar esta saída:"
  );
  console.log(
    "node scripts/bncc/repair-text-fidelity.cjs --dry-run"
  );
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "ERRO NA AUDITORIA BNCC"
    );
    console.error(
      error instanceof Error
        ? error.stack ??
          error.message
        : error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

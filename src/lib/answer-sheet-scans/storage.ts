import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "private");
const SCAN_STORAGE_PREFIX = "answer-sheet-scans";

export type StoredScanPdf = {
  sourceFileKey: string;
};

function sanitizeFileName(fileName: string) {
  const baseName = path.basename(fileName).replace(/[^\w.\-]+/g, "-");
  const normalized = baseName.replace(/-+/g, "-").slice(0, 120);

  return normalized || "gabaritos-digitalizados.pdf";
}

function getStoragePath(sourceFileKey: string) {
  const normalizedKey = sourceFileKey.replaceAll("\\", "/");

  if (
    normalizedKey.includes("..") ||
    !normalizedKey.startsWith(`${SCAN_STORAGE_PREFIX}/`)
  ) {
    throw new Error("Referência de arquivo inválida.");
  }

  return path.join(STORAGE_ROOT, ...normalizedKey.split("/"));
}

export async function saveOriginalScanPdf({
  examApplicationId,
  fileName,
  bytes,
}: {
  examApplicationId: string;
  fileName: string;
  bytes: Uint8Array;
}): Promise<StoredScanPdf> {
  const fileId = randomUUID();
  const safeFileName = sanitizeFileName(fileName);
  const sourceFileKey = `${SCAN_STORAGE_PREFIX}/${examApplicationId}/${fileId}-${safeFileName}`;
  const filePath = getStoragePath(sourceFileKey);

  await mkdir(path.dirname(filePath), {
    recursive: true,
  });
  await writeFile(filePath, bytes);

  return {
    sourceFileKey,
  };
}

export async function deleteOriginalScanPdf(sourceFileKey: string) {
  try {
    await unlink(getStoragePath(sourceFileKey));
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : null;

    if (code !== "ENOENT") {
      throw error;
    }
  }
}

export async function readOriginalScanPdf(sourceFileKey: string) {
  return readFile(getStoragePath(sourceFileKey));
}

export async function saveNormalizedScanImage({
  batchId,
  pageNumber,
  bytes,
}: {
  batchId: string;
  pageNumber: number;
  bytes: Uint8Array;
}) {
  const normalizedImageKey = `${SCAN_STORAGE_PREFIX}/normalized/${batchId}/page-${String(
    pageNumber
  ).padStart(4, "0")}.png`;
  const filePath = getStoragePath(normalizedImageKey);

  await mkdir(path.dirname(filePath), {
    recursive: true,
  });
  await writeFile(filePath, bytes);

  return {
    normalizedImageKey,
  };
}

export async function readNormalizedScanImage(normalizedImageKey: string) {
  return readFile(getStoragePath(normalizedImageKey));
}

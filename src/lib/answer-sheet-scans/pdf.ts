import { PDFDocument } from "pdf-lib";

export const MAX_SCAN_PDF_BYTES = 50 * 1024 * 1024;

const PDF_SIGNATURE = "%PDF-";

export class ScanPdfValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScanPdfValidationError";
  }
}

export type ValidatedScanPdf = {
  fileName: string;
  bytes: Uint8Array;
  totalPages: number;
};

function hasPdfExtension(fileName: string) {
  return fileName.toLowerCase().endsWith(".pdf");
}

function hasPdfSignature(bytes: Uint8Array) {
  if (bytes.length < PDF_SIGNATURE.length) {
    return false;
  }

  const signature = new TextDecoder("ascii").decode(
    bytes.subarray(0, PDF_SIGNATURE.length)
  );

  return signature === PDF_SIGNATURE;
}

export async function countPdfPages(bytes: Uint8Array) {
  try {
    const pdf = await PDFDocument.load(bytes, {
      ignoreEncryption: false,
      updateMetadata: false,
    });

    return pdf.getPageCount();
  } catch {
    throw new ScanPdfValidationError(
      "O PDF enviado não pôde ser interpretado. Verifique se o arquivo não está corrompido ou protegido."
    );
  }
}

export async function validateScanPdfFile(file: File): Promise<ValidatedScanPdf> {
  const fileName = file.name.trim() || "gabaritos-digitalizados.pdf";
  const declaredType = file.type.toLowerCase();

  if (!hasPdfExtension(fileName) || declaredType !== "application/pdf") {
    throw new ScanPdfValidationError("Envie um arquivo PDF válido.");
  }

  if (file.size <= 0) {
    throw new ScanPdfValidationError("O PDF enviado está vazio.");
  }

  if (file.size > MAX_SCAN_PDF_BYTES) {
    throw new ScanPdfValidationError("O PDF enviado ultrapassa o limite de 50 MB.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (!hasPdfSignature(bytes)) {
    throw new ScanPdfValidationError("O arquivo enviado não possui estrutura de PDF válida.");
  }

  const totalPages = await countPdfPages(bytes);

  if (totalPages < 1) {
    throw new ScanPdfValidationError("O PDF enviado não possui páginas.");
  }

  return {
    fileName,
    bytes,
    totalPages,
  };
}

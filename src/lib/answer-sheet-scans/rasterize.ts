import "server-only";

import { createCanvas, type ImageData } from "@napi-rs/canvas";

export const SCAN_RENDER_SCALE = 3;

type PdfJsModule = Awaited<typeof import("pdfjs-dist/legacy/build/pdf.mjs")>;
type PdfJsWorkerModule = Awaited<
  typeof import("pdfjs-dist/legacy/build/pdf.worker.mjs")
>;

type PdfDocumentProxy = Awaited<
  ReturnType<PdfJsModule["getDocument"]>["promise"]
>;

declare global {
  // PDF.js checks this exact global before trying to import workerSrc.
  // Keeping it populated prevents Next SSR chunks from resolving ./pdf.worker.mjs.
  var pdfjsWorker:
    | {
        WorkerMessageHandler: PdfJsWorkerModule["WorkerMessageHandler"];
      }
    | undefined;
}

let pdfjsPromise: Promise<PdfJsModule> | null = null;

async function getServerPdfJs() {
  pdfjsPromise ??= (async () => {
    const worker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    globalThis.pdfjsWorker = {
      WorkerMessageHandler: worker.WorkerMessageHandler,
    };

    return import("pdfjs-dist/legacy/build/pdf.mjs");
  })();

  return pdfjsPromise;
}

export async function loadScanPdfDocument(bytes: Uint8Array) {
  const pdfjs = await getServerPdfJs();

  return pdfjs.getDocument({
    data: bytes,
    disableFontFace: true,
    verbosity: pdfjs.VerbosityLevel.ERRORS,
  }).promise;
}

export async function renderScanPdfPage(
  pdf: PdfDocumentProxy,
  pageNumber: number
): Promise<ImageData> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({
    scale: SCAN_RENDER_SCALE,
  });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");

  await page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;

  return context.getImageData(0, 0, canvas.width, canvas.height);
}

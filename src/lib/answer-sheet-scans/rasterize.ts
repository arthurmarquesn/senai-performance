import { createCanvas, type ImageData } from "@napi-rs/canvas";

export const SCAN_RENDER_SCALE = 3;

type PdfDocumentProxy = Awaited<
  ReturnType<
    Awaited<typeof import("pdfjs-dist/legacy/build/pdf.mjs")>["getDocument"]
  >["promise"]
>;

export async function loadScanPdfDocument(bytes: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

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

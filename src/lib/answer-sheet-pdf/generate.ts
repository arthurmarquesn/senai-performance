import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import QRCode from "qrcode";

import {
  ALTERNATIVE_STEP,
  ANSWER_BUBBLE_START_OFFSET,
  ANSWER_BUBBLE_DIAMETER,
  ANSWER_GRID_HEADER_HEIGHT,
  ANSWER_GRID_HEIGHT,
  ANSWER_GRID_WIDTH,
  ANSWER_GRID_X,
  ANSWER_GRID_Y,
  COLUMN_GAP,
  CONTENT_MARGIN,
  PAGE,
  QUESTION_LABEL_WIDTH,
  QUESTION_ROW_HEIGHT,
  QR_SIZE,
  REGISTRATION_MARKER_SIZE,
  getAnswerGridGeometry,
  getQuestionPosition,
} from "./layout";
import type { AnswerSheetPdfData, AnswerSheetPdfSheet } from "./types";

const alternatives = ["A", "B", "C", "D", "E"] as const;

export async function generateAnswerSheetsPdf(data: AnswerSheetPdfData) {
  getAnswerGridGeometry(data.totalQuestions);

  const doc = new PDFDocument({
    autoFirstPage: false,
    size: "A4",
    margin: 0,
    bufferPages: false,
    info: {
      Title: `Gabaritos - ${data.examTitle} - ${data.classRoomName}`,
      Author: "Performance",
      Subject: "Gabaritos físicos",
    },
  });

  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  for (const sheet of data.sheets) {
    doc.addPage({ size: "A4", margin: 0 });
    await drawAnswerSheetPage(doc, data, sheet);
  }

  doc.end();

  return finished;
}

async function drawAnswerSheetPage(
  doc: PDFKit.PDFDocument,
  data: AnswerSheetPdfData,
  sheet: AnswerSheetPdfSheet
) {
  drawPageFrame(doc);
  await drawHeader(doc, data, sheet);
  drawAnswerGrid(doc, data.totalQuestions);
  drawFooter(doc);
}

function drawPageFrame(doc: PDFKit.PDFDocument) {
  doc
    .lineWidth(0.8)
    .strokeColor("#111111")
    .rect(CONTENT_MARGIN, CONTENT_MARGIN, PAGE.width - CONTENT_MARGIN * 2, PAGE.height - CONTENT_MARGIN * 2)
    .stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor("#111111")
    .text("SIMULADO", CONTENT_MARGIN + 10, CONTENT_MARGIN + 8);
}

async function drawHeader(
  doc: PDFKit.PDFDocument,
  data: AnswerSheetPdfData,
  sheet: AnswerSheetPdfSheet
) {
  const headerX = CONTENT_MARGIN + 10;
  const headerY = CONTENT_MARGIN + 24;
  const infoWidth = PAGE.width - CONTENT_MARGIN * 2 - QR_SIZE - 32;

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#111111")
    .text("Folha de respostas", headerX, headerY, {
      width: infoWidth,
    });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#222222")
    .text(data.examTitle, headerX, headerY + 22, {
      width: infoWidth,
      ellipsis: true,
    });

  const fieldY = headerY + 48;
  drawInfoField(doc, "Nome", sheet.studentName, headerX, fieldY, infoWidth, 16);
  drawInfoField(
    doc,
    "Turma",
    `${data.classRoomName} · ${data.grade}º ano`,
    headerX,
    fieldY + 28,
    infoWidth * 0.58,
    16
  );
  drawInfoField(
    doc,
    "Código",
    sheet.code,
    headerX + infoWidth * 0.62,
    fieldY + 28,
    infoWidth * 0.38,
    16
  );

  const qrX = PAGE.width - CONTENT_MARGIN - QR_SIZE - 10;
  drawQrCode(doc, sheet.code, qrX, headerY, QR_SIZE);

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor("#111111")
    .text(sheet.code, qrX, headerY + QR_SIZE + 5, {
      width: QR_SIZE,
      align: "center",
    });
}

function drawQrCode(
  doc: PDFKit.PDFDocument,
  code: string,
  x: number,
  y: number,
  size: number
) {
  const qr = QRCode.create(code, {
    errorCorrectionLevel: "M",
  });
  const quietModules = 2;
  const matrixSize = qr.modules.size + quietModules * 2;
  const moduleSize = size / matrixSize;

  doc
    .fillColor("#FFFFFF")
    .rect(x, y, size, size)
    .fill();

  doc.fillColor("#000000");

  for (let row = 0; row < qr.modules.size; row++) {
    for (let column = 0; column < qr.modules.size; column++) {
      if (!qr.modules.get(row, column)) {
        continue;
      }

      doc
        .rect(
          x + (column + quietModules) * moduleSize,
          y + (row + quietModules) * moduleSize,
          moduleSize,
          moduleSize
        )
        .fill();
    }
  }
}

function drawInfoField(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number
) {
  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor("#555555")
    .text(label.toUpperCase(), x, y - 10, {
      width,
    });

  doc
    .roundedRect(x, y, width, height, 2)
    .lineWidth(0.6)
    .strokeColor("#111111")
    .stroke();

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#111111")
    .text(value, x + 5, y + 4, {
      width: width - 10,
      ellipsis: true,
    });
}

function drawAnswerGrid(doc: PDFKit.PDFDocument, totalQuestions: number) {
  const geometry = getAnswerGridGeometry(totalQuestions);

  doc
    .lineWidth(0.8)
    .strokeColor("#111111")
    .rect(ANSWER_GRID_X, ANSWER_GRID_Y, ANSWER_GRID_WIDTH, ANSWER_GRID_HEIGHT)
    .stroke();

  drawRegistrationMarkers(doc);

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#111111")
    .text("Área de respostas", ANSWER_GRID_X + 12, ANSWER_GRID_Y + 9);

  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#444444")
    .text(
      "Preencha completamente uma alternativa por questão. Não rasure.",
      ANSWER_GRID_X + 110,
      ANSWER_GRID_Y + 10,
      {
        width: ANSWER_GRID_WIDTH - 130,
        align: "right",
      }
    );

  for (let question = 1; question <= totalQuestions; question++) {
    drawQuestionRow(doc, question, totalQuestions);
  }

  for (let column = 1; column < geometry.columns; column++) {
    const availableColumnWidth =
      (ANSWER_GRID_WIDTH - COLUMN_GAP * (geometry.columns - 1)) / geometry.columns;
    const x =
      ANSWER_GRID_X + column * availableColumnWidth + (column - 0.5) * COLUMN_GAP;

    doc
      .moveTo(x, ANSWER_GRID_Y + ANSWER_GRID_HEADER_HEIGHT)
      .lineTo(x, ANSWER_GRID_Y + ANSWER_GRID_HEIGHT - 8)
      .lineWidth(0.35)
      .strokeColor("#D0D0D0")
      .stroke();
  }
}

function drawRegistrationMarkers(doc: PDFKit.PDFDocument) {
  const geometry = getAnswerGridGeometry(1);

  for (const marker of Object.values(geometry.markerCoordinates)) {
    doc
      .fillColor("#000000")
      .rect(
        marker.x,
        marker.y,
        REGISTRATION_MARKER_SIZE,
        REGISTRATION_MARKER_SIZE
      )
      .fill();
  }
}

function drawQuestionRow(
  doc: PDFKit.PDFDocument,
  question: number,
  totalQuestions: number
) {
  const position = getQuestionPosition(question, totalQuestions);
  const labelY = position.rowY + 3;
  const answerStartX =
    position.columnX + QUESTION_LABEL_WIDTH + ANSWER_BUBBLE_START_OFFSET;
  const bubbleRadius = ANSWER_BUBBLE_DIAMETER / 2;
  const bubbleY =
    position.rowY + (QUESTION_ROW_HEIGHT - ANSWER_BUBBLE_DIAMETER) / 2;

  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor("#111111")
    .text(String(question).padStart(2, "0"), position.columnX + 4, labelY, {
      width: QUESTION_LABEL_WIDTH,
      align: "right",
    });

  for (const [index, alternative] of alternatives.entries()) {
    const bubbleX = answerStartX + index * ALTERNATIVE_STEP;
    const bubbleCenterX = bubbleX + bubbleRadius;
    const bubbleCenterY = bubbleY + bubbleRadius;

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor("#111111")
      .text(alternative, bubbleX - 7, labelY);

    doc
      .circle(bubbleCenterX, bubbleCenterY, bubbleRadius)
      .lineWidth(0.55)
      .strokeColor("#111111")
      .stroke();
  }

  doc
    .moveTo(position.columnX + 4, position.rowY + QUESTION_ROW_HEIGHT - 1.6)
    .lineTo(
      position.columnX + position.columnWidth - 4,
      position.rowY + QUESTION_ROW_HEIGHT - 1.6
    )
    .lineWidth(0.18)
    .strokeColor("#E0E0E0")
    .stroke();
}

function drawFooter(doc: PDFKit.PDFDocument) {
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#555555")
    .text(
      "Documento preparado pelo Performance. O QR contém apenas o código único da folha.",
      CONTENT_MARGIN,
      PAGE.height - CONTENT_MARGIN - 12,
      {
        width: PAGE.width - CONTENT_MARGIN * 2,
        align: "center",
      }
    );
}

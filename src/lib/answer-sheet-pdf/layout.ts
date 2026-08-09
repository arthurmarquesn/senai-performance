import type {
  AnswerBubbleGeometry,
  AnswerGridGeometry,
  AnswerSheetAlternative,
} from "./types";

export const PDF_POINTS_PER_MM = 72 / 25.4;

export const PAGE = {
  width: 210 * PDF_POINTS_PER_MM,
  height: 297 * PDF_POINTS_PER_MM,
};

export const CONTENT_MARGIN = 14 * PDF_POINTS_PER_MM;
export const HEADER_HEIGHT = 42 * PDF_POINTS_PER_MM;
export const QR_SIZE = 30 * PDF_POINTS_PER_MM;
export const ANSWER_GRID_X = CONTENT_MARGIN;
export const ANSWER_GRID_Y = 70 * PDF_POINTS_PER_MM;
export const ANSWER_GRID_WIDTH = PAGE.width - CONTENT_MARGIN * 2;
export const ANSWER_GRID_HEIGHT = 195 * PDF_POINTS_PER_MM;
export const ANSWER_GRID_HEADER_HEIGHT = 8 * PDF_POINTS_PER_MM;
export const QUESTION_ROW_HEIGHT = 5.8 * PDF_POINTS_PER_MM;
export const ANSWER_BUBBLE_DIAMETER = 4 * PDF_POINTS_PER_MM;
export const REGISTRATION_MARKER_SIZE = 3.5 * PDF_POINTS_PER_MM;
export const COLUMN_GAP = 5 * PDF_POINTS_PER_MM;
export const QUESTION_LABEL_WIDTH = 10 * PDF_POINTS_PER_MM;
export const ANSWER_BUBBLE_START_OFFSET = 4.6 * PDF_POINTS_PER_MM;
export const ALTERNATIVE_STEP = 8.2 * PDF_POINTS_PER_MM;

export const MAX_QUESTIONS_PER_PAGE = 96;
export const ANSWER_SHEET_ALTERNATIVES = ["A", "B", "C", "D", "E"] as const;

const alternativeIndexes: Record<AnswerSheetAlternative, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
};

export function getAnswerGridGeometry(
  totalQuestions: number
): AnswerGridGeometry {
  if (totalQuestions < 1) {
    throw new Error("O simulado precisa ter ao menos uma questão.");
  }

  if (totalQuestions > MAX_QUESTIONS_PER_PAGE) {
    throw new Error(
      `O layout A4 atual suporta até ${MAX_QUESTIONS_PER_PAGE} questões por folha.`
    );
  }

  const columns = totalQuestions <= 40 ? 2 : 3;
  const rowsPerColumn = Math.ceil(totalQuestions / columns);

  return {
    columns,
    rowsPerColumn,
    questionRowHeight: QUESTION_ROW_HEIGHT,
    answerBubbleDiameter: ANSWER_BUBBLE_DIAMETER,
    registrationMarkerSize: REGISTRATION_MARKER_SIZE,
    gridX: ANSWER_GRID_X,
    gridY: ANSWER_GRID_Y,
    gridWidth: ANSWER_GRID_WIDTH,
    gridHeight: ANSWER_GRID_HEIGHT,
    markerCoordinates: {
      topLeft: {
        x: ANSWER_GRID_X,
        y: ANSWER_GRID_Y,
      },
      topRight: {
        x: ANSWER_GRID_X + ANSWER_GRID_WIDTH - REGISTRATION_MARKER_SIZE,
        y: ANSWER_GRID_Y,
      },
      bottomLeft: {
        x: ANSWER_GRID_X,
        y: ANSWER_GRID_Y + ANSWER_GRID_HEIGHT - REGISTRATION_MARKER_SIZE,
      },
      bottomRight: {
        x: ANSWER_GRID_X + ANSWER_GRID_WIDTH - REGISTRATION_MARKER_SIZE,
        y: ANSWER_GRID_Y + ANSWER_GRID_HEIGHT - REGISTRATION_MARKER_SIZE,
      },
    },
  };
}

export function getQuestionPosition(question: number, totalQuestions: number) {
  const geometry = getAnswerGridGeometry(totalQuestions);
  const columnIndex = Math.floor((question - 1) / geometry.rowsPerColumn);
  const rowIndex = (question - 1) % geometry.rowsPerColumn;
  const availableColumnWidth =
    (ANSWER_GRID_WIDTH - COLUMN_GAP * (geometry.columns - 1)) /
    geometry.columns;
  const columnX =
    ANSWER_GRID_X + columnIndex * (availableColumnWidth + COLUMN_GAP);
  const rowY =
    ANSWER_GRID_Y +
    ANSWER_GRID_HEADER_HEIGHT +
    rowIndex * QUESTION_ROW_HEIGHT;

  return {
    columnIndex,
    rowIndex,
    columnX,
    rowY,
    columnWidth: availableColumnWidth,
  };
}

export function getAnswerBubbleGeometry(
  question: number,
  totalQuestions: number,
  alternative: AnswerSheetAlternative
): AnswerBubbleGeometry {
  const position = getQuestionPosition(question, totalQuestions);
  const answerStartX =
    position.columnX + QUESTION_LABEL_WIDTH + ANSWER_BUBBLE_START_OFFSET;
  const radius = ANSWER_BUBBLE_DIAMETER / 2;
  const bubbleY =
    position.rowY + (QUESTION_ROW_HEIGHT - ANSWER_BUBBLE_DIAMETER) / 2;
  const alternativeIndex = alternativeIndexes[alternative];
  const bubbleX = answerStartX + alternativeIndex * ALTERNATIVE_STEP;

  return {
    question,
    alternative,
    centerX: bubbleX + radius,
    centerY: bubbleY + radius,
    radius,
  };
}

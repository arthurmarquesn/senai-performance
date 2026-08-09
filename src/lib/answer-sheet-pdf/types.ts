export type AnswerSheetPdfSheet = {
  code: string;
  studentName: string;
  studentNumber: number | null;
};

export type AnswerSheetPdfData = {
  examTitle: string;
  totalQuestions: number;
  classRoomName: string;
  grade: number;
  sheets: AnswerSheetPdfSheet[];
};

export type AnswerGridGeometry = {
  columns: number;
  rowsPerColumn: number;
  questionRowHeight: number;
  answerBubbleDiameter: number;
  registrationMarkerSize: number;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
  markerCoordinates: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
  };
};

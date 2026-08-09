export function sanitizePdfFilenamePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function buildAnswerSheetsPdfFilename(examTitle: string, classRoomName: string) {
  const exam = sanitizePdfFilenamePart(examTitle).slice(0, 48) || "simulado";
  const classRoom =
    sanitizePdfFilenamePart(classRoomName).slice(0, 32) || "turma";

  return `gabaritos-${exam}-${classRoom}.pdf`;
}

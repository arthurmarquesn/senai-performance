"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FileCheck2, Loader2 } from "lucide-react";

import {
  generateAnswerSheetsForClassRoom,
  type GenerateAnswerSheetsState,
} from "@/app/simulados/[id]/actions";

type ClassRoomOption = {
  id: string;
  name: string;
  grade: number;
  studentsCount: number;
  existingSheets: number;
};

type AnswerSheetGeneratorFormProps = {
  examId: string;
  classRooms: ClassRoomOption[];
};

const initialState: GenerateAnswerSheetsState = {
  status: "idle",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <FileCheck2 size={18} />
      )}
      {pending ? "Preparando..." : "Gerar gabaritos"}
    </button>
  );
}

export function AnswerSheetGeneratorForm({
  examId,
  classRooms,
}: AnswerSheetGeneratorFormProps) {
  const [state, action] = useActionState(
    generateAnswerSheetsForClassRoom,
    initialState
  );

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="examId" value={examId} />

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-zinc-800">
          Turma compatível
        </span>
        <select
          name="classRoomId"
          defaultValue=""
          className="performance-field rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          required
        >
          <option value="" disabled>
            Selecione a turma
          </option>
          {classRooms.map((classRoom) => (
            <option key={classRoom.id} value={classRoom.id}>
              {classRoom.name} · {classRoom.studentsCount} aluno(s) ·{" "}
              {classRoom.existingSheets} folha(s)
            </option>
          ))}
        </select>
      </label>

      <SubmitButton />

      {state.status === "success" && state.summary && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <p className="font-semibold">Gabaritos preparados com sucesso.</p>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <span>{state.summary.totalStudents} aluno(s)</span>
            <span>{state.summary.totalSheets} folha(s) disponível(is)</span>
            <span>{state.summary.createdSheets} nova(s) folha(s)</span>
            <span>{state.summary.existingSheets} folha(s) já existente(s)</span>
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {state.message}
        </div>
      )}
    </form>
  );
}

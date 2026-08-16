"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, Save, Trophy } from "lucide-react";

import {
  saveEssayCorrection,
  type SaveEssayCorrectionState,
  type SavedEssayCorrection,
} from "@/app/redacoes/actions";
import { CompetencyCard } from "./CompetencyCard";

type Student = {
  id: string;
  name: string;
  classRoom: {
    name: string;
  };
};

type Exam = {
  id: string;
  title: string;
  grade: number;
};

type EssayScores = {
  competency1: number;
  competency2: number;
  competency3: number;
  competency4: number;
  competency5: number;
};

type EssayDraft = EssayScores & {
  studentId: string;
  examId: string;
  comment: string;
};

type Props = {
  students: Student[];
  exams: Exam[];
  existingCorrections: SavedEssayCorrection[];
};

const emptyScores: EssayScores = {
  competency1: 0,
  competency2: 0,
  competency3: 0,
  competency4: 0,
  competency5: 0,
};

const initialActionState: SaveEssayCorrectionState = {
  status: "idle",
};

function toDraft(correction: SavedEssayCorrection | null, studentId: string, examId: string): EssayDraft {
  if (!correction) {
    return {
      studentId,
      examId,
      comment: "",
      ...emptyScores,
    };
  }

  return {
    studentId: correction.studentId,
    examId: correction.examId ?? "",
    competency1: correction.competency1,
    competency2: correction.competency2,
    competency3: correction.competency3,
    competency4: correction.competency4,
    competency5: correction.competency5,
    comment: correction.comment ?? "",
  };
}

function serializeDraft(draft: EssayDraft) {
  return JSON.stringify(draft);
}

function SubmitButton({ canSubmit }: { canSubmit: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || !canSubmit}
      className="performance-primary-action inline-flex w-fit items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
      {pending ? "Salvando..." : "Salvar correcao"}
    </button>
  );
}

export function EssayCorrectionForm({
  students,
  exams,
  existingCorrections,
}: Props) {
  const [actionState, formAction] = useActionState(
    saveEssayCorrection,
    initialActionState
  );
  const [corrections, setCorrections] = useState(existingCorrections);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [scores, setScores] = useState<EssayScores>(emptyScores);
  const [comment, setComment] = useState("");
  const [baseline, setBaseline] = useState<EssayDraft>(() =>
    toDraft(null, "", "")
  );
  const submittedDraftRef = useRef<EssayDraft | null>(null);
  const handledSaveSignatureRef = useRef<string | null>(null);

  const currentDraft = useMemo<EssayDraft>(
    () => ({
      studentId: selectedStudentId,
      examId: selectedExamId,
      comment,
      ...scores,
    }),
    [comment, scores, selectedExamId, selectedStudentId]
  );
  const currentDraftSignature = useMemo(
    () => serializeDraft(currentDraft),
    [currentDraft]
  );
  const baselineSignature = useMemo(() => serializeDraft(baseline), [baseline]);
  const dirty = currentDraftSignature !== baselineSignature;

  const totalScore = useMemo(() => {
    return (
      scores.competency1 +
      scores.competency2 +
      scores.competency3 +
      scores.competency4 +
      scores.competency5
    );
  }, [scores]);

  function findCorrection(studentId: string, examId: string) {
    return (
      corrections.find(
        (correction) =>
          correction.studentId === studentId && (correction.examId ?? "") === examId
      ) ?? null
    );
  }

  function loadDraft(studentId: string, examId: string) {
    const nextDraft = toDraft(findCorrection(studentId, examId), studentId, examId);

    setSelectedStudentId(nextDraft.studentId);
    setSelectedExamId(nextDraft.examId);
    setScores({
      competency1: nextDraft.competency1,
      competency2: nextDraft.competency2,
      competency3: nextDraft.competency3,
      competency4: nextDraft.competency4,
      competency5: nextDraft.competency5,
    });
    setComment(nextDraft.comment);
    setBaseline(nextDraft);
  }

  useEffect(() => {
    if (actionState.status !== "success" || !actionState.correction) {
      return;
    }

    const savedCorrection = actionState.correction;
    const savedCorrectionSignature = JSON.stringify(savedCorrection);

    if (handledSaveSignatureRef.current === savedCorrectionSignature) {
      return;
    }

    handledSaveSignatureRef.current = savedCorrectionSignature;

    const savedDraft = toDraft(
      savedCorrection,
      savedCorrection.studentId,
      savedCorrection.examId ?? ""
    );
    const submittedDraft = submittedDraftRef.current;
    const sameCorrectionSelected =
      selectedStudentId === savedDraft.studentId && selectedExamId === savedDraft.examId;

    setCorrections((current) => {
      const next = current.filter(
        (correction) => correction.id !== savedCorrection.id
      );

      return [savedCorrection, ...next];
    });

    if (sameCorrectionSelected) {
      setBaseline(savedDraft);
    }

    if (
      sameCorrectionSelected &&
      submittedDraft &&
      serializeDraft(submittedDraft) === currentDraftSignature
    ) {
      setSelectedStudentId(savedDraft.studentId);
      setSelectedExamId(savedDraft.examId);
      setScores({
        competency1: savedDraft.competency1,
        competency2: savedDraft.competency2,
        competency3: savedDraft.competency3,
        competency4: savedDraft.competency4,
        competency5: savedDraft.competency5,
      });
      setComment(savedDraft.comment);
    }
  }, [actionState, currentDraftSignature, selectedExamId, selectedStudentId]);

  function updateScore(name: keyof EssayScores, value: number) {
    setScores((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  return (
    <form
      action={formAction}
      onSubmit={() => {
        submittedDraftRef.current = currentDraft;
      }}
      className="grid gap-6"
    >
      <div className="performance-card border p-5">
        <div className="mb-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">
              Correcao ENEM
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Avaliacao baseada nas cinco competencias oficiais do ENEM.
            </p>
          </div>

          <div className="rounded-lg bg-red-600 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <Trophy size={24} />

              <div>
                <p className="text-xs uppercase text-red-100">Nota total</p>

                <p className="text-3xl font-semibold">{totalScore}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <select
            name="studentId"
            required
            value={selectedStudentId}
            onChange={(event) => loadDraft(event.target.value, selectedExamId)}
            className="performance-field rounded-lg border px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          >
            <option value="">Selecione o aluno</option>

            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name} - {student.classRoom.name}
              </option>
            ))}
          </select>

          <select
            name="examId"
            value={selectedExamId}
            onChange={(event) => loadDraft(selectedStudentId, event.target.value)}
            className="performance-field rounded-lg border px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          >
            <option value="">Sem simulado vinculado</option>

            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title} - {exam.grade} ano
              </option>
            ))}
          </select>
        </div>

        <p className="mt-4 text-xs font-semibold text-zinc-500">
          {dirty ? "Alteracoes pendentes" : "Formulario sincronizado"}
        </p>

        {actionState.status !== "idle" && (
          <div
            className={`mt-3 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
              actionState.status === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {actionState.status === "success" ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
            )}
            <p>{actionState.message}</p>
          </div>
        )}
      </div>

      <CompetencyCard
        title="Competencia 1"
        description="Demonstrar dominio da modalidade escrita formal da lingua portuguesa."
        criteria={[
          "Ortografia adequada",
          "Concordancia verbal e nominal",
          "Pontuacao adequada",
          "Registro formal mantido",
          "Estrutura sintatica consistente",
        ]}
        value={scores.competency1}
        name="competency1"
        onChange={(value) => updateScore("competency1", value)}
      />

      <CompetencyCard
        title="Competencia 2"
        description="Compreender a proposta de redacao e aplicar conceitos das varias areas do conhecimento."
        criteria={[
          "Tema plenamente compreendido",
          "Uso consistente de repertorio",
          "Argumentacao conectada ao tema",
          "Boa interpretacao da proposta",
          "Desenvolvimento critico",
        ]}
        value={scores.competency2}
        name="competency2"
        onChange={(value) => updateScore("competency2", value)}
      />

      <CompetencyCard
        title="Competencia 3"
        description="Selecionar, relacionar e organizar informacoes para defender um ponto de vista."
        criteria={[
          "Argumentacao consistente",
          "Boa progressao textual",
          "Defesa clara de tese",
          "Conexao logica entre paragrafos",
          "Informacoes relevantes",
        ]}
        value={scores.competency3}
        name="competency3"
        onChange={(value) => updateScore("competency3", value)}
      />

      <CompetencyCard
        title="Competencia 4"
        description="Demonstrar conhecimento dos mecanismos linguisticos necessarios para a construcao da argumentacao."
        criteria={[
          "Uso adequado de conectivos",
          "Boa coesao textual",
          "Encadeamento fluido",
          "Referencia textual adequada",
          "Boa articulacao das ideias",
        ]}
        value={scores.competency4}
        name="competency4"
        onChange={(value) => updateScore("competency4", value)}
      />

      <CompetencyCard
        title="Competencia 5"
        description="Elaborar proposta de intervencao para o problema abordado."
        criteria={[
          "Proposta detalhada",
          "Respeito aos direitos humanos",
          "Agente definido",
          "Acao definida",
          "Finalidade clara",
        ]}
        value={scores.competency5}
        name="competency5"
        onChange={(value) => updateScore("competency5", value)}
      />

      <div className="performance-card border p-5">
        <h3 className="mb-4 text-xl font-bold text-zinc-900">
          Comentario pedagogico
        </h3>

        <textarea
          name="comment"
          rows={8}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Observacoes da professora..."
          className="w-full rounded-lg border border-zinc-200 px-4 py-4 text-sm leading-relaxed outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
        />
      </div>

      <SubmitButton canSubmit={Boolean(selectedStudentId)} />
    </form>
  );
}

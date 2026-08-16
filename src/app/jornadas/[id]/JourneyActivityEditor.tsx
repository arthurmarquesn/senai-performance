"use client";

import {
  JourneyClassroomPublisher,
} from "./JourneyClassroomPublisher";


import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  LoaderCircle,
  Pencil,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import {
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  approveJourneyActivityAction,
  saveJourneyActivityAction,
  type JourneyActivityEditorStatus,
} from "./activity-editor-actions";

export type JourneyActivityEditorMaterials = {
  estimatedMinutes: number;
  studentOrganization: string;
  resources: string[];
  expectedProduct: string;
  assessmentCriteria: string[];
  teacherNotes: string;
};

type JourneyActivityEditorProps = {
  journeyId: string;

  activity: {
    id: string;
    title: string;
    objective: string;
    instructions: string;
    status: JourneyActivityEditorStatus;
    generatedByAi: boolean;
  };

  subjectLabel: string;
  originTitle: string | null;
  initialMaterials: JourneyActivityEditorMaterials;

  bnccSkills: Array<{
    id: string;
    code: string;
    description: string;
  }>;
};

type Draft = {
  title: string;
  objective: string;
  instructions: string;
  estimatedMinutes: string;
  studentOrganization: string;
  resourcesText: string;
  expectedProduct: string;
  assessmentCriteriaText: string;
  teacherNotes: string;
};

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

function buildDraft(
  props: JourneyActivityEditorProps,
): Draft {
  return {
    title:
      props.activity.title,
    objective:
      props.activity.objective,
    instructions:
      props.activity.instructions,
    estimatedMinutes:
      String(
        props.initialMaterials.estimatedMinutes ||
          "",
      ),
    studentOrganization:
      props.initialMaterials.studentOrganization,
    resourcesText:
      props.initialMaterials.resources.join(
        "\n",
      ),
    expectedProduct:
      props.initialMaterials.expectedProduct,
    assessmentCriteriaText:
      props.initialMaterials.assessmentCriteria.join(
        "\n",
      ),
    teacherNotes:
      props.initialMaterials.teacherNotes,
  };
}

function splitLines(
  value: string,
): string[] {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((item) =>
          item.trim(),
        )
        .filter(Boolean),
    ),
  );
}

export function JourneyActivityEditor(
  props: JourneyActivityEditorProps,
) {
  const [status, setStatus] =
    useState<JourneyActivityEditorStatus>(
      props.activity.status,
    );

  const [isEditing, setIsEditing] =
    useState(false);

  const [isExpanded, setIsExpanded] =
    useState(true);

  const [draft, setDraft] =
    useState<Draft>(() =>
      buildDraft(props),
    );

  const [savedDraft, setSavedDraft] =
    useState<Draft>(() =>
      buildDraft(props),
    );

  const [feedback, setFeedback] =
    useState<Feedback>(null);

  const [isSaving, startSaving] =
    useTransition();

  const [isApproving, startApproving] =
    useTransition();

  const isReadOnly =
    status === "PUBLISHED" ||
    status === "ARCHIVED";

  const isDirty =
    useMemo(
      () =>
        JSON.stringify(draft) !==
        JSON.stringify(savedDraft),
      [draft, savedDraft],
    );

  const resources =
    useMemo(
      () =>
        splitLines(
          savedDraft.resourcesText,
        ),
      [savedDraft.resourcesText],
    );

  const assessmentCriteria =
    useMemo(
      () =>
        splitLines(
          savedDraft.assessmentCriteriaText,
        ),
      [savedDraft.assessmentCriteriaText],
    );

  function updateDraft(
    key: keyof Draft,
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      [key]:
        value,
    }));

    setFeedback(null);
  }

  function cancelEditing() {
    setDraft(
      savedDraft,
    );
    setFeedback(null);
    setIsEditing(false);
  }

  function saveActivity() {
    setFeedback(null);

    const estimatedMinutes =
      Number(
        draft.estimatedMinutes,
      );

    startSaving(async () => {
      const result =
        await saveJourneyActivityAction({
          journeyId:
            props.journeyId,
          activityId:
            props.activity.id,
          title:
            draft.title,
          objective:
            draft.objective,
          instructions:
            draft.instructions,
          estimatedMinutes,
          studentOrganization:
            draft.studentOrganization,
          resources:
            splitLines(
              draft.resourcesText,
            ),
          expectedProduct:
            draft.expectedProduct,
          assessmentCriteria:
            splitLines(
              draft.assessmentCriteriaText,
            ),
          teacherNotes:
            draft.teacherNotes,
        });

      if (!result.ok) {
        setFeedback({
          type:
            "error",
          message:
            result.message,
        });
        return;
      }

      setSavedDraft(
        draft,
      );
      setStatus(
        result.status,
      );
      setIsEditing(false);
      setFeedback({
        type:
          "success",
        message:
          result.message,
      });
    });
  }

  function approveActivity() {
    setFeedback(null);

    startApproving(async () => {
      const result =
        await approveJourneyActivityAction({
          journeyId:
            props.journeyId,
          activityId:
            props.activity.id,
        });

      if (!result.ok) {
        setFeedback({
          type:
            "error",
          message:
            result.message,
        });
        return;
      }

      setStatus(
        result.status,
      );
      setFeedback({
        type:
          "success",
        message:
          result.message,
      });
    });
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <Pill tone="brand">
                {props.subjectLabel}
              </Pill>

              <StatusPill
                status={status}
              />

              {props.activity.generatedByAi && (
                <Pill tone="neutral">
                  <Sparkles
                    size={12}
                  />
                  Gerada por IA
                </Pill>
              )}

              {isDirty && (
                <Pill tone="warning">
                  Alterações não salvas
                </Pill>
              )}
            </div>

            <h3 className="mt-3 text-lg font-semibold text-zinc-950">
              {savedDraft.title}
            </h3>

            {props.originTitle && (
              <p className="mt-1 text-xs text-zinc-500">
                Origem: {props.originTitle}
              </p>
            )}
          </div>
            {status === "APPROVED" &&
  !isDirty &&
  !isEditing && (
    <div className="border-t border-zinc-200 bg-white px-5 py-5">
      <JourneyClassroomPublisher
        activityId={
          props.activity.id
        }
        returnTo={`/jornadas/${props.journeyId}`}
      />
    </div>
  )}
          <div className="flex flex-wrap gap-2">
            {!isReadOnly &&
              !isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setFeedback(null);
                    setIsEditing(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  <Pencil
                    size={14}
                  />
                  Editar
                </button>
              )}

            <button
              type="button"
              onClick={() =>
                setIsExpanded(
                  (current) =>
                    !current,
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              {isExpanded ? (
                <ChevronUp
                  size={14}
                />
              ) : (
                <ChevronDown
                  size={14}
                />
              )}
              {isExpanded
                ? "Recolher"
                : "Detalhes"}
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-5 ${
              feedback.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {feedback.type === "error" ? (
              <CircleAlert
                size={15}
                className="mt-0.5 shrink-0"
              />
            ) : (
              <CheckCircle2
                size={15}
                className="mt-0.5 shrink-0"
              />
            )}

            <span>
              {feedback.message}
            </span>
          </div>
        )}

        {isExpanded && (
          <div className="mt-5">
            {isEditing ? (
              <ActivityForm
                draft={draft}
                status={status}
                isSaving={isSaving}
                onChange={updateDraft}
                onCancel={cancelEditing}
                onSave={saveActivity}
              />
            ) : (
              <ActivityView
                draft={savedDraft}
                resources={resources}
                assessmentCriteria={assessmentCriteria}
              />
            )}

            <div className="mt-6 border-t border-zinc-100 pt-4">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  size={16}
                  className="text-emerald-600"
                />

                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  BNCC utilizada
                </p>
              </div>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                As habilidades abaixo vieram das associações aprovadas pelo professor e não são editadas pela geração da atividade.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {props.bnccSkills.map(
                  (skill) => (
                    <span
                      key={skill.id}
                      title={skill.description}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-xs font-bold text-emerald-800"
                    >
                      {skill.code}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {!isReadOnly && (
        <div className="flex flex-col gap-3 border-t border-zinc-200 bg-zinc-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-700">
              Validação da atividade
            </p>

            <p className="mt-1 text-xs leading-5 text-zinc-500">
              {status === "APPROVED"
                ? "A atividade foi aprovada. Qualquer edição posterior fará o conteúdo voltar para rascunho."
                : "Revise o conteúdo antes de aprovar. Apenas atividades salvas podem ser aprovadas."}
            </p>
          </div>

          <button
            type="button"
            onClick={approveActivity}
            disabled={
              status === "APPROVED" ||
              isDirty ||
              isEditing ||
              isApproving ||
              isSaving ||
              props.bnccSkills.length === 0
            }
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isApproving ? (
              <LoaderCircle
                size={15}
                className="animate-spin"
              />
            ) : (
              <CheckCircle2
                size={15}
              />
            )}

            {status === "APPROVED"
              ? "Atividade aprovada"
              : isApproving
                ? "Aprovando..."
                : "Aprovar atividade"}
          </button>
        </div>
      )}
    </article>
  );
}

function ActivityForm({
  draft,
  status,
  isSaving,
  onChange,
  onCancel,
  onSave,
}: {
  draft: Draft;
  status: JourneyActivityEditorStatus;
  isSaving: boolean;
  onChange: (
    key: keyof Draft,
    value: string,
  ) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:p-5">
      {status === "APPROVED" && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
          <RotateCcw
            size={15}
            className="mt-0.5 shrink-0"
          />
          Ao salvar uma edição, a aprovação anterior é invalidada e a atividade volta para rascunho.
        </div>
      )}

      <Field
        label="Título"
        required
      >
        <input
          value={draft.title}
          onChange={(event) =>
            onChange(
              "title",
              event.target.value,
            )
          }
          maxLength={220}
          className={fieldClassName}
        />
      </Field>

      <Field
        label="Objetivo"
        required
      >
        <textarea
          value={draft.objective}
          onChange={(event) =>
            onChange(
              "objective",
              event.target.value,
            )
          }
          rows={4}
          className={`${fieldClassName} resize-y`}
        />
      </Field>

      <Field
        label="Desenvolvimento"
        required
        hint="Descreva a sequência de execução da atividade."
      >
        <textarea
          value={draft.instructions}
          onChange={(event) =>
            onChange(
              "instructions",
              event.target.value,
            )
          }
          rows={8}
          className={`${fieldClassName} resize-y`}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Duração estimada (minutos)"
          required
        >
          <input
            type="number"
            min={10}
            max={600}
            step={1}
            value={draft.estimatedMinutes}
            onChange={(event) =>
              onChange(
                "estimatedMinutes",
                event.target.value,
              )
            }
            className={fieldClassName}
          />
        </Field>

        <Field
          label="Organização dos estudantes"
          required
        >
          <input
            value={draft.studentOrganization}
            onChange={(event) =>
              onChange(
                "studentOrganization",
                event.target.value,
              )
            }
            className={fieldClassName}
          />
        </Field>
      </div>

      <Field
        label="Recursos"
        required
        hint="Um recurso por linha."
      >
        <textarea
          value={draft.resourcesText}
          onChange={(event) =>
            onChange(
              "resourcesText",
              event.target.value,
            )
          }
          rows={5}
          placeholder={"Computador\nProjetor\nFolhas A4"}
          className={`${fieldClassName} resize-y`}
        />
      </Field>

      <Field
        label="Produto esperado"
        required
      >
        <textarea
          value={draft.expectedProduct}
          onChange={(event) =>
            onChange(
              "expectedProduct",
              event.target.value,
            )
          }
          rows={4}
          className={`${fieldClassName} resize-y`}
        />
      </Field>

      <Field
        label="Critérios de avaliação"
        required
        hint="Um critério observável por linha."
      >
        <textarea
          value={draft.assessmentCriteriaText}
          onChange={(event) =>
            onChange(
              "assessmentCriteriaText",
              event.target.value,
            )
          }
          rows={6}
          className={`${fieldClassName} resize-y`}
        />
      </Field>

      <Field
        label="Orientações ao professor"
      >
        <textarea
          value={draft.teacherNotes}
          onChange={(event) =>
            onChange(
              "teacherNotes",
              event.target.value,
            )
          }
          rows={5}
          className={`${fieldClassName} resize-y`}
        />
      </Field>

      <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
        >
          <X
            size={14}
          />
          Cancelar
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="performance-primary-action inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? (
            <LoaderCircle
              size={15}
              className="animate-spin"
            />
          ) : (
            <Save
              size={15}
            />
          )}

          {isSaving
            ? "Salvando..."
            : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}

function ActivityView({
  draft,
  resources,
  assessmentCriteria,
}: {
  draft: Draft;
  resources: string[];
  assessmentCriteria: string[];
}) {
  return (
    <div>
      <TextBlock
        label="Objetivo"
        value={draft.objective}
      />

      <TextBlock
        label="Desenvolvimento"
        value={draft.instructions}
      />

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <InfoCard
          label="Duração"
          value={
            draft.estimatedMinutes
              ? `${draft.estimatedMinutes} minutos`
              : "Não informada"
          }
        />

        <InfoCard
          label="Organização"
          value={
            draft.studentOrganization ||
            "Não informada"
          }
        />

        <InfoCard
          label="Produto esperado"
          value={
            draft.expectedProduct ||
            "Não informado"
          }
        />

        <InfoCard
          label="Orientações ao professor"
          value={
            draft.teacherNotes ||
            "Sem observações adicionais"
          }
        />
      </div>

      <ListBlock
        label="Recursos"
        values={resources}
      />

      <ListBlock
        label="Critérios de avaliação"
        values={assessmentCriteria}
      />
    </div>
  );
}

function Field({
  label,
  hint,
  required = false,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold text-zinc-700">
        {label}
        {required && (
          <span className="text-red-600">
            {" "}*
          </span>
        )}
      </span>

      {children}

      {hint && (
        <span className="text-[0.7rem] leading-5 text-zinc-500">
          {hint}
        </span>
      )}
    </label>
  );
}

function TextBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mt-5 first:mt-0">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
        {value || "Não informado"}
      </p>
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
        {value}
      </p>
    </div>
  );
}

function ListBlock({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  if (
    values.length === 0
  ) {
    return null;
  }

  return (
    <div className="mt-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </p>

      <div className="mt-2 space-y-2">
        {values.map(
          (value) => (
            <div
              key={value}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs leading-5 text-zinc-700"
            >
              {value}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: JourneyActivityEditorStatus;
}) {
  if (
    status === "APPROVED"
  ) {
    return (
      <Pill tone="success">
        <CheckCircle2
          size={12}
        />
        Aprovada
      </Pill>
    );
  }

  if (
    status === "PUBLISHED"
  ) {
    return (
      <Pill tone="success">
        Publicada
      </Pill>
    );
  }

  if (
    status === "ARCHIVED"
  ) {
    return (
      <Pill tone="neutral">
        Arquivada
      </Pill>
    );
  }

  return (
    <Pill tone="warning">
      Rascunho
    </Pill>
  );
}

function Pill({
  tone,
  children,
}: {
  tone:
    | "brand"
    | "neutral"
    | "warning"
    | "success";
  children: React.ReactNode;
}) {
  const classes = {
    brand:
      "border-blue-200 bg-blue-50 text-blue-700",
    neutral:
      "border-zinc-200 bg-zinc-50 text-zinc-600",
    warning:
      "border-amber-200 bg-amber-50 text-amber-700",
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold ${classes}`}
    >
      {children}
    </span>
  );
}

const fieldClassName =
  "performance-field w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-red-400 focus:ring-4 focus:ring-red-500/10";
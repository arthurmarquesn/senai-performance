"use client";

import { useActionState, useId, useRef, useState } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import type { FormState } from "@/lib/form-state";

type Field = {
  name: string;
  label: string;
  placeholder?: string;
  type?: "number";
  min?: number;
  required?: boolean;
  options?: { value: string; label: string }[];
};

export function CreateRecordForm({ action, kind, classrooms = [] }: {
  action: (formData: FormData) => Promise<FormState>;
  kind: "student" | "classroom" | "exam";
  classrooms?: { id: string; name: string; grade: number }[];
}) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, formAction, pending] = useActionState(async (_previous: FormState, data: FormData) => {
    const result = await action(data);
    if (result.success) setValues({});
    else {
      // Wait until React has rendered the field errors before moving focus.
      requestAnimationFrame(() => {
        const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
        (invalid ?? formRef.current?.querySelector<HTMLElement>('[role="alert"]'))?.focus();
      });
    }
    return result;
  }, {});

  const years = [1, 2, 3].map(year => ({ value: String(year), label: `${year}º ano` }));
  const fields: Field[] = kind === "student" ? [
    { name: "name", label: "Nome completo", placeholder: "Nome do aluno", required: true },
    { name: "number", label: "Número", placeholder: "Opcional", type: "number", min: 0 },
    { name: "classRoomId", label: "Turma", required: true, options: classrooms.map(c => ({ value: c.id, label: `${c.name} · ${c.grade}º ano` })) },
  ] : kind === "classroom" ? [
    { name: "name", label: "Nome da turma", placeholder: "Ex.: IDEV-2", required: true },
    { name: "grade", label: "Ano", required: true, options: years },
  ] : [
    { name: "title", label: "Nome do simulado", placeholder: "Ex.: Simulado 1 - Matemática", required: true },
    { name: "grade", label: "Ano", required: true, options: years },
    { name: "totalQuestions", label: "Questões", placeholder: "Quantidade", required: true, type: "number", min: 1 },
  ];
  const grid = kind === "classroom" ? "md:grid-cols-[minmax(0,1fr)_200px_auto]"
    : kind === "student" ? "md:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)_auto]"
    : "md:grid-cols-[minmax(0,1fr)_160px_180px_auto]";
  const unavailable = kind === "student" && classrooms.length === 0;
  const inputClass = "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-500/10 aria-invalid:border-red-500";

  return (
    <form ref={formRef} action={formAction} aria-busy={pending}>
      <fieldset disabled={pending} className={`grid min-w-0 gap-4 md:items-start ${grid}`}>
        <legend className="sr-only">{kind === "student" ? "Cadastrar aluno" : kind === "classroom" ? "Cadastrar turma" : "Criar simulado"}</legend>
        {fields.map(field => {
          const error = state.fieldErrors?.[field.name];
          const props = {
            id: `${id}-${field.name}`, name: field.name, required: field.required,
            value: values[field.name] ?? "", className: inputClass,
            "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-${field.name}-error` : undefined,
            onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setValues(current => ({ ...current, [field.name]: event.target.value })),
          };
          return (
            <div key={field.name} className="grid gap-2">
              <label htmlFor={props.id} className="text-sm font-semibold text-slate-700">{field.label}</label>
              {field.options ? (
                <select {...props}>
                  <option value="" disabled>Selecione</option>
                  {field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ) : <input {...props} type={field.type ?? "text"} min={field.min} max={field.type === "number" ? 2147483647 : undefined} step={field.type === "number" ? 1 : undefined} placeholder={field.placeholder} />}
              {error && <p id={`${id}-${field.name}-error`} className="text-sm text-red-700">{error}</p>}
            </div>
          );
        })}
        <button type="submit" disabled={pending || unavailable} className="mt-7 inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#F97316] px-5 text-sm font-semibold text-white transition hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:opacity-50">
          {pending ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
          {pending ? "Salvando…" : kind === "exam" ? "Criar" : kind === "classroom" ? "Cadastrar turma" : "Cadastrar"}
        </button>
      </fieldset>
      {unavailable && <p className="mt-3 text-sm text-slate-600">Cadastre uma turma antes de adicionar alunos.</p>}
      {state.fieldErrors && <p role="alert" tabIndex={-1} className="mt-3 text-sm text-red-700">Confira os campos indicados para continuar.</p>}
      {state.error && <p role="alert" tabIndex={-1} className="mt-3 text-sm text-red-700">{state.error}</p>}
      <p role="status" className="mt-3 text-sm text-emerald-700">{pending ? "" : state.success}</p>
    </form>
  );
}

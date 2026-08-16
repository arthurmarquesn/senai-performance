"use client";

import {
  useActionState,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  LoaderCircle,
  WandSparkles,
} from "lucide-react";

import {
  generateActivityAction,
  type GenerateActivityActionState,
} from "./activity-actions";

const initialState:
  GenerateActivityActionState = {
    status:
      "idle",

    message:
      "",
  };

export function JourneyActivityButton({
  journeyId,
  suggestionId,
  approvedBnccCount,
}: {
  journeyId:
    string;

  suggestionId:
    string;

  approvedBnccCount:
    number;
}) {
  const [
    state,
    formAction,
  ] =
    useActionState(
      generateActivityAction,
      initialState,
    );

  const disabled =
    approvedBnccCount ===
    0;

  return (
    <div className="space-y-2">
      <form
        action={
          formAction
        }
      >
        <input
          type="hidden"
          name="journeyId"
          value={
            journeyId
          }
        />

        <input
          type="hidden"
          name="suggestionId"
          value={
            suggestionId
          }
        />

        <SubmitButton
          disabled={
            disabled
          }
        />
      </form>

      {disabled && (
        <p className="text-xs leading-relaxed text-zinc-500">
          Aprove pelo menos uma habilidade BNCC para gerar uma atividade.
        </p>
      )}

      {state.message && (
        <p
          className={`text-xs leading-relaxed ${
            state.status ===
            "error"
              ? "text-red-600"
              : "text-emerald-700"
          }`}
        >
          {
            state.message
          }
        </p>
      )}
    </div>
  );
}

function SubmitButton({
  disabled,
}: {
  disabled:
    boolean;
}) {
  const {
    pending,
  } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={
        disabled ||
        pending
      }
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-800 transition enabled:hover:border-red-200 enabled:hover:bg-red-50 enabled:hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <LoaderCircle
          size={15}
          className="animate-spin"
        />
      ) : (
        <WandSparkles
          size={15}
        />
      )}

      {pending
        ? "Gerando..."
        : "Gerar atividade"}
    </button>
  );
}
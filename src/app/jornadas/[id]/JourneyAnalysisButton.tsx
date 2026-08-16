"use client";

import {
  useActionState,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  LoaderCircle,
  Sparkles,
} from "lucide-react";

import {
  runJourneyAnalysisAction,
  type JourneyAnalysisActionState,
} from "./actions";

const initialState:
  JourneyAnalysisActionState =
  {
    status:
      "idle",

    message:
      "",
  };

export function JourneyAnalysisButton({
  journeyId,
  disabled,
}: {
  journeyId: string;
  disabled: boolean;
}) {
  const [
    state,
    formAction,
  ] =
    useActionState(
      runJourneyAnalysisAction,
      initialState,
    );

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

        <SubmitButton
          disabled={
            disabled
          }
        />
      </form>

      {state.message && (
        <p
          className={`text-xs leading-relaxed ${
            state.status ===
            "error"
              ? "text-red-600"
              : state.status ===
                  "success"
                ? "text-emerald-700"
                : "text-zinc-500"
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
  disabled: boolean;
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
      className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <LoaderCircle
          size={17}
          className="animate-spin"
        />
      ) : (
        <Sparkles
          size={17}
        />
      )}

      {pending
        ? "Analisando Jornada..."
        : "Analisar com IA"}
    </button>
  );
}
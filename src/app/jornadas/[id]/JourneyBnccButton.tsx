"use client";

import {
  useActionState,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  BookOpenCheck,
  LoaderCircle,
} from "lucide-react";

import {
  linkJourneyBnccAction,
  type JourneyBnccActionState,
} from "./bncc-actions";

const initialState:
  JourneyBnccActionState = {
    status:
      "idle",

    message:
      "",
  };

export function JourneyBnccButton({
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
      linkJourneyBnccAction,
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
          className={`max-w-md text-xs leading-relaxed ${
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
        <BookOpenCheck
          size={17}
        />
      )}

      {pending
        ? "Cruzando com a BNCC..."
        : "Cruzar com a BNCC"}
    </button>
  );
}
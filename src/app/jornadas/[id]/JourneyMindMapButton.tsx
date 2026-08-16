"use client";

import {
  useActionState,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  LoaderCircle,
  Map,
  RefreshCw,
} from "lucide-react";

import {
  generateJourneyMindMapAction,
  type JourneyMindMapActionState,
} from "./mind-map-actions";

const initialState:
  JourneyMindMapActionState = {
    status:
      "idle",

    message:
      "",
  };

export function JourneyMindMapButton({
  journeyId,
  disabled,
  hasMap,
}: {
  journeyId:
    string;

  disabled:
    boolean;

  hasMap:
    boolean;
}) {
  const [
    state,
    formAction,
  ] =
    useActionState(
      generateJourneyMindMapAction,
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
          hasMap={
            hasMap
          }
        />
      </form>

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
  hasMap,
}: {
  disabled:
    boolean;

  hasMap:
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
      className="performance-primary-action inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <LoaderCircle
          size={17}
          className="animate-spin"
        />
      ) : hasMap ? (
        <RefreshCw
          size={17}
        />
      ) : (
        <Map
          size={17}
        />
      )}

      {pending
        ? "Gerando mapa..."
        : hasMap
          ? "Atualizar mapa"
          : "Gerar mapa mental"}
    </button>
  );
}
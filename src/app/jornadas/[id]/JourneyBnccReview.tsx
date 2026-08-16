"use client";

import {
  useActionState,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  Check,
  LoaderCircle,
  RotateCcw,
  X,
} from "lucide-react";

import {
  reviewJourneyBnccLinkAction,
  type BnccReviewActionState,
} from "./bncc-review-actions";

const initialState:
  BnccReviewActionState = {
    status:
      "idle",

    message:
      "",
  };

export function JourneyBnccReview({
  journeyId,
  linkId,
  currentStatus,
  validationNote,
}: {
  journeyId: string;

  linkId: string;

  currentStatus:
    | "SUGGESTED"
    | "APPROVED"
    | "REJECTED";

  validationNote:
    | string
    | null;
}) {
  const [
    state,
    formAction,
  ] =
    useActionState(
      reviewJourneyBnccLinkAction,
      initialState,
    );

  return (
    <div className="mt-4 border-t border-zinc-200 pt-4">
      <form
        action={
          formAction
        }
        className="space-y-3"
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
          name="linkId"
          value={
            linkId
          }
        />

        <label className="grid gap-2">
          <span className="text-xs font-semibold text-zinc-600">
            Observação da validação
          </span>

          <textarea
            name="validationNote"
            rows={2}
            defaultValue={
              validationNote ??
              ""
            }
            placeholder="Opcional. Registre uma justificativa para a decisão."
            className="performance-field resize-y rounded-xl border px-3 py-2.5 text-xs leading-5 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <ReviewButton
            value="APPROVED"
            label={
              currentStatus ===
              "APPROVED"
                ? "Aprovada"
                : "Aprovar"
            }
            icon={
              <Check
                size={15}
              />
            }
            disabled={
              currentStatus ===
              "APPROVED"
            }
          />

          <ReviewButton
            value="REJECTED"
            label={
              currentStatus ===
              "REJECTED"
                ? "Rejeitada"
                : "Rejeitar"
            }
            icon={
              <X
                size={15}
              />
            }
            disabled={
              currentStatus ===
              "REJECTED"
            }
          />

          {currentStatus !==
            "SUGGESTED" && (
            <ReviewButton
              value="SUGGESTED"
              label="Desfazer decisão"
              icon={
                <RotateCcw
                  size={14}
                />
              }
            />
          )}
        </div>
      </form>

      {state.message && (
        <p
          className={`mt-2 text-xs ${
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

function ReviewButton({
  value,
  label,
  icon,
  disabled = false,
}: {
  value:
    | "SUGGESTED"
    | "APPROVED"
    | "REJECTED";

  label: string;

  icon: React.ReactNode;

  disabled?: boolean;
}) {
  const {
    pending,
  } =
    useFormStatus();

  const classes =
    value ===
    "APPROVED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      : value ===
          "REJECTED"
        ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50";

  return (
    <button
      type="submit"
      name="status"
      value={
        value
      }
      disabled={
        disabled ||
        pending
      }
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${classes}`}
    >
      {pending ? (
        <LoaderCircle
          size={14}
          className="animate-spin"
        />
      ) : (
        icon
      )}

      {label}
    </button>
  );
}
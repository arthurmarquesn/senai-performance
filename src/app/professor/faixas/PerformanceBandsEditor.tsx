"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import {
  savePerformanceBands,
  type PerformanceBandInput,
} from "./actions";

type SavedPerformanceBand = {
  id: string;
  name: string;
  minPercentage: number;
  maxPercentage: number;
  requiresComplementaryActivity: boolean;
  position: number;
};

type BandDraft = {
  id: string;
  name: string;
  minPercentage: number;
  maxPercentage: number;
  requiresComplementaryActivity: boolean;
};

type PerformanceBandsEditorProps = {
  initialBands: SavedPerformanceBand[];
};

function createTemporaryId() {
  return `new-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.min(
    Math.max(
      Math.round(value),
      min,
    ),
    max,
  );
}

function sortBands(
  bands: readonly BandDraft[],
) {
  return [...bands].sort(
    (a, b) =>
      a.minPercentage -
        b.minPercentage ||
      a.maxPercentage -
        b.maxPercentage ||
      a.name.localeCompare(
        b.name,
        "pt-BR",
      ),
  );
}

function normalizeForComparison(
  bands: readonly BandDraft[],
) {
  return sortBands(
    bands,
  ).map((band) => ({
    name:
      band.name.trim(),

    minPercentage:
      band.minPercentage,

    maxPercentage:
      band.maxPercentage,

    requiresComplementaryActivity:
      band.requiresComplementaryActivity,
  }));
}

function validateBands(
  bands: readonly BandDraft[],
) {
  for (const band of bands) {
    if (!band.name.trim()) {
      return "Todas as faixas precisam possuir um nome.";
    }

    if (
      band.minPercentage < 0 ||
      band.minPercentage > 100
    ) {
      return `O início da faixa "${band.name}" deve estar entre 0% e 100%.`;
    }

    if (
      band.maxPercentage < 0 ||
      band.maxPercentage > 100
    ) {
      return `O fim da faixa "${band.name}" deve estar entre 0% e 100%.`;
    }

    if (
      band.minPercentage >
      band.maxPercentage
    ) {
      return `O início da faixa "${band.name}" não pode ser maior que o fim.`;
    }
  }

  const ordered =
    sortBands(bands);

  for (
    let index = 1;
    index < ordered.length;
    index++
  ) {
    const previous =
      ordered[index - 1];

    const current =
      ordered[index];

    if (
      current.minPercentage <=
      previous.maxPercentage
    ) {
      return `As faixas "${previous.name}" e "${current.name}" estão sobrepostas.`;
    }
  }

  return null;
}

function findAvailableRange(
  bands: readonly BandDraft[],
) {
  if (bands.length === 0) {
    return {
      min: 0,
      max: 100,
    };
  }

  const ordered =
    sortBands(bands);

  let cursor = 0;

  for (const band of ordered) {
    if (
      cursor <
      band.minPercentage
    ) {
      return {
        min: cursor,
        max:
          band.minPercentage -
          1,
      };
    }

    cursor =
      Math.max(
        cursor,
        band.maxPercentage +
          1,
      );
  }

  if (cursor <= 100) {
    return {
      min: cursor,
      max: 100,
    };
  }

  return null;
}

function getBandBarStyle(
  minPercentage: number,
  maxPercentage: number,
) {
  const left =
    minPercentage;

  const width =
    maxPercentage -
    minPercentage;

  return {
    left: `${left}%`,

    width:
      width <= 0
        ? "2px"
        : `${width}%`,
  };
}

function buildDrafts(
  bands: SavedPerformanceBand[],
): BandDraft[] {
  return bands.map(
    (band) => ({
      id: band.id,

      name:
        band.name,

      minPercentage:
        band.minPercentage,

      maxPercentage:
        band.maxPercentage,

      requiresComplementaryActivity:
        band.requiresComplementaryActivity,
    }),
  );
}

export function PerformanceBandsEditor({
  initialBands,
}: PerformanceBandsEditorProps) {
  const [
    bands,
    setBands,
  ] = useState<BandDraft[]>(
    () =>
      buildDrafts(
        initialBands,
      ),
  );

  const [
    persistedBands,
    setPersistedBands,
  ] = useState<BandDraft[]>(
    () =>
      buildDrafts(
        initialBands,
      ),
  );

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<
    string | null
  >(null);

  const [
    actionError,
    setActionError,
  ] = useState<
    string | null
  >(null);

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const orderedBands =
    useMemo(
      () =>
        sortBands(
          bands,
        ),
      [bands],
    );

  const validationError =
    useMemo(
      () =>
        validateBands(
          bands,
        ),
      [bands],
    );

  const isDirty =
    useMemo(
      () =>
        JSON.stringify(
          normalizeForComparison(
            bands,
          ),
        ) !==
        JSON.stringify(
          normalizeForComparison(
            persistedBands,
          ),
        ),
      [
        bands,
        persistedBands,
      ],
    );

  function clearMessages() {
    setSuccessMessage(
      null,
    );

    setActionError(
      null,
    );
  }

  function updateBand(
    id: string,
    updater: (
      current: BandDraft,
    ) => BandDraft,
  ) {
    setBands(
      (current) =>
        current.map(
          (band) =>
            band.id === id
              ? updater(
                  band,
                )
              : band,
        ),
    );

    clearMessages();
  }

  function handleAddBand() {
    clearMessages();

    const available =
      findAvailableRange(
        bands,
      );

    if (!available) {
      setActionError(
        "Não existe mais nenhum intervalo livre entre 0% e 100%. Ajuste ou exclua uma faixa antes de criar outra.",
      );

      return;
    }

    setBands(
      (current) => [
        ...current,

        {
          id:
            createTemporaryId(),

          name:
            "Nova faixa",

          minPercentage:
            available.min,

          maxPercentage:
            available.max,

          requiresComplementaryActivity:
            false,
        },
      ],
    );
  }

  function handleDeleteBand(
    id: string,
  ) {
    clearMessages();

    setBands(
      (current) =>
        current.filter(
          (band) =>
            band.id !== id,
        ),
    );
  }

  function handleSave() {
    clearMessages();

    const currentValidationError =
      validateBands(
        bands,
      );

    if (
      currentValidationError
    ) {
      setActionError(
        currentValidationError,
      );

      return;
    }

    const payload: PerformanceBandInput[] =
      sortBands(
        bands,
      ).map(
        (band) => ({
          name:
            band.name.trim(),

          minPercentage:
            band.minPercentage,

          maxPercentage:
            band.maxPercentage,

          requiresComplementaryActivity:
            band.requiresComplementaryActivity,
        }),
      );

    startTransition(
      async () => {
        const result =
          await savePerformanceBands(
            payload,
          );

        if (
          result.status ===
          "error"
        ) {
          setActionError(
            result.message,
          );

          return;
        }

        const nextBands: BandDraft[] =
          result.bands.map(
            (band) => ({
              id:
                band.id,

              name:
                band.name,

              minPercentage:
                band.minPercentage,

              maxPercentage:
                band.maxPercentage,

              requiresComplementaryActivity:
                band.requiresComplementaryActivity,
            }),
          );

        setBands(
          nextBands,
        );

        setPersistedBands(
          nextBands,
        );

        setSuccessMessage(
          result.message,
        );
      },
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Régua pedagógica
            </p>

            <h2 className="mt-1 text-lg font-semibold text-zinc-950">
              Distribuição das faixas
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
              Crie somente as classificações que fazem sentido para sua prática.
              Intervalos que não pertencem a nenhuma faixa continuarão sem
              classificação.
            </p>
          </div>

          <button
            type="button"
            onClick={
              handleAddBand
            }
            disabled={
              isPending
            }
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus
              size={16}
            />

            Adicionar faixa
          </button>
        </div>

        <div className="mt-7">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
            <span>
              0%
            </span>

            <span>
              100%
            </span>
          </div>

          <div className="relative mt-2 h-8 rounded-lg bg-zinc-100 ring-1 ring-inset ring-zinc-200">
            {orderedBands.map(
              (band) => (
                <div
                  key={
                    band.id
                  }
                  style={getBandBarStyle(
                    band.minPercentage,
                    band.maxPercentage,
                  )}
                  title={`${band.name}: ${band.minPercentage}% até ${band.maxPercentage}%`}
                  className={
                    band.requiresComplementaryActivity
                      ? "absolute bottom-1 top-1 rounded-md bg-red-600 transition-all duration-200 ease-out"
                      : "absolute bottom-1 top-1 rounded-md bg-zinc-600 transition-all duration-200 ease-out"
                  }
                />
              ),
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {orderedBands.map(
              (band) => (
                <div
                  key={
                    `${band.id}-legend`
                  }
                  className="flex items-center gap-2 text-xs text-zinc-600"
                >
                  <span
                    className={
                      band.requiresComplementaryActivity
                        ? "h-2.5 w-2.5 rounded-sm bg-red-600"
                        : "h-2.5 w-2.5 rounded-sm bg-zinc-600"
                    }
                  />

                  <span className="font-semibold">
                    {
                      band.name
                    }
                  </span>

                  <span className="text-zinc-400">
                    {
                      band.minPercentage
                    }
                    %–
                    {
                      band.maxPercentage
                    }
                    %
                  </span>
                </div>
              ),
            )}
          </div>

          {bands.length ===
          0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-8 text-center">
              <p className="font-semibold text-zinc-800">
                Nenhuma faixa criada
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                Crie sua primeira faixa de desempenho para começar a classificar
                os resultados.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4">
        {orderedBands.map(
          (
            band,
            index,
          ) => (
            <article
              key={
                band.id
              }
              className="rounded-xl border border-zinc-200 bg-white p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold text-zinc-500">
                    {
                      index +
                      1
                    }
                  </span>

                  <input
                    type="text"
                    value={
                      band.name
                    }
                    maxLength={
                      100
                    }
                    disabled={
                      isPending
                    }
                    onChange={(
                      event,
                    ) => {
                      const name =
                        event.target
                          .value;

                      updateBand(
                        band.id,
                        (
                          current,
                        ) => ({
                          ...current,
                          name,
                        }),
                      );
                    }}
                    aria-label={`Nome da faixa ${index + 1}`}
                    className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-zinc-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleDeleteBand(
                      band.id,
                    )
                  }
                  disabled={
                    isPending
                  }
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm font-semibold text-zinc-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2
                    size={15}
                  />

                  Excluir
                </button>
              </div>

              <div className="mt-6 rounded-xl bg-zinc-50 p-4">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-800">
                    Intervalo
                  </p>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-zinc-700 ring-1 ring-zinc-200">
                    {
                      band.minPercentage
                    }
                    % até{" "}
                    {
                      band.maxPercentage
                    }
                    %
                  </span>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <label
                        htmlFor={`band-${band.id}-min`}
                        className="text-sm font-semibold text-zinc-700"
                      >
                        Início da faixa
                      </label>

                      <span className="text-sm font-bold text-zinc-900">
                        {
                          band.minPercentage
                        }
                        %
                      </span>
                    </div>

                    <input
                      id={`band-${band.id}-min`}
                      type="range"
                      min={
                        0
                      }
                      max={
                        100
                      }
                      step={
                        1
                      }
                      value={
                        band.minPercentage
                      }
                      disabled={
                        isPending
                      }
                      onChange={(
                        event,
                      ) => {
                        const value =
                          clamp(
                            Number(
                              event
                                .target
                                .value,
                            ),
                            0,
                            100,
                          );

                        updateBand(
                          band.id,
                          (
                            current,
                          ) => ({
                            ...current,

                            minPercentage:
                              Math.min(
                                value,
                                current.maxPercentage,
                              ),
                          }),
                        );
                      }}
                      className="mt-4 w-full cursor-pointer accent-red-600 disabled:cursor-not-allowed"
                    />

                    <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
                      <input
                        type="number"
                        min={
                          0
                        }
                        max={
                          100
                        }
                        value={
                          band.minPercentage
                        }
                        disabled={
                          isPending
                        }
                        onChange={(
                          event,
                        ) => {
                          const raw =
                            Number(
                              event
                                .target
                                .value,
                            );

                          const value =
                            Number.isFinite(
                              raw,
                            )
                              ? clamp(
                                  raw,
                                  0,
                                  100,
                                )
                              : 0;

                          updateBand(
                            band.id,
                            (
                              current,
                            ) => ({
                              ...current,

                              minPercentage:
                                Math.min(
                                  value,
                                  current.maxPercentage,
                                ),
                            }),
                          );
                        }}
                        aria-label={`Valor mínimo da faixa ${band.name}`}
                        className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-zinc-100"
                      />

                      <span className="text-sm font-semibold text-zinc-400">
                        %
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <label
                        htmlFor={`band-${band.id}-max`}
                        className="text-sm font-semibold text-zinc-700"
                      >
                        Fim da faixa
                      </label>

                      <span className="text-sm font-bold text-zinc-900">
                        {
                          band.maxPercentage
                        }
                        %
                      </span>
                    </div>

                    <input
                      id={`band-${band.id}-max`}
                      type="range"
                      min={
                        0
                      }
                      max={
                        100
                      }
                      step={
                        1
                      }
                      value={
                        band.maxPercentage
                      }
                      disabled={
                        isPending
                      }
                      onChange={(
                        event,
                      ) => {
                        const value =
                          clamp(
                            Number(
                              event
                                .target
                                .value,
                            ),
                            0,
                            100,
                          );

                        updateBand(
                          band.id,
                          (
                            current,
                          ) => ({
                            ...current,

                            maxPercentage:
                              Math.max(
                                value,
                                current.minPercentage,
                              ),
                          }),
                        );
                      }}
                      className="mt-4 w-full cursor-pointer accent-red-600 disabled:cursor-not-allowed"
                    />

                    <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
                      <input
                        type="number"
                        min={
                          0
                        }
                        max={
                          100
                        }
                        value={
                          band.maxPercentage
                        }
                        disabled={
                          isPending
                        }
                        onChange={(
                          event,
                        ) => {
                          const raw =
                            Number(
                              event
                                .target
                                .value,
                            );

                          const value =
                            Number.isFinite(
                              raw,
                            )
                              ? clamp(
                                  raw,
                                  0,
                                  100,
                                )
                              : 100;

                          updateBand(
                            band.id,
                            (
                              current,
                            ) => ({
                              ...current,

                              maxPercentage:
                                Math.max(
                                  value,
                                  current.minPercentage,
                                ),
                            }),
                          );
                        }}
                        aria-label={`Valor máximo da faixa ${band.name}`}
                        className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-zinc-100"
                      />

                      <span className="text-sm font-semibold text-zinc-400">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative mt-6 h-3 rounded-full bg-zinc-200">
                  <div
                    style={getBandBarStyle(
                      band.minPercentage,
                      band.maxPercentage,
                    )}
                    className={
                      band.requiresComplementaryActivity
                        ? "absolute bottom-0 top-0 rounded-full bg-red-600 transition-all duration-200 ease-out"
                        : "absolute bottom-0 top-0 rounded-full bg-zinc-600 transition-all duration-200 ease-out"
                    }
                  />
                </div>
              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 p-4 transition hover:bg-zinc-50">
                <input
                  type="checkbox"
                  checked={
                    band.requiresComplementaryActivity
                  }
                  disabled={
                    isPending
                  }
                  onChange={(
                    event,
                  ) => {
                    const checked =
                      event.target
                        .checked;

                    updateBand(
                      band.id,
                      (
                        current,
                      ) => ({
                        ...current,

                        requiresComplementaryActivity:
                          checked,
                      }),
                    );
                  }}
                  className="mt-0.5 h-4 w-4 accent-red-600"
                />

                <span>
                  <span className="block text-sm font-semibold text-zinc-900">
                    Requer atividade complementar
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-zinc-500">
                    Os alunos classificados nesta faixa entrarão na lista de
                    alunos que precisam de atividade complementar.
                  </span>
                </span>
              </label>
            </article>
          ),
        )}
      </section>

      {validationError ? (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="font-semibold">
              Revise a configuração
            </p>

            <p className="mt-1">
              {
                validationError
              }
            </p>
          </div>
        </div>
      ) : null}

      {actionError ? (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="font-semibold">
              Não foi possível salvar
            </p>

            <p className="mt-1">
              {
                actionError
              }
            </p>
          </div>
        </div>
      ) : null}

      {successMessage ? (
        <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />

          <p className="font-semibold">
            {
              successMessage
            }
          </p>
        </div>
      ) : null}

      <div className="sticky bottom-4 z-20 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              {bands.length}{" "}
              {bands.length === 1
                ? "faixa"
                : "faixas"}
            </p>

            <p className="mt-0.5 text-xs text-zinc-500">
              {isDirty
                ? "Existem alterações não salvas."
                : "A configuração está salva."}
            </p>
          </div>

          <button
            type="button"
            onClick={
              handleSave
            }
            disabled={
              isPending ||
              !isDirty ||
              Boolean(
                validationError,
              )
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            <Save
              size={16}
            />

            {isPending
              ? "Salvando..."
              : "Salvar faixas"}
          </button>
        </div>
      </div>
    </div>
  );
}
"use client";

import {
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  RefreshCcw,
  Send,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type ClassroomCourse = {
  id: string;
  name: string;
  section: string | null;
  state: string | null;
};

type ClassroomPublication = {
  id: string;

  googleCourseId: string;

  googleCourseName:
    string | null;

  googleCourseWorkId:
    string | null;

  googleCourseWorkState:
    string | null;

  status:
    | "PENDING"
    | "CREATED"
    | "FAILED";

  errorMessage:
    string | null;

  classroomCreatedAt:
    string | null;

  createdAt:
    string;

  updatedAt:
    string;
};

type CoursesResponse = {
  connected?: boolean;

  requiresConnection?: boolean;

  error?: string;

  courses?: ClassroomCourse[];
};

type PublicationsResponse = {
  error?: string;

  publications?:
    ClassroomPublication[];
};

type PublishResponse = {
  ok?: boolean;

  message?: string;

  error?: string;

  requiresConnection?: boolean;

  publication?:
    ClassroomPublication;
};

type Feedback = {
  type:
    | "success"
    | "error";

  message: string;
} | null;

export function JourneyClassroomPublisher({
  activityId,
  returnTo,
}: {
  activityId: string;
  returnTo: string;
}) {
  const [
    courses,
    setCourses,
  ] =
    useState<
      ClassroomCourse[]
    >([]);

  const [
    publications,
    setPublications,
  ] =
    useState<
      ClassroomPublication[]
    >([]);

  const [
    selectedCourseId,
    setSelectedCourseId,
  ] =
    useState("");

  const [
    requiresConnection,
    setRequiresConnection,
  ] =
    useState(false);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isPublishing,
    setIsPublishing,
  ] =
    useState(false);

  const [
    feedback,
    setFeedback,
  ] =
    useState<Feedback>(
      null,
    );

  const loadData =
    useCallback(
      async () => {
        setIsLoading(
          true,
        );

        try {
          const [
            coursesResponse,
            publicationsResponse,
          ] =
            await Promise.all([
              fetch(
                "/api/google/classroom/courses",
                {
                  method:
                    "GET",

                  cache:
                    "no-store",
                },
              ),

              fetch(
                `/api/google/classroom/coursework?activityId=${encodeURIComponent(
                  activityId,
                )}`,
                {
                  method:
                    "GET",

                  cache:
                    "no-store",
                },
              ),
            ]);

          const coursesData =
            (await coursesResponse.json()) as CoursesResponse;

          const publicationsData =
            (await publicationsResponse.json()) as PublicationsResponse;

          if (
            publicationsResponse.ok
          ) {
            setPublications(
              publicationsData
                .publications ??
                [],
            );
          }

          if (
            !coursesResponse.ok
          ) {
            if (
              coursesData.requiresConnection
            ) {
              setRequiresConnection(
                true,
              );

              setCourses(
                [],
              );

              return;
            }

            throw new Error(
              coursesData.error ??
                "Não foi possível carregar as turmas do Google Classroom.",
            );
          }

          setRequiresConnection(
            false,
          );

          setCourses(
            coursesData.courses ??
              [],
          );
        } catch (
          error
        ) {
          setFeedback({
            type:
              "error",

            message:
              error instanceof Error
                ? error.message
                : "Não foi possível carregar a integração com o Google Classroom.",
          });
        } finally {
          setIsLoading(
            false,
          );
        }
      },
      [
        activityId,
      ],
    );

  useEffect(() => {
    void loadData();
  }, [
    loadData,
  ]);

  const publicationByCourseId =
    useMemo(
      () =>
        new Map(
          publications.map(
            (
              publication,
            ) => [
              publication
                .googleCourseId,

              publication,
            ],
          ),
        ),
      [
        publications,
      ],
    );

  const selectableCourses =
    useMemo(
      () =>
        courses.filter(
          (course) => {
            const publication =
              publicationByCourseId.get(
                course.id,
              );

            if (
              !publication
            ) {
              return true;
            }

            if (
              publication.status ===
              "FAILED"
            ) {
              return true;
            }

            if (
              publication.status ===
                "CREATED" &&
              publication
                .googleCourseWorkState ===
                "DRAFT"
            ) {
              return true;
            }

            return false;
          },
        ),
      [
        courses,
        publicationByCourseId,
      ],
    );

  const selectedPublication =
    useMemo(
      () =>
        selectedCourseId
          ? publicationByCourseId.get(
              selectedCourseId,
            ) ?? null
          : null,
      [
        publicationByCourseId,
        selectedCourseId,
      ],
    );

  useEffect(() => {
    if (
      selectedCourseId &&
      selectableCourses.some(
        (course) =>
          course.id ===
          selectedCourseId,
      )
    ) {
      return;
    }

    setSelectedCourseId(
      selectableCourses[0]
        ?.id ??
        "",
    );
  }, [
    selectableCourses,
    selectedCourseId,
  ]);

  async function publishDraft() {
    if (
      !selectedCourseId ||
      isPublishing
    ) {
      return;
    }

    setIsPublishing(
      true,
    );

    setFeedback(
      null,
    );

    try {
      const response =
        await fetch(
          "/api/google/classroom/coursework",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                activityId,

                courseId:
                  selectedCourseId,
              }),
          },
        );

      const data =
        (await response.json()) as PublishResponse;

      if (
        !response.ok
      ) {
        if (
          data.requiresConnection
        ) {
          setRequiresConnection(
            true,
          );
        }

        throw new Error(
          data.error ??
            "Não foi possível criar o rascunho no Google Classroom.",
        );
      }

      setFeedback({
        type:
          "success",

        message:
          data.message ??
          "Rascunho criado no Google Classroom.",
      });

      await loadData();
    } catch (
      error
    ) {
      setFeedback({
        type:
          "error",

        message:
          error instanceof Error
            ? error.message
            : "Não foi possível criar o rascunho no Google Classroom.",
      });

      await loadData();
    } finally {
      setIsPublishing(
        false,
      );
    }
  }

  const connectUrl =
    `/api/google/classroom/auth?returnTo=${encodeURIComponent(
      returnTo,
    )}`;

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Send
                size={
                  15
                }
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-zinc-950">
                Google Classroom
              </p>

              <p className="mt-0.5 text-xs text-zinc-500">
                Envie esta atividade aprovada como rascunho para uma turma em que você é professor.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadData()
          }
          disabled={
            isLoading ||
            isPublishing
          }
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCcw
            size={
              14
            }
            className={
              isLoading
                ? "animate-spin"
                : ""
            }
          />

          Atualizar
        </button>
      </div>

      {feedback && (
        <div
          className={`mt-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-5 ${
            feedback.type ===
            "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {feedback.type ===
          "error" ? (
            <CircleAlert
              size={
                15
              }
              className="mt-0.5 shrink-0"
            />
          ) : (
            <CheckCircle2
              size={
                15
              }
              className="mt-0.5 shrink-0"
            />
          )}

          <span>
            {
              feedback.message
            }
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-4 text-xs text-zinc-500">
          <LoaderCircle
            size={
              15
            }
            className="animate-spin"
          />

          Carregando turmas e publicações...
        </div>
      ) : requiresConnection ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Conexão com o Google necessária
          </p>

          <p className="mt-1 text-xs leading-5 text-amber-800">
            Conecte ou autorize novamente sua conta Google para continuar.
          </p>

          <a
            href={
              connectUrl
            }
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-amber-800"
          >
            <ExternalLink
              size={
                14
              }
            />

            Conectar Google Classroom
          </a>
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Turma de destino
              </span>

              <select
                value={
                  selectedCourseId
                }
                onChange={(
                  event,
                ) =>
                  setSelectedCourseId(
                    event
                      .target
                      .value,
                  )
                }
                disabled={
                  selectableCourses.length ===
                    0 ||
                  isPublishing
                }
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                {selectableCourses.length ===
                0 ? (
                  <option value="">
                    Nenhuma turma disponível
                  </option>
                ) : (
                  selectableCourses.map(
                    (
                      course,
                    ) => (
                      <option
                        key={
                          course.id
                        }
                        value={
                          course.id
                        }
                      >
                        {
                          course.name
                        }

                        {course.section
                          ? ` — ${course.section}`
                          : ""}
                      </option>
                    ),
                  )
                )}
              </select>
            </label>

            <button
              type="button"
              onClick={
                publishDraft
              }
              disabled={
                !selectedCourseId ||
                isPublishing
              }
              className="performance-primary-action inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPublishing ? (
                <LoaderCircle
                  size={
                    15
                  }
                  className="animate-spin"
                />
              ) : (
                <Send
                  size={
                    15
                  }
                />
              )}

              {isPublishing
                ? "Enviando..."
                : selectedPublication?.status ===
                      "CREATED" &&
                    selectedPublication
                      .googleCourseWorkState ===
                      "DRAFT"
                  ? "Atualizar rascunho"
                  : selectedPublication?.status ===
                      "FAILED"
                    ? "Tentar novamente"
                    : "Criar rascunho"}
            </button>
          </div>

          {courses.length ===
            0 && (
            <div className="mt-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs leading-5 text-zinc-500">
              Nenhuma turma ativa em que esta conta seja professora foi encontrada.
            </div>
          )}

          {publications.length >
            0 && (
            <div className="mt-5 border-t border-blue-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Envios desta atividade
              </p>

              <div className="mt-3 space-y-2">
                {publications.map(
                  (
                    publication,
                  ) => (
                    <PublicationRow
                      key={
                        publication.id
                      }
                      publication={
                        publication
                      }
                    />
                  ),
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PublicationRow({
  publication,
}: {
  publication:
    ClassroomPublication;
}) {
  const isCreated =
    publication.status ===
    "CREATED";

  const isPending =
    publication.status ===
    "PENDING";

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-zinc-800">
          {publication.googleCourseName ??
            publication.googleCourseId}
        </p>

        <p className="mt-1 text-[11px] text-zinc-500">
          {isCreated
            ? `Rascunho criado${
                publication.googleCourseWorkId
                  ? ` · ID ${publication.googleCourseWorkId}`
                  : ""
              }`
            : isPending
              ? "Envio em andamento"
              : publication.errorMessage ??
                "O último envio falhou."}
        </p>
      </div>

      <span
        className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
          isCreated
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : isPending
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-red-200 bg-red-50 text-red-700"
        }`}
      >
        {isCreated ? (
          <CheckCircle2
            size={
              12
            }
          />
        ) : isPending ? (
          <LoaderCircle
            size={
              12
            }
            className="animate-spin"
          />
        ) : (
          <CircleAlert
            size={
              12
            }
          />
        )}

        {isCreated
          ? publication.googleCourseWorkState ===
            "DRAFT"
            ? "Rascunho"
            : "Criado"
          : isPending
            ? "Enviando"
            : "Falhou"}
      </span>
    </div>
  );
}
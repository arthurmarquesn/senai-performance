"use client";

import type {
  JourneyMindMapNode,
  JourneyMindMapNodeStatus,
  JourneyMindMapNodeType,
} from "@/lib/journeys/mind-map-types";

import {
  parseJourneyMindMapStructure,
} from "@/lib/journeys/mind-map-types";

import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  ListTree,
  Map,
  Maximize2,
  Minimize2,
  ShieldCheck,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

export function JourneyMindMapView({
  structure,
}: {
  structure: unknown;
}) {
  const parsed =
    useMemo(
      () =>
        parseJourneyMindMapStructure(
          structure,
        ),
      [structure],
    );

  const allExpandableIds =
    useMemo(() => {
      if (!parsed) {
        return [];
      }

      return collectExpandableIds(
        parsed.root,
      );
    }, [parsed]);

  const initialExpanded =
    useMemo(() => {
      if (!parsed) {
        return [];
      }

      return collectInitialExpandedIds(
        parsed.root,
        2,
      );
    }, [parsed]);

  const [
    expanded,
    setExpanded,
  ] =
    useState<Set<string>>(
      () =>
        new Set(
          initialExpanded,
        ),
    );

  if (!parsed) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        A estrutura do mapa mental não pôde ser interpretada.
      </div>
    );
  }

  // Depois desta validação, capturamos os valores que
  // serão utilizados dentro das funções locais.
  //
  // Isso evita o erro:
  // "'parsed' is possibly 'null'"
  const root =
    parsed.root;

  const rootId =
    root.id;

  function toggle(
    nodeId: string,
  ) {
    setExpanded(
      (current) => {
        const next =
          new Set(
            current,
          );

        if (
          next.has(
            nodeId,
          )
        ) {
          next.delete(
            nodeId,
          );
        } else {
          next.add(
            nodeId,
          );
        }

        return next;
      },
    );
  }

  function expandAll() {
    setExpanded(
      new Set(
        allExpandableIds,
      ),
    );
  }

  function collapseAll() {
    setExpanded(
      new Set([
        rootId,
      ]),
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-relaxed text-zinc-500">
          Clique nos nós para expandir ou recolher cada ramo.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={
              expandAll
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            <Maximize2
              size={14}
            />

            Expandir tudo
          </button>

          <button
            type="button"
            onClick={
              collapseAll
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            <Minimize2
              size={14}
            />

            Recolher
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-zinc-200 bg-zinc-50/70 p-4 md:p-6">
        <div className="min-w-[680px]">
          <MindMapBranch
            node={
              root
            }
            depth={0}
            expanded={
              expanded
            }
            onToggle={
              toggle
            }
          />
        </div>
      </div>
    </div>
  );
}

function collectExpandableIds(
  node:
    JourneyMindMapNode,
): string[] {
  const result:
    string[] = [];

  if (
    node.children &&
    node.children.length >
      0
  ) {
    result.push(
      node.id,
    );

    for (
      const child of
      node.children
    ) {
      result.push(
        ...collectExpandableIds(
          child,
        ),
      );
    }
  }

  return result;
}

function collectInitialExpandedIds(
  node:
    JourneyMindMapNode,
  maxDepth:
    number,
  depth = 0,
): string[] {
  const result:
    string[] = [];

  if (
    node.children &&
    node.children.length >
      0 &&
    depth <=
      maxDepth
  ) {
    result.push(
      node.id,
    );

    for (
      const child of
      node.children
    ) {
      result.push(
        ...collectInitialExpandedIds(
          child,
          maxDepth,
          depth + 1,
        ),
      );
    }
  }

  return result;
}

function MindMapBranch({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node:
    JourneyMindMapNode;

  depth:
    number;

  expanded:
    Set<string>;

  onToggle:
    (
      nodeId: string,
    ) => void;
}) {
  const hasChildren =
    Boolean(
      node.children &&
        node.children.length >
          0,
    );

  const isExpanded =
    expanded.has(
      node.id,
    );

  return (
    <div
      className={
        depth === 0
          ? ""
          : "relative ml-7 border-l border-zinc-200 pl-6"
      }
    >
      {depth >
        0 && (
        <span className="absolute -left-px top-7 h-px w-6 -translate-x-full bg-zinc-200" />
      )}

      <button
        type="button"
        onClick={() => {
          if (
            hasChildren
          ) {
            onToggle(
              node.id,
            );
          }
        }}
        className={`group flex w-full max-w-3xl items-start gap-3 rounded-2xl border p-4 text-left transition ${nodeClasses(
          node.type,
          node.status,
        )} ${
          hasChildren
            ? "cursor-pointer hover:-translate-y-px hover:shadow-sm"
            : "cursor-default"
        }`}
      >
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm ring-1 ring-black/5">
          <NodeIcon
            type={
              node.type
            }
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-zinc-500">
              {
                nodeTypeLabel(
                  node.type,
                )
              }
            </span>

            {node.status ===
              "APPROVED" && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-700">
                Validada
              </span>
            )}

            {node.status ===
              "SUGGESTED" && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-bold text-amber-700">
                Sugerida
              </span>
            )}
          </div>

          <p className="mt-1 text-sm font-semibold leading-6 text-zinc-950">
            {
              node.label
            }
          </p>

          {node.description && (
            <p className="mt-1.5 text-xs leading-5 text-zinc-600">
              {
                node.description
              }
            </p>
          )}

          {node.tags &&
            node.tags.length >
              0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {node.tags.map(
                  (tag) => (
                    <span
                      key={
                        tag
                      }
                      className="rounded-full border border-zinc-200/80 bg-white/70 px-2 py-0.5 text-[0.65rem] font-medium text-zinc-500"
                    >
                      {
                        tag
                      }
                    </span>
                  ),
                )}
              </div>
            )}
        </div>

        {hasChildren && (
          <div className="mt-1 text-zinc-400">
            {isExpanded ? (
              <ChevronDown
                size={18}
              />
            ) : (
              <ChevronRight
                size={18}
              />
            )}
          </div>
        )}
      </button>

      {hasChildren &&
        isExpanded && (
        <div className="mt-3 space-y-3">
          {node.children!.map(
            (child) => (
              <MindMapBranch
                key={
                  child.id
                }
                node={
                  child
                }
                depth={
                  depth + 1
                }
                expanded={
                  expanded
                }
                onToggle={
                  onToggle
                }
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function NodeIcon({
  type,
}: {
  type:
    JourneyMindMapNodeType;
}) {
  switch (type) {
    case "JOURNEY":
      return (
        <Map
          size={17}
          className="text-red-600"
        />
      );

    case "SUBJECT":
      return (
        <BookOpen
          size={17}
          className="text-blue-600"
        />
      );

    case "SUGGESTION":
      return (
        <Lightbulb
          size={17}
          className="text-amber-600"
        />
      );

    case "CONTENT":
      return (
        <ListTree
          size={17}
          className="text-violet-600"
        />
      );

    case "BNCC":
      return (
        <ShieldCheck
          size={17}
          className="text-emerald-600"
        />
      );
  }
}

function nodeTypeLabel(
  type:
    JourneyMindMapNodeType,
): string {
  switch (type) {
    case "JOURNEY":
      return "Jornada";

    case "SUBJECT":
      return "Disciplina";

    case "SUGGESTION":
      return "Sugestão";

    case "CONTENT":
      return "Conteúdo";

    case "BNCC":
      return "BNCC";
  }
}

function nodeClasses(
  type:
    JourneyMindMapNodeType,
  status?:
    JourneyMindMapNodeStatus,
): string {
  if (
    type ===
      "BNCC" &&
    status ===
      "APPROVED"
  ) {
    return "border-emerald-200 bg-emerald-50/80";
  }

  if (
    type ===
    "BNCC"
  ) {
    return "border-amber-200 bg-amber-50/70";
  }

  switch (type) {
    case "JOURNEY":
      return "border-red-200 bg-red-50/70";

    case "SUBJECT":
      return "border-blue-200 bg-blue-50/60";

    case "SUGGESTION":
      return "border-zinc-200 bg-white";

    case "CONTENT":
      return "border-violet-100 bg-violet-50/50";

    default:
      return "border-zinc-200 bg-white";
  }
}
export type JourneyMindMapNodeType =
  | "JOURNEY"
  | "SUBJECT"
  | "SUGGESTION"
  | "CONTENT"
  | "BNCC";

export type JourneyMindMapNodeStatus =
  | "SUGGESTED"
  | "APPROVED";

export type JourneyMindMapNode = {
  id: string;

  type:
    JourneyMindMapNodeType;

  label: string;

  description?: string;

  referenceId?: string;

  status?:
    JourneyMindMapNodeStatus;

  tags?: string[];

  children?:
    JourneyMindMapNode[];
};

export type JourneyMindMapStructure = {
  schemaVersion: 1;

  root:
    JourneyMindMapNode;
};

const NODE_TYPES =
  new Set<JourneyMindMapNodeType>([
    "JOURNEY",
    "SUBJECT",
    "SUGGESTION",
    "CONTENT",
    "BNCC",
  ]);

const NODE_STATUSES =
  new Set<JourneyMindMapNodeStatus>([
    "SUGGESTED",
    "APPROVED",
  ]);

function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function parseNode(
  value: unknown,
): JourneyMindMapNode | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !==
      "string" ||
    typeof value.type !==
      "string" ||
    typeof value.label !==
      "string"
  ) {
    return null;
  }

  if (
    !NODE_TYPES.has(
      value.type as
        JourneyMindMapNodeType,
    )
  ) {
    return null;
  }

  const node:
    JourneyMindMapNode = {
      id:
        value.id,

      type:
        value.type as
          JourneyMindMapNodeType,

      label:
        value.label,
    };

  if (
    typeof value.description ===
    "string"
  ) {
    node.description =
      value.description;
  }

  if (
    typeof value.referenceId ===
    "string"
  ) {
    node.referenceId =
      value.referenceId;
  }

  if (
    typeof value.status ===
      "string" &&
    NODE_STATUSES.has(
      value.status as
        JourneyMindMapNodeStatus,
    )
  ) {
    node.status =
      value.status as
        JourneyMindMapNodeStatus;
  }

  if (
    Array.isArray(
      value.tags,
    )
  ) {
    node.tags =
      value.tags.filter(
        (
          item,
        ): item is string =>
          typeof item ===
          "string",
      );
  }

  if (
    Array.isArray(
      value.children,
    )
  ) {
    const children =
      value.children
        .map(parseNode)
        .filter(
          (
            child,
          ): child is
            JourneyMindMapNode =>
            child !== null,
        );

    if (
      children.length > 0
    ) {
      node.children =
        children;
    }
  }

  return node;
}

export function parseJourneyMindMapStructure(
  value: unknown,
): JourneyMindMapStructure | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    value.schemaVersion !==
    1
  ) {
    return null;
  }

  const root =
    parseNode(
      value.root,
    );

  if (!root) {
    return null;
  }

  return {
    schemaVersion:
      1,

    root,
  };
}
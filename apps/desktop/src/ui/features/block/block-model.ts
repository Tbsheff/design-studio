import { copy } from "./copy.js";
import type { RouteInput, RouteOutput, blockRoutes } from "./deps.js";

type ListInput = RouteInput<typeof blockRoutes.listBlock>;

type ListOutput = RouteOutput<typeof blockRoutes.listBlock>;

type InsertInput = RouteInput<typeof blockRoutes.insertBlock>;

type InsertOutput = RouteOutput<typeof blockRoutes.insertBlock>;

type BlockItem = ListOutput["items"][number];

type BlockKind = BlockItem["kind"];

type KindFilter = BlockKind | null;

interface KindOption {
  readonly id: KindFilter;
  readonly label: string;
}

type WireCell = "box" | "button" | "chip" | "line" | "short";

interface WireRow {
  readonly cells: readonly { readonly cell: WireCell; readonly id: string }[];
  readonly id: string;
}

const KIND_OPTIONS: readonly KindOption[] = [
  { id: null, label: copy.allKinds },
  { id: "stats", label: copy.kindStats },
  { id: "table", label: copy.kindTable },
  { id: "detail-header", label: copy.kindDetailHeader },
  { id: "form", label: copy.kindForm },
  { id: "empty-state", label: copy.kindEmptyState },
  { id: "auth", label: copy.kindAuth },
  { id: "list-detail", label: copy.kindListDetail },
  { id: "page-header", label: copy.kindPageHeader },
];

const WIREFRAMES: Readonly<
  Record<BlockKind, readonly (readonly WireCell[])[]>
> = {
  auth: [["short"], ["line"], ["line"], ["button"]],
  "detail-header": [
    ["short", "chip", "button"],
    ["short", "short", "short"],
    ["line"],
  ],
  "empty-state": [["short"], ["line"], ["button", "button"]],
  form: [["short"], ["line"], ["line"], ["line"], ["button", "button"]],
  "list-detail": [
    ["box", "box"],
    ["box", "box"],
  ],
  "page-header": [["short", "button"], ["line"]],
  stats: [["box", "box", "box", "box"]],
  table: [["short", "button"], ["line"], ["line"], ["line"], ["line"]],
};

const LIST_LIMIT = 50;

const toWireRows = (kind: BlockKind): readonly WireRow[] =>
  WIREFRAMES[kind].map((cells, row) => ({
    cells: cells.map((cell, index) => ({ cell, id: `${cell}-${index}` })),
    id: `${kind}-${row}`,
  }));

const toListInput = (projectId: string, kind: KindFilter): ListInput => {
  const cursor = null;
  const limit = LIST_LIMIT;
  const query = null;

  return { cursor, kind, limit, projectId, query };
};

const toInsertInput = (
  projectId: string,
  directionId: string | null,
  blockId: string,
  selectionSource: string | null
): InsertInput => {
  const targetSelector = null;
  let position: InsertInput["position"] = "inside";

  if (selectionSource !== null) {
    position = "after";
  }

  return {
    blockId,
    directionId,
    position,
    projectId,
    targetSelector,
    targetSource: selectionSource,
  };
};

export { KIND_OPTIONS, toInsertInput, toListInput, toWireRows };

export type {
  BlockItem,
  BlockKind,
  InsertOutput,
  KindFilter,
  KindOption,
  ListOutput,
  WireCell,
  WireRow,
};

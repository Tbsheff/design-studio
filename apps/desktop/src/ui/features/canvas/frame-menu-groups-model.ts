import type { IconName } from "@design-studio/ui";

import { copy } from "./copy.js";

interface FrameMenuEntry {
  readonly disabled?: string;
  readonly icon: IconName;
  readonly id: string;
  readonly label: string;
  readonly run: () => void;
}

interface FrameMenuGroup {
  readonly icon: IconName;
  readonly id: string;
  readonly label: string;
}

interface FrameMenuItemRow {
  readonly entry: FrameMenuEntry;
  readonly kind: "item";
}

interface FrameMenuGroupRow {
  readonly entries: readonly FrameMenuEntry[];
  readonly group: FrameMenuGroup;
  readonly kind: "group";
}

type FrameMenuRow = FrameMenuGroupRow | FrameMenuItemRow;

interface FrameMenuGroupSpec {
  readonly group: FrameMenuGroup;
  readonly items: readonly string[];
}

interface RankedRow {
  readonly rank: number;
  readonly row: FrameMenuRow;
}

const FRAME_MENU_GROUPS: readonly FrameMenuGroupSpec[] = [
  {
    group: { icon: "layers", id: "states", label: copy.frameMenuStates },
    items: ["show-all-states", "states"],
  },
  {
    group: { icon: "copy", id: "copy", label: copy.frameMenuCopy },
    items: ["duplicate-screen", "copy-png", "copy-share-link"],
  },
  {
    group: { icon: "frame", id: "arrange", label: copy.frameMenuArrange },
    items: [
      "tidy-frames",
      "fit-frame",
      "section",
      "layout-grid",
      "hide",
    ],
  },
];

const FRAME_MENU_TOP_ORDER: readonly string[] = [
  "page",
  "preview-dark",
  "redesign-prototype",
  "port-to-app",
  "group:states",
  "group:copy",
  "group:arrange",
  "style-reference",
];

const FRAME_MENU_LAST = "remove-frame";

const GROUPED_IDS = new Set(FRAME_MENU_GROUPS.flatMap((spec) => spec.items));

const toRank = (key: string, index: number): number => {
  const known = FRAME_MENU_TOP_ORDER.indexOf(key);

  if (key === FRAME_MENU_LAST) {
    return Number.MAX_SAFE_INTEGER;
  }

  if (known === -1) {
    return FRAME_MENU_TOP_ORDER.length + index;
  }

  return known;
};

const toGroupRanked = (
  spec: FrameMenuGroupSpec,
  byId: ReadonlyMap<string, FrameMenuEntry>
): RankedRow[] => {
  const entries = spec.items.flatMap((id) => {
    const entry = byId.get(id);

    if (entry) {
      return [entry];
    }

    return [];
  });

  if (entries.length === 0) {
    return [];
  }

  return [
    {
      rank: toRank(`group:${spec.group.id}`, 0),
      row: { entries, group: spec.group, kind: "group" },
    },
  ];
};

const toFrameMenuRows = (
  entries: readonly FrameMenuEntry[]
): readonly FrameMenuRow[] => {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const ranked: RankedRow[] = [];

  for (const [index, entry] of entries.entries()) {
    if (!GROUPED_IDS.has(entry.id)) {
      ranked.push({
        rank: toRank(entry.id, index),
        row: { entry, kind: "item" },
      });
    }
  }

  for (const spec of FRAME_MENU_GROUPS) {
    ranked.push(...toGroupRanked(spec, byId));
  }

  return ranked
    .toSorted((left, right) => left.rank - right.rank)
    .map((item) => item.row);
};

export { toFrameMenuRows };

export type { FrameMenuEntry, FrameMenuGroup, FrameMenuGroupRow, FrameMenuRow };

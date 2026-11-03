import type { MutableRefObject } from "react";

import type { ArrangeAction, ArrangeResult } from "../../../shared/arrange.js";
import type { SelectionContext } from "../../../shared/contracts.js";
import type { KeyId } from "../../../shared/keymap.js";
import type { PreviewPort } from "../../bridge.js";
import { activeFrame, canvasStore, defaultLayout } from "../../canvasFrames.js";
import { parentLayout } from "../../sizing.js";
import { uiStore } from "../../storage.js";
import type {
  DirectEditCommit,
  DirectEditControl,
} from "../../useDirectEdit.js";

interface Props {
  projectId: string;
  directionId: string | null;
  selection: SelectionContext[];
  editable: boolean;
  port: MutableRefObject<PreviewPort | null>;
  control: MutableRefObject<DirectEditControl | null>;
  onCommitted: (commit: DirectEditCommit) => void;
  showBar: boolean;
}

type Message = { kind: "ok" | "note" | "error"; text: string };

interface Tool {
  key: KeyId;
  label: string;
  glyph: string;
  action: ArrangeAction;
}

const ALIGN_TOOLS: Tool[] = [
  {
    key: "align-left",
    label: "Align left",
    glyph: "M2.5 2v12M5 4.5h7V7H5zM5 9h4.5v2.5H5z",
    action: { align: "left" },
  },
  {
    key: "align-center",
    label: "Align horizontal centers",
    glyph: "M8 2v12M4 4.5h8V7H4zM5.5 9h5v2.5h-5z",
    action: { align: "center" },
  },
  {
    key: "align-right",
    label: "Align right",
    glyph: "M13.5 2v12M4 4.5h7V7H4zM6.5 9H11v2.5H6.5z",
    action: { align: "right" },
  },
  {
    key: "align-top",
    label: "Align top",
    glyph: "M2 2.5h12M4.5 5H7v7H4.5zM9 5h2.5v4.5H9z",
    action: { align: "top" },
  },
  {
    key: "align-middle",
    label: "Align vertical centers",
    glyph: "M2 8h12M4.5 4H7v8H4.5zM9 5.5h2.5v5H9z",
    action: { align: "middle" },
  },
  {
    key: "align-bottom",
    label: "Align bottom",
    glyph: "M2 13.5h12M4.5 4H7v7H4.5zM9 6.5h2.5V11H9z",
    action: { align: "bottom" },
  },
];

const SPACE_TOOLS: Tool[] = [
  {
    key: "distribute-h",
    label: "Distribute horizontal spacing",
    glyph: "M2.5 2v12M13.5 2v12M6.5 5h3v6h-3z",
    action: { distribute: "horizontal" },
  },
  {
    key: "distribute-v",
    label: "Distribute vertical spacing",
    glyph: "M2 2.5h12M2 13.5h12M5 6.5h6v3H5z",
    action: { distribute: "vertical" },
  },
  {
    key: "tidy-up",
    label: "Tidy up",
    glyph: "M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z",
    action: { tidy: true },
  },
];

const OK_MS = 3000;

function isAbsolute(selection: SelectionContext): boolean {
  const position = selection.styles.position ?? "";

  return position === "absolute" || position === "fixed";
}

function arrangeShown(selection: SelectionContext[]): boolean {
  if (selection.length > 1) {
    return true;
  }

  const only = selection[0];

  if (!only) {
    return false;
  }

  const parent = parentLayout(only.styles);

  return isAbsolute(only) || parent.flex || parent.grid;
}

function minCount(
  action: ArrangeAction,
  selection: SelectionContext[]
): number {
  if ("align" in action) {
    return 1;
  }

  if ("distribute" in action) {
    return selection.length > 0 && selection.every(isAbsolute) ? 3 : 2;
  }

  return 2;
}

function successText(result: ArrangeResult): string {
  const styles = result.writes.flatMap((w) => Object.entries(w.style));

  const set = styles
    .filter(([, value]) => value !== null)
    .map(([prop, value]) => `${prop}: ${value}`);

  const removed = [
    ...new Set(
      styles.filter(([, value]) => value === null).map(([prop]) => prop)
    ),
  ];

  const wrote =
    result.classes.length > 0
      ? `Wrote ${result.classes.join(" ")}`
      : set.length > 0
        ? `Wrote ${set.join("; ")}`
        : "";

  const parts = [
    wrote,
    removed.length > 0 ? `Removed ${removed.join(", ")}` : "",
    result.note,
  ];

  return parts.filter(Boolean).join(". ") || "Arranged";
}

function frameRequest(projectId: string): {
  path?: string;
  viewport: { width: number; height: number };
} {
  const frame = activeFrame(
    canvasStore.get(projectId) ?? defaultLayout(uiStore.get().viewport)
  );

  return {
    ...(frame.path ? { path: frame.path } : {}),
    viewport: { width: frame.width, height: frame.height },
  };
}

function commitWrites(props: Props, result: ArrangeResult): void {
  const selected = new Set(props.selection.map((s) => s.selector));

  for (const entry of result.writes) {
    if (!selected.has(entry.selector)) {
      continue;
    }

    const style = Object.fromEntries(
      Object.entries(entry.style).map(([prop, value]) => [prop, value ?? ""])
    );

    props.onCommitted({ selector: entry.selector, style });
  }

  props.port.current?.refreshRects();
}

export {
  ALIGN_TOOLS,
  OK_MS,
  SPACE_TOOLS,
  arrangeShown,
  commitWrites,
  minCount,
  successText,
};

export type { Message, Props, Tool };

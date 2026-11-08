import type { SelectionContext } from "@design-studio/contracts";
import type { MutableRefObject } from "react";

import type { ArrangeAction, ArrangeResult } from "../../../shared/arrange.js";
import type { KeyId } from "../../../shared/keymap.js";
import type { PreviewPort } from "../../platform/bridge.js";
import { uiStore } from "../../platform/storage.js";
import {
  activeFrame,
  canvasStore,
  defaultLayout,
} from "../canvas/canvas-frames-model.js";
import { parentLayout } from "./sizing.js";
import type { DirectEditCommit, DirectEditControl } from "./use-direct-edit.js";

interface Props {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selection: SelectionContext[];
  readonly isEditable: boolean;
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly control: MutableRefObject<DirectEditControl | null>;
  readonly onCommitted: (commit: DirectEditCommit) => void;
  readonly shouldShowBar: boolean;
}

interface Message {
  readonly kind: "ok" | "note" | "error";
  readonly text: string;
}

interface Tool {
  readonly key: KeyId;
  readonly label: string;
  readonly glyph: string;
  readonly action: ArrangeAction;
}

const ALIGN_TOOLS: Tool[] = [
  {
    action: { align: "left" },
    glyph: "M2.5 2v12M5 4.5h7V7H5zM5 9h4.5v2.5H5z",
    key: "align-left",
    label: "Align left",
  },
  {
    action: { align: "center" },
    glyph: "M8 2v12M4 4.5h8V7H4zM5.5 9h5v2.5h-5z",
    key: "align-center",
    label: "Align horizontal centers",
  },
  {
    action: { align: "right" },
    glyph: "M13.5 2v12M4 4.5h7V7H4zM6.5 9H11v2.5H6.5z",
    key: "align-right",
    label: "Align right",
  },
  {
    action: { align: "top" },
    glyph: "M2 2.5h12M4.5 5H7v7H4.5zM9 5h2.5v4.5H9z",
    key: "align-top",
    label: "Align top",
  },
  {
    action: { align: "middle" },
    glyph: "M2 8h12M4.5 4H7v8H4.5zM9 5.5h2.5v5H9z",
    key: "align-middle",
    label: "Align vertical centers",
  },
  {
    action: { align: "bottom" },
    glyph: "M2 13.5h12M4.5 4H7v7H4.5zM9 6.5h2.5V11H9z",
    key: "align-bottom",
    label: "Align bottom",
  },
];

const SPACE_TOOLS: Tool[] = [
  {
    action: { distribute: "horizontal" },
    glyph: "M2.5 2v12M13.5 2v12M6.5 5h3v6h-3z",
    key: "distribute-h",
    label: "Distribute horizontal spacing",
  },
  {
    action: { distribute: "vertical" },
    glyph: "M2 2.5h12M2 13.5h12M5 6.5h6v3H5z",
    key: "distribute-v",
    label: "Distribute vertical spacing",
  },
  {
    action: { tidy: true },
    glyph: "M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z",
    key: "tidy-up",
    label: "Tidy up",
  },
];

const OK_MS = 3000;

const isAbsolute = (selection: SelectionContext): boolean => {
  const position = selection.styles.position ?? "";

  return position === "absolute" || position === "fixed";
};

const isArrangeShown = (selection: SelectionContext[]): boolean => {
  if (selection.length > 1) {
    return true;
  }

  const only = selection[0];

  if (!only) {
    return false;
  }

  const parent = parentLayout(only.styles);

  return isAbsolute(only) || parent.isFlex || parent.isGrid;
};

const minCount = (
  action: ArrangeAction,
  selection: SelectionContext[]
): number => {
  if ("align" in action) {
    return 1;
  }

  if ("distribute" in action) {
    return selection.length > 0 && selection.every(isAbsolute) ? 3 : 2;
  }

  return 2;
};

const successText = (result: ArrangeResult): string => {
  const styles = result.writes.flatMap((arrangeWrite) =>
    Object.entries(arrangeWrite.style)
  );

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
};

const frameRequest = (
  projectId: string
): {
  readonly path?: string;
  readonly viewport: { readonly width: number; readonly height: number };
} => {
  const frame = activeFrame(
    canvasStore.get(projectId) ?? defaultLayout(uiStore.get().viewport)
  );

  return {
    ...(frame.path ? { path: frame.path } : {}),
    viewport: { height: frame.height, width: frame.width },
  };
};

const commitWrites = (props: Props, result: ArrangeResult): void => {
  const selected = new Set(
    props.selection.map((selectionContext) => selectionContext.selector)
  );

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
};

export {
  ALIGN_TOOLS,
  OK_MS,
  SPACE_TOOLS,
  isArrangeShown as arrangeShown,
  commitWrites,
  frameRequest,
  minCount,
  successText,
};

export type { Message, Props, Tool };

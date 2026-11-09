import type { SelectionContext } from "@design-studio/contracts";

import type { StyleValues } from "./css-value-model.js";

interface TruncateState {
  readonly isOn: boolean;
  readonly lines: number;
}

interface ClassChange {
  readonly add: string[];
  readonly remove: string[];
}

const MIN_LINES = 1;
const MAX_LINES = 6;
const DECIMAL = 10;

const OFF_STATE: TruncateState = { isOn: false, lines: MIN_LINES };

const CLAMP_RE = /^line-clamp-(?<lines>\d+)$/u;

const CONFLICT_RE =
  /^(?:whitespace-.+|overflow-(?:hidden|clip|visible|auto|scroll|ellipsis)|text-ellipsis|text-clip|truncate|line-clamp-.+)$/u;

const OWN_RE = /^(?:truncate|line-clamp-.+)$/u;

const toClampedLines = (raw: number): number => {
  if (!Number.isFinite(raw)) {
    return MIN_LINES;
  }

  return Math.min(MAX_LINES, Math.max(MIN_LINES, Math.round(raw)));
};

const toClassState = (classes: readonly string[]): TruncateState | null => {
  if (classes.includes("truncate")) {
    return { isOn: true, lines: MIN_LINES };
  }

  for (const name of classes) {
    const found = CLAMP_RE.exec(name)?.groups?.lines;

    if (found) {
      return { isOn: true, lines: toClampedLines(Number(found)) };
    }
  }

  return null;
};

const toStyleState = (values: Partial<StyleValues>): TruncateState => {
  const isClipped =
    values.overflow === "hidden" && values["text-overflow"] === "ellipsis";

  if (!isClipped) {
    return OFF_STATE;
  }

  const clamp = Number.parseInt(values["-webkit-line-clamp"] ?? "", DECIMAL);

  return { isOn: true, lines: toClampedLines(clamp) };
};

const toTruncateState = (
  classes: readonly string[] | null,
  values: Partial<StyleValues>
): TruncateState => {
  const fromStyle = toStyleState(values);

  if (classes === null) {
    return fromStyle;
  }

  return toClassState(classes) ?? fromStyle;
};

const toClassChange = (
  classes: readonly string[],
  next: TruncateState
): ClassChange => {
  let pattern = OWN_RE;

  if (next.isOn) {
    pattern = CONFLICT_RE;
  }

  const remove = classes.filter((name) => pattern.test(name));
  const add: string[] = [];

  if (next.isOn && next.lines === MIN_LINES) {
    add.push("truncate");
  }

  if (next.isOn && next.lines > MIN_LINES) {
    add.push(`line-clamp-${next.lines}`);
  }

  const kept = new Set(add);

  return { add, remove: remove.filter((name) => !kept.has(name)) };
};

const toStyleChange = (
  values: Partial<StyleValues>,
  next: TruncateState
): Partial<StyleValues> => {
  const isBox = values.display === "-webkit-box";

  if (!next.isOn) {
    const cleared: Partial<StyleValues> = {
      "-webkit-box-orient": "",
      "-webkit-line-clamp": "",
      overflow: "",
      "text-overflow": "",
      "white-space": "",
    };

    if (isBox) {
      cleared.display = "";
    }

    return cleared;
  }

  if (next.lines === MIN_LINES) {
    const single: Partial<StyleValues> = {
      "-webkit-box-orient": "",
      "-webkit-line-clamp": "",
      overflow: "hidden",
      "text-overflow": "ellipsis",
      "white-space": "nowrap",
    };

    if (isBox) {
      single.display = "";
    }

    return single;
  }

  return {
    "-webkit-box-orient": "vertical",
    "-webkit-line-clamp": String(next.lines),
    display: "-webkit-box",
    overflow: "hidden",
    "text-overflow": "ellipsis",
    "white-space": "",
  };
};

const toTruncateKey = (state: TruncateState): string =>
  `${state.isOn}:${state.lines}`;

const isTruncatable = (selection: SelectionContext | null): boolean =>
  selection !== null && selection.source !== null;

export {
  MAX_LINES,
  MIN_LINES,
  isTruncatable,
  toClampedLines,
  toClassChange,
  toStyleChange,
  toTruncateKey,
  toTruncateState,
};

export type { ClassChange, TruncateState };

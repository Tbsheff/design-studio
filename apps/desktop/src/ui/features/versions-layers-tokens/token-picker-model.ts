import type { CompiledTokenEntry } from "@design-studio/contracts";

import {
  colorHex,
  lengthToPx,
  modeValue,
} from "../../../shared/token-match.js";
import type { TokenMode } from "../../../shared/token-match.js";

const BAR_MAX = 16;
const BAR_MIN = 2;
const BAR_DIVISOR = 4;
const PX_PRECISION = 100;

const tokenShortName = (entry: CompiledTokenEntry): string => {
  if (entry.type === "color") {
    return entry.cssVar;
  }

  return entry.path.split(".").slice(1).join("-");
};

const toBarWidth = (value: string): number => {
  const px = lengthToPx(value);

  if (px === null) {
    return 0;
  }

  return Math.min(BAR_MAX, Math.max(BAR_MIN, px / BAR_DIVISOR));
};

const toPxNote = (entry: CompiledTokenEntry, mode: TokenMode): string => {
  const value = modeValue(entry, mode);

  if (entry.type === "color") {
    return colorHex(value) ?? value;
  }

  if (entry.type === "fontFamily") {
    return value.split(",")[0]?.replaceAll(/['"]/gu, "").trim() ?? value;
  }

  if (entry.type !== "dimension" || value.endsWith("px")) {
    return value;
  }

  const px = lengthToPx(value);

  if (px === null) {
    return value;
  }

  return `${value} · ${Math.round(px * PX_PRECISION) / PX_PRECISION}px`;
};

const filterEntries = (
  entries: CompiledTokenEntry[],
  query: string
): CompiledTokenEntry[] => {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return entries;
  }

  return entries.filter(
    (entry) =>
      entry.cssVar.toLowerCase().includes(needle) ||
      entry.value.toLowerCase().includes(needle)
  );
};

const toStartIndex = (
  list: CompiledTokenEntry[],
  current: string | null,
  nearest: string | null
): number => {
  const at = list.findIndex((entry) => entry.cssVar === (current ?? nearest));

  return Math.max(0, at);
};

const toMovedIndex = (
  key: string,
  index: number,
  count: number
): number | null => {
  switch (key) {
    case "ArrowDown": {
      return Math.min(count - 1, Math.max(0, index + 1));
    }

    case "ArrowUp": {
      return Math.min(count - 1, Math.max(0, index - 1));
    }

    case "End": {
      return Math.min(count - 1, Math.max(0, count - 1));
    }

    case "Home": {
      return Math.min(count - 1, 0);
    }

    default: {
      return null;
    }
  }
};

export {
  filterEntries,
  toBarWidth,
  toMovedIndex,
  toPxNote,
  toStartIndex,
  tokenShortName,
};

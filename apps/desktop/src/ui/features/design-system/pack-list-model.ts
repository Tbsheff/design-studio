import type { PackSummary } from "@design-studio/contracts";

const NONE = "none";
const COLUMN_MIN = 1;

const toColumns = (list: HTMLElement | null): number => {
  if (!list) {
    return COLUMN_MIN;
  }

  const tracks = getComputedStyle(list).gridTemplateColumns.split(" ");

  return Math.max(COLUMN_MIN, tracks.filter(Boolean).length);
};

const toNextIndex = (
  key: string,
  index: number,
  count: number,
  columns: number
): number | null => {
  const moves = new Map([
    ["ArrowDown", index + columns],
    ["ArrowLeft", index - 1],
    ["ArrowRight", index + 1],
    ["ArrowUp", index - columns],
    ["End", count - 1],
    ["Home", 0],
  ]);

  if (!moves.has(key)) {
    return null;
  }

  return Math.min(count - 1, Math.max(0, moves.get(key) ?? 0));
};

type KeyAction =
  | { readonly kind: "choose" }
  | { readonly kind: "move"; readonly index: number }
  | { readonly kind: "tab" }
  | null;

const toKeyAction = (
  key: string,
  active: number,
  count: number,
  columns: number
): KeyAction => {
  if (key === "Enter" || key === " ") {
    return { kind: "choose" };
  }

  if (key === "Tab") {
    return { kind: "tab" };
  }

  const next = toNextIndex(key, active, count, columns);

  if (next === null) {
    return null;
  }

  return { index: next, kind: "move" };
};

const toOptionIndex = (target: EventTarget): number | null => {
  if (!(target instanceof Element)) {
    return null;
  }

  const card = target.closest("[data-index]");

  if (!(card instanceof HTMLElement)) {
    return null;
  }

  return Number(card.dataset["index"]);
};

const toOptions = (
  packs: PackSummary[] | null,
  includeNone: boolean
): (PackSummary | null)[] => {
  if (includeNone) {
    return [null, ...(packs ?? [])];
  }

  return packs ?? [];
};

const toPackKey = (pack: PackSummary | null): string => pack?.id ?? NONE;

const toOptionLabel = (pack: PackSummary | null): string =>
  pack?.name ?? "No design system";

const toCardClass = (isSelected: boolean): string => {
  if (isSelected) {
    return "pack-card selected";
  }

  return "pack-card ";
};

export {
  toCardClass,
  toColumns,
  toKeyAction,
  toOptionIndex,
  toOptionLabel,
  toOptions,
  toPackKey,
};

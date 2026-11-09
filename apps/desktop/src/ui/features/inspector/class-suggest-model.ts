interface TokenClassItem {
  readonly className: string;
  readonly tokenName: string;
  readonly useCount: number;
  readonly value: string;
}

interface SuggestRow {
  readonly className: string;
  readonly isToken: boolean;
  readonly tokenName: string;
  readonly value: string;
}

const COLOR_PATTERN =
  /^(?:#[\da-f]{3,8}|(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)\()/iu;

const WHITESPACE = /\s+/u;

const MAX_ROWS = 40;

const isColorValue = (value: string): boolean =>
  COLOR_PATTERN.test(value.trim());

const toWords = (typed: string): string[] =>
  typed.split(WHITESPACE).filter((word) => word !== "");

const toLastWord = (typed: string): string => {
  if (/\s$/u.test(typed)) {
    return "";
  }

  return toWords(typed).at(-1) ?? "";
};

const toSuggestRows = (
  loaded: readonly TokenClassItem[] | null,
  word: string
): SuggestRow[] => {
  const items = loaded ?? [];

  if (word === "" || (loaded === null && !word.includes("["))) {
    return [];
  }

  const rows: SuggestRow[] = items.slice(0, MAX_ROWS).map((item) => ({
    className: item.className,
    isToken: true,
    tokenName: item.tokenName,
    value: item.value,
  }));

  const isListed = rows.some((row) => row.className === word);
  const isRaw = word.includes("[") || rows.length === 0;

  if (!isListed && isRaw) {
    rows.push({ className: word, isToken: false, tokenName: "", value: "" });
  }

  return rows;
};

const toPrefixPick = (
  word: string,
  rows: readonly SuggestRow[]
): string | null => {
  const first = rows.at(0) ?? null;

  if (!word.endsWith("-") || first === null || !first.isToken) {
    return null;
  }

  return first.className;
};

const toPickedClasses = (typed: string, className: string): string[] => {
  const words = toWords(typed);

  if (/\s$/u.test(typed)) {
    return [...words, className];
  }

  return [...words.slice(0, -1), className];
};

const toSubmitClasses = (
  typed: string,
  rows: readonly SuggestRow[],
  isOpen: boolean
): string[] => {
  const pick = toPrefixPick(toLastWord(typed), rows);

  if (isOpen && pick !== null) {
    return toPickedClasses(typed, pick);
  }

  return toWords(typed);
};

const toStepIndex = (at: number, key: string, count: number): number => {
  if (count === 0) {
    return -1;
  }

  if (key === "ArrowDown") {
    return (at + 1) % count;
  }

  return (at - 1 + count) % count;
};

type SuggestKeyAction = "clear" | "none" | "pick" | "step" | "submit";

const toKeyAction = (
  key: string,
  isOpen: boolean,
  hasActive: boolean
): SuggestKeyAction => {
  if (isOpen && (key === "ArrowDown" || key === "ArrowUp")) {
    return "step";
  }

  if (key === "Escape" && hasActive) {
    return "clear";
  }

  if ((key === "Enter" || key === "Tab") && hasActive) {
    return "pick";
  }

  if (key === "Enter") {
    return "submit";
  }

  return "none";
};

export {
  isColorValue,
  toKeyAction,
  toLastWord,
  toPickedClasses,
  toStepIndex,
  toSubmitClasses,
  toSuggestRows,
  toWords,
};

export type { SuggestKeyAction, SuggestRow, TokenClassItem };

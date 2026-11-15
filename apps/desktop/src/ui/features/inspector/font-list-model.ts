import { copy } from "./copy.js";

type FontSource =
  | "catalog"
  | "font-face"
  | "google-link"
  | "next-font"
  | "pack"
  | "system"
  | "token";

interface FontRow {
  readonly className: string | null;
  readonly family: string;
  readonly preview: string;
  readonly source: FontSource;
  readonly stack: string;
  readonly token: string | null;
}

interface FontGroup {
  readonly label: string;
  readonly rows: readonly FontRow[];
  readonly start: number;
}

type FontKey = "close" | "down" | "none" | "pick" | "up";

const NO_ROW = -1;

const GENERIC_FAMILIES: ReadonlySet<string> = new Set([
  "",
  "cursive",
  "emoji",
  "fangsong",
  "fantasy",
  "inherit",
  "initial",
  "math",
  "monospace",
  "revert",
  "sans-serif",
  "serif",
  "system-ui",
  "ui-monospace",
  "ui-rounded",
  "ui-sans-serif",
  "ui-serif",
  "unset",
]);

const SOURCE_LABEL: Readonly<Record<FontSource, string>> = {
  catalog: copy.fontSourceCatalog,
  "font-face": copy.fontSourceFontFace,
  "google-link": copy.fontSourceGoogleLink,
  "next-font": copy.fontSourceNextFont,
  pack: copy.fontSourcePack,
  system: copy.fontSourceSystem,
  token: copy.fontSourceToken,
};

const toPlainFamily = (value: string): string =>
  (value.split(",")[0] ?? "").replaceAll(/["']/gu, "").trim().toLowerCase();

const toRowMeta = (row: FontRow): string => {
  const label = SOURCE_LABEL[row.source];

  if (row.token === null) {
    return label;
  }

  if (row.source === "token") {
    return `${label} ${row.token}`;
  }

  return `${label} · ${row.token}`;
};

const toFilteredRows = (
  rows: readonly FontRow[],
  query: string
): readonly FontRow[] => {
  const needle = query.trim().toLowerCase();

  if (needle === "") {
    return rows;
  }

  return rows.filter(
    (row) =>
      row.family.toLowerCase().includes(needle) ||
      (row.className ?? "").includes(needle)
  );
};

const toFontGroups = (rows: readonly FontRow[]): readonly FontGroup[] => {
  const parts = [
    {
      label: copy.fontGroupProject,
      rows: rows.filter(
        (row) => row.source !== "system" && row.source !== "catalog"
      ),
    },
    {
      label: copy.fontGroupCatalog,
      rows: rows.filter((row) => row.source === "catalog"),
    },
    {
      label: copy.fontGroupSystem,
      rows: rows.filter((row) => row.source === "system"),
    },
  ];

  const groups: FontGroup[] = [];
  let start = 0;

  for (const part of parts) {
    if (part.rows.length > 0) {
      groups.push({ ...part, start });
      start += part.rows.length;
    }
  }

  return groups;
};

const toOrderedRows = (rows: readonly FontRow[]): readonly FontRow[] =>
  toFontGroups(rows).flatMap((group) => group.rows);

const toFontKey = (key: string, isOpen: boolean): FontKey => {
  if (key === "ArrowDown") {
    return "down";
  }

  if (key === "ArrowUp" && isOpen) {
    return "up";
  }

  if (key === "Enter") {
    return "pick";
  }

  if (key === "Escape") {
    return "close";
  }

  return "none";
};

const toNextActive = (active: number, key: FontKey, length: number): number => {
  if (length === 0) {
    return NO_ROW;
  }

  if (key === "down") {
    return Math.min(active + 1, length - 1);
  }

  return Math.max(active - 1, 0);
};

const isRowFont = (row: FontRow, family: string, value: string): boolean =>
  toPlainFamily(row.family) === family ||
  row.preview === value ||
  (row.token !== null && value.includes(row.token));

const isLoadedFont = (value: string, rows: readonly FontRow[]): boolean => {
  const family = toPlainFamily(value);

  if (rows.length === 0 || GENERIC_FAMILIES.has(family)) {
    return true;
  }

  return rows.some(
    (row) => row.source !== "catalog" && isRowFont(row, family, value)
  );
};

export {
  NO_ROW,
  isLoadedFont,
  toFilteredRows,
  toFontGroups,
  toFontKey,
  toNextActive,
  toOrderedRows,
  toRowMeta,
};

export type { FontGroup, FontKey, FontRow, FontSource };

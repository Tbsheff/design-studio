type ParseFailureCode = "bad_json" | "empty" | "too_big" | "too_many_rows";

type ParseRowsResult =
  | { readonly code: ParseFailureCode; readonly ok: false }
  | { readonly ok: true; readonly rows: readonly (readonly string[])[] };

const MAX_ROWS = 200;

const MAX_TEXT_LENGTH = 100_000;

const QUOTE = '"';

interface FieldState {
  cell: string;
  isQuoted: boolean;
  position: number;
  readonly row: string[];
  readonly rows: string[][];
}

const endCell = (state: FieldState): void => {
  state.row.push(state.cell);
  state.cell = "";
  state.isQuoted = false;
};

const endRow = (state: FieldState): void => {
  endCell(state);
  const isBlank = state.row.length === 1 && state.row[0]?.trim() === "";

  if (!isBlank) {
    state.rows.push([...state.row]);
  }

  state.row.length = 0;
};

const stepQuoted = (state: FieldState, text: string): void => {
  const letter = text.charAt(state.position);

  if (letter !== QUOTE) {
    state.cell += letter;

    return;
  }

  if (text.charAt(state.position + 1) === QUOTE) {
    state.cell += QUOTE;
    state.position += 1;

    return;
  }

  state.isQuoted = false;
};

const stepPlain = (
  state: FieldState,
  text: string,
  delimiter: string
): void => {
  const letter = text.charAt(state.position);

  if (letter === QUOTE && state.cell === "") {
    state.isQuoted = true;
  } else if (letter === delimiter) {
    endCell(state);
  } else if (letter === "\n" || letter === "\r") {
    endRow(state);
    state.position += Number(
      letter === "\r" && text.charAt(state.position + 1) === "\n"
    );
  } else {
    state.cell += letter;
  }
};

const splitDelimited = (text: string, delimiter: string): string[][] => {
  const state: FieldState = {
    cell: "",
    isQuoted: false,
    position: 0,
    row: [],
    rows: [],
  };

  while (state.position < text.length) {
    if (state.isQuoted) {
      stepQuoted(state, text);
    } else {
      stepPlain(state, text, delimiter);
    }

    state.position += 1;
  }

  if (state.cell !== "" || state.row.length > 0) {
    endRow(state);
  }

  return state.rows;
};

const toDelimiter = (text: string): string => {
  const firstLine = text.split(/\r?\n/u).at(0) ?? "";

  if (firstLine.includes("\t")) {
    return "\t";
  }

  return ",";
};

type JsonEntry = Readonly<Record<string, string>> | readonly string[];

const OBJECT_TEXT = "[object Object]";

const isList = (entry: JsonEntry): entry is readonly string[] =>
  Array.isArray(entry);

const toJsonEntries = (text: string): readonly JsonEntry[] | null => {
  try {
    const parsed: readonly JsonEntry[] = JSON.parse(text);

    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
};

const toJsonRow = (
  entry: JsonEntry,
  keys: readonly string[]
): readonly string[] => {
  if (isList(entry)) {
    return entry.map((cell) => String(cell ?? ""));
  }

  return keys.map((key) => String(entry[key] ?? ""));
};

const toJsonRows = (text: string): ParseRowsResult => {
  const entries = toJsonEntries(text);

  if (entries === null) {
    return { code: "bad_json", ok: false };
  }

  const first = entries.find((entry) => !isList(entry)) ?? {};
  const keys = Object.keys(first);
  const rows = entries.map((entry) => toJsonRow(entry, keys));

  if (rows.some((row) => row.includes(OBJECT_TEXT))) {
    return { code: "bad_json", ok: false };
  }

  return { ok: true, rows };
};

const parseRows = (text: string): ParseRowsResult => {
  if (text.length > MAX_TEXT_LENGTH) {
    return { code: "too_big", ok: false };
  }

  const trimmed = text.trim();

  if (trimmed === "") {
    return { code: "empty", ok: false };
  }

  let result: ParseRowsResult = {
    ok: true,
    rows: splitDelimited(trimmed, toDelimiter(trimmed)),
  };

  if (trimmed.startsWith("[")) {
    result = toJsonRows(trimmed);
  }

  if (!result.ok) {
    return result;
  }

  if (result.rows.length === 0) {
    return { code: "empty", ok: false };
  }

  if (result.rows.length > MAX_ROWS) {
    return { code: "too_many_rows", ok: false };
  }

  return result;
};

export { MAX_ROWS, MAX_TEXT_LENGTH, parseRows };

export type { ParseFailureCode, ParseRowsResult };

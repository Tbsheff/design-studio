import { tableClassOf } from "./registry.js";
import {
  clauseOf,
  endOf,
  firstTop,
  isName,
  isOrgParam,
  isWord,
  RETURNING_STOPS,
  SET_STOPS,
  skipOrClause,
  splitTop,
  topIndexes,
} from "./sql-scan.js";
import { checkAssigns, classifySelect } from "./sql-sources.js";
import type { Token } from "./sql-tokens.js";
import { violate } from "./sql-tokens.js";

interface ColumnRead {
  readonly close: number;
  readonly orgIndex: number;
}

const readColumns = (
  sql: string,
  tokens: readonly Token[],
  open: number
): ColumnRead => {
  const close =
    topIndexes(tokens, (token) => token.text === ")").find(
      (index) => index > open
    ) ?? -1;

  if (tokens[open]?.text !== "(" || close < 0) {
    return violate(sql, "an INSERT needs a column list");
  }

  const columns = splitTop(
    tokens.slice(open + 1, close),
    (token) => token.text === ","
  );

  const orgIndex = columns.findIndex(
    (column) => column.length === 1 && column[0]?.lower === "org_id"
  );

  if (orgIndex === -1) {
    return violate(sql, "an INSERT must bind org_id to :org");
  }

  return { close, orgIndex };
};

const checkValueRows = (
  sql: string,
  rows: readonly Token[],
  orgIndex: number
): void => {
  for (const row of splitTop(rows, (token) => token.text === ",")) {
    if (row[0]?.text !== "(" || row.at(-1)?.text !== ")") {
      violate(sql, "a VALUES row form is not known");
    }

    const items = splitTop(row.slice(1, -1), (token) => token.text === ",");

    if (!isOrgParam(items[orgIndex] ?? [])) {
      violate(sql, "an INSERT must bind org_id to :org");
    }
  }
};

const checkUpsert = (sql: string, tail: readonly Token[]): void => {
  if (tail.length === 0) {
    return;
  }

  if (!isWord(tail[0], "on") || !isWord(tail[1], "conflict")) {
    return violate(sql, "the INSERT tail is not known");
  }

  const doAt = firstTop(tail, new Set(["do"]), 0);

  if (doAt < 0) {
    return violate(sql, "an ON CONFLICT needs DO");
  }

  if (isWord(tail[doAt + 1], "update")) {
    checkAssigns(sql, clauseOf(tail, "set", SET_STOPS));
  }
};

const isAliasTail = (rest: readonly Token[]): boolean => {
  const [first, second] = rest;

  if (rest.length === 0) {
    return true;
  }

  if (rest.length === 1) {
    return isName(first);
  }

  return rest.length === 2 && isWord(first, "as") && isName(second);
};

const checkSelectOrg = (
  sql: string,
  select: readonly Token[],
  orgIndex: number
): void => {
  const fromAt = endOf(select, new Set(["from"]), 0);

  const items = splitTop(
    select.slice(1, fromAt),
    (token) => token.text === ","
  );

  const item = items[orgIndex] ?? [];

  if (!isOrgParam(item.slice(0, 1)) || !isAliasTail(item.slice(1))) {
    violate(sql, "an INSERT ... SELECT must select :org as org_id");
  }
};

const classifyInsertBody = (
  sql: string,
  body: readonly Token[],
  orgIndex: number
): readonly string[] => {
  const end = endOf(body, new Set(["on", "returning"]), 0);

  if (isWord(body[0], "values")) {
    checkValueRows(sql, body.slice(1, end), orgIndex);
    checkUpsert(sql, body.slice(end, endOf(body, RETURNING_STOPS, end)));

    return [];
  }

  if (!isWord(body[0], "select")) {
    return violate(sql, "an INSERT needs VALUES or SELECT");
  }

  const select = body.slice(0, endOf(body, RETURNING_STOPS, 0));

  if (firstTop(select, new Set(["conflict"]), 0) >= 0) {
    return violate(sql, "an INSERT ... SELECT may not have ON CONFLICT");
  }

  checkSelectOrg(sql, select, orgIndex);

  return classifySelect(sql, select);
};

const classifyInsert = (
  sql: string,
  tokens: readonly Token[]
): readonly string[] => {
  const intoAt = skipOrClause(tokens, 1);
  const table = tokens[intoAt + 1];

  if (!isWord(tokens[intoAt], "into") || !table || !isName(table)) {
    return violate(sql, "the INSERT form is not known");
  }

  if (tableClassOf(table.text) !== "TENANT") {
    return violate(sql, `${table.text} is a global table`);
  }

  const columns = readColumns(sql, tokens, intoAt + 2);
  const body = tokens.slice(columns.close + 1);
  const read = classifyInsertBody(sql, body, columns.orgIndex);

  return [table.text, ...read];
};

export { classifyInsert };

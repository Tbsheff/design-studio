import { tableClassOf } from "./registry.js";
import {
  clauseOf,
  endOf,
  firstTop,
  isName,
  isOrgParam,
  isWord,
  isWordIn,
  splitTop,
  topIndexes,
} from "./sql-scan.js";
import type { Token } from "./sql-tokens.js";
import { violate } from "./sql-tokens.js";

interface Source {
  readonly alias: string;
  readonly cond: readonly Token[] | null;
  readonly table: string;
}

interface SourceRead {
  readonly next: number;
  readonly source: Source;
}

const SOURCE_STOPS = new Set([
  "cross",
  "group",
  "having",
  "inner",
  "join",
  "left",
  "limit",
  "on",
  "order",
  "outer",
  "returning",
  "set",
  "where",
]);

const JOIN_WORDS = new Set(["cross", "inner", "join", "left", "outer"]);

const FROM_STOPS = new Set(["group", "having", "limit", "order", "where"]);

const WHERE_STOPS = new Set(["group", "having", "limit", "order", "returning"]);

const columnSide = (term: readonly Token[]): readonly Token[] | null => {
  const eq = term.findIndex((token) => token.text === "=");

  if (eq === -1) {
    return null;
  }

  const left = term.slice(0, eq);
  const right = term.slice(eq + 1);

  if (isOrgParam(right)) {
    return left;
  }

  if (isOrgParam(left)) {
    return right;
  }

  return null;
};

const QUALIFIED_LENGTH = 3;

const namesOrgColumn = (
  side: readonly Token[],
  qualifiers: readonly string[],
  allowBare: boolean
): boolean => {
  const [first, dot, column] = side;

  if (side.length === 1) {
    return allowBare && isName(first) && first?.lower === "org_id";
  }

  if (side.length !== QUALIFIED_LENGTH || dot?.text !== ".") {
    return false;
  }

  if (!isName(column) || column?.lower !== "org_id") {
    return false;
  }

  return qualifiers.includes(first?.lower ?? "");
};

const assertNoTopOr = (sql: string, cond: readonly Token[] | null): void => {
  if (cond && topIndexes(cond, (token) => isWord(token, "or")).length > 0) {
    violate(sql, "an OR at the top level of a WHERE or ON is not allowed");
  }
};

const hasOrgTerm = (
  cond: readonly Token[] | null,
  source: Source,
  allowBare: boolean
): boolean => {
  if (!cond) {
    return false;
  }

  const qualifiers = [source.alias.toLowerCase(), source.table.toLowerCase()];

  return splitTop(cond, (token) => isWord(token, "and")).some((term) => {
    const side = columnSide(term);

    return side !== null && namesOrgColumn(side, qualifiers, allowBare);
  });
};

const checkSources = (
  sql: string,
  sources: readonly Source[],
  where: readonly Token[] | null
): readonly string[] => {
  assertNoTopOr(sql, where);
  const allowBare = sources.length === 1;

  for (const source of sources) {
    assertNoTopOr(sql, source.cond);

    if (tableClassOf(source.table) !== "TENANT") {
      violate(sql, `${source.table} is a global table`);
    }

    const scoped =
      hasOrgTerm(source.cond, source, allowBare) ||
      hasOrgTerm(where, source, allowBare);

    if (!scoped) {
      violate(sql, `${source.alias} has no ${source.alias}.org_id = :org term`);
    }
  }

  return sources.map((source) => source.table);
};

const readSource = (
  sql: string,
  tokens: readonly Token[],
  at: number
): SourceRead => {
  const table = tokens[at];

  if (!table || !isName(table) || isWordIn(table, SOURCE_STOPS)) {
    return violate(sql, "a table name is missing");
  }

  const after = tokens[at + 1];

  if (after?.text === "(" || after?.text === ".") {
    return violate(sql, `the form ${table.text}${after.text} is not known`);
  }

  let next = at + 1;

  if (isWord(tokens[next], "as")) {
    next += 1;
  }

  const alias = tokens[next];

  if (alias && isName(alias) && !isWordIn(alias, SOURCE_STOPS)) {
    return {
      next: next + 1,
      source: { alias: alias.text, cond: null, table: table.text },
    };
  }

  return {
    next,
    source: { alias: table.text, cond: null, table: table.text },
  };
};

const readJoin = (
  sql: string,
  tokens: readonly Token[],
  at: number
): SourceRead => {
  let next = at;

  while (isWordIn(tokens[next], JOIN_WORDS) && !isWord(tokens[next], "join")) {
    next += 1;
  }

  if (!isWord(tokens[next], "join")) {
    return violate(sql, "a join form is not known");
  }

  const read = readSource(sql, tokens, next + 1);

  if (!isWord(tokens[read.next], "on")) {
    return violate(sql, `the join on ${read.source.alias} has no ON`);
  }

  const end = endOf(tokens, JOIN_WORDS, read.next + 1);

  const commaAt = topIndexes(tokens, (token) => token.text === ",").find(
    (index) => index > read.next
  );

  const condEnd = Math.min(end, commaAt ?? tokens.length);

  return {
    next: condEnd,
    source: { ...read.source, cond: tokens.slice(read.next + 1, condEnd) },
  };
};

const readNextSource = (
  sql: string,
  tokens: readonly Token[],
  at: number
): SourceRead => {
  if (tokens[at]?.text === ",") {
    return readSource(sql, tokens, at + 1);
  }

  return readJoin(sql, tokens, at);
};

const parseSources = (
  sql: string,
  tokens: readonly Token[]
): readonly Source[] => {
  const first = readSource(sql, tokens, 0);
  const sources: Source[] = [first.source];
  let at = first.next;

  while (at < tokens.length) {
    const read = readNextSource(sql, tokens, at);
    sources.push(read.source);
    at = read.next;
  }

  return sources;
};

const classifySelect = (
  sql: string,
  tokens: readonly Token[]
): readonly string[] => {
  const fromAt = firstTop(tokens, new Set(["from"]), 0);

  if (fromAt < 0) {
    return [];
  }

  const sourceEnd = endOf(tokens, FROM_STOPS, fromAt + 1);
  const sources = parseSources(sql, tokens.slice(fromAt + 1, sourceEnd));

  return checkSources(sql, sources, clauseOf(tokens, "where", WHERE_STOPS));
};

const checkAssigns = (sql: string, assigns: readonly Token[] | null): void => {
  for (const assign of splitTop(assigns ?? [], (token) => token.text === ",")) {
    const eq = assign.findIndex((token) => token.text === "=");
    const target = assign[eq - 1];

    if (eq < 1 || target?.lower === "org_id") {
      violate(sql, "a SET may not change org_id");
    }
  }
};

export { checkAssigns, checkSources, classifySelect, readSource };

export type { Source, SourceRead };

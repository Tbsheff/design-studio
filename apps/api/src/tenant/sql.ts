import { classifyInsert } from "./sql-insert.js";
import {
  clauseOf,
  firstTop,
  isWord,
  RETURNING_STOPS,
  SET_STOPS,
  skipOrClause,
} from "./sql-scan.js";
import {
  checkAssigns,
  checkSources,
  classifySelect,
  readSource,
} from "./sql-sources.js";
import type { Token } from "./sql-tokens.js";
import { checkTokens, tokenize, violate } from "./sql-tokens.js";

type StatementKind = "delete" | "insert" | "select" | "update";

type BoundValue = ArrayBuffer | boolean | number | string | null;

type ParamValues = Readonly<Record<string, BoundValue>>;

interface NumberedSql {
  readonly params: readonly string[];
  readonly text: string;
}

interface Classified {
  readonly kind: StatementKind;
  readonly tables: readonly string[];
}

interface TenantStatement<Params extends ParamValues> {
  readonly bind: (org: string, values: Params) => readonly BoundValue[];
  readonly kind: StatementKind;
  readonly params: readonly string[];
  readonly sql: string;
  readonly tables: readonly string[];
}

const classifyUpdate = (
  sql: string,
  tokens: readonly Token[]
): readonly string[] => {
  const setAt = firstTop(tokens, new Set(["set"]), 0);

  if (setAt < 0 || firstTop(tokens, new Set(["from"]), setAt) >= 0) {
    return violate(sql, "the UPDATE form is not known");
  }

  const read = readSource(sql, tokens, skipOrClause(tokens, 1));

  if (read.next !== setAt) {
    return violate(sql, "the UPDATE target is not known");
  }

  checkAssigns(sql, clauseOf(tokens, "set", SET_STOPS));
  const where = clauseOf(tokens, "where", RETURNING_STOPS);

  return checkSources(sql, [read.source], where);
};

const classifyDelete = (
  sql: string,
  tokens: readonly Token[]
): readonly string[] => {
  if (!isWord(tokens[1], "from")) {
    return violate(sql, "the DELETE form is not known");
  }

  const read = readSource(sql, tokens, 2);
  const whereAt = firstTop(tokens, new Set(["where"]), 0);

  if (whereAt !== read.next) {
    return violate(sql, "a DELETE needs a WHERE after its table");
  }

  const where = clauseOf(tokens, "where", RETURNING_STOPS);

  return checkSources(sql, [read.source], where);
};

const classify = (sql: string, tokens: readonly Token[]): Classified => {
  const [head] = tokens;

  if (isWord(head, "select")) {
    return { kind: "select", tables: classifySelect(sql, tokens) };
  }

  if (isWord(head, "insert")) {
    return { kind: "insert", tables: classifyInsert(sql, tokens) };
  }

  if (isWord(head, "update")) {
    return { kind: "update", tables: classifyUpdate(sql, tokens) };
  }

  if (isWord(head, "delete")) {
    return { kind: "delete", tables: classifyDelete(sql, tokens) };
  }

  return violate(sql, "only SELECT, INSERT, UPDATE and DELETE are known");
};

const numberParams = (sql: string, tokens: readonly Token[]): NumberedSql => {
  const params: string[] = [];
  const positions = new Map<string, number>();
  let text = "";
  let from = 0;

  for (const token of tokens) {
    if (token.kind === "positional") {
      violate(sql, "use a named :param, not ?");
    }

    if (token.kind === "param") {
      const name = token.text.slice(1);

      if (!positions.has(name)) {
        params.push(name);
        positions.set(name, params.length);
      }

      text += `${sql.slice(from, token.start)}?${positions.get(name) ?? 0}`;
      from = token.end;
    }
  }

  return { params, text: text + sql.slice(from) };
};

const bindValues = (
  sql: string,
  params: readonly string[],
  org: string,
  record: ParamValues
): readonly BoundValue[] => {
  if (Object.hasOwn(record, "org")) {
    violate(sql, "the caller may not pass org; TenantDb binds it");
  }

  return params.map((name) => {
    if (name === "org") {
      return org;
    }

    if (!Object.hasOwn(record, name)) {
      return violate(sql, `the value for :${name} is missing`);
    }

    return record[name] ?? null;
  });
};

const tq = <Params extends ParamValues = Record<string, never>>(
  strings: TemplateStringsArray,
  ...values: readonly never[]
): TenantStatement<Params> => {
  const sql = strings.join("").trim();

  if (values.length > 0 || strings.length !== 1) {
    return violate(sql, "interpolation is not allowed; use a :param");
  }

  const tokens = tokenize(sql);
  checkTokens(sql, tokens);
  const classified = classify(sql, tokens);
  const numbered = numberParams(sql, tokens);

  return {
    bind: (org, input) => bindValues(sql, numbered.params, org, input),
    kind: classified.kind,
    params: numbered.params,
    sql: numbered.text,
    tables: classified.tables,
  };
};

export { tq };

export type { BoundValue, ParamValues, StatementKind, TenantStatement };

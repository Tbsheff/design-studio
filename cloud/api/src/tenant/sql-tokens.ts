import { TenantViolation } from "./errors/tenant-violation.js";

type TokenKind =
  | "number"
  | "param"
  | "positional"
  | "punct"
  | "quoted"
  | "string"
  | "word";

interface Token {
  readonly end: number;
  readonly kind: TokenKind;
  readonly lower: string;
  readonly start: number;
  readonly text: string;
}

const WORD_START = /[A-Za-z_]/u;

const WORD_PART = /[A-Za-z0-9_$]/u;

const DIGIT = /[0-9]/u;

const NUMBER_PART = /[0-9.]/u;

const SPACE = /\s/u;

const MULTI_PUNCT = ["->>", "->", "<=", ">=", "<>", "!=", "==", "||"];

const SINGLE_PUNCT = new Set([
  "(",
  ")",
  ",",
  ".",
  "=",
  "<",
  ">",
  "+",
  "-",
  "*",
  "/",
  "%",
]);

const QUOTE_CLOSE = new Map([
  ['"', '"'],
  ["`", "`"],
  ["[", "]"],
]);

const BANNED_WORDS = new Set([
  "attach",
  "detach",
  "except",
  "intersect",
  "json_each",
  "json_tree",
  "natural",
  "pragma",
  "recursive",
  "union",
  "using",
  "with",
]);

const violate = (sql: string, reason: string): never => {
  throw new TenantViolation({
    message: `tq refuses this statement: ${reason}.`,
    statement: sql,
  });
};

const makeToken = (
  kind: TokenKind,
  text: string,
  start: number,
  end: number
): Token => {
  const lower = text.toLowerCase();

  return { end, kind, lower, start, text };
};

const scanWhile = (sql: string, from: number, pattern: RegExp): number => {
  let at = from;

  while (at < sql.length && pattern.test(sql.charAt(at))) {
    at += 1;
  }

  return at;
};

const readString = (sql: string, start: number): Token => {
  let close = sql.indexOf("'", start + 1);

  while (close >= 0 && sql.charAt(close + 1) === "'") {
    close = sql.indexOf("'", close + 2);
  }

  if (close < 0) {
    return violate(sql, "a string literal has no end");
  }

  return makeToken("string", sql.slice(start, close + 1), start, close + 1);
};

const readQuoted = (sql: string, start: number, close: string): Token => {
  const end = sql.indexOf(close, start + 1);

  if (end <= start + 1) {
    return violate(sql, "a quoted name has no end");
  }

  return makeToken("quoted", sql.slice(start + 1, end), start, end + 1);
};

const readPunct = (sql: string, start: number): Token => {
  const multi = MULTI_PUNCT.find((punct) => sql.startsWith(punct, start));

  if (multi) {
    return makeToken("punct", multi, start, start + multi.length);
  }

  const single = sql.charAt(start);

  if (!SINGLE_PUNCT.has(single)) {
    return violate(sql, `the character ${single} is not known`);
  }

  return makeToken("punct", single, start, start + 1);
};

const readSpan = (
  sql: string,
  start: number,
  kind: TokenKind,
  pattern: RegExp
): Token => {
  const end = scanWhile(sql, start + 1, pattern);

  return makeToken(kind, sql.slice(start, end), start, end);
};

const readToken = (sql: string, start: number): Token => {
  const char = sql.charAt(start);
  const close = QUOTE_CLOSE.get(char);

  if (sql.startsWith("--", start) || sql.startsWith("/*", start)) {
    return violate(sql, "comments are not allowed");
  }

  if (close) {
    return readQuoted(sql, start, close);
  }

  if (char === "'") {
    return readString(sql, start);
  }

  if (char === "?") {
    return makeToken("positional", char, start, start + 1);
  }

  if (char === ":" && WORD_START.test(sql.charAt(start + 1))) {
    return readSpan(sql, start, "param", WORD_PART);
  }

  if (WORD_START.test(char)) {
    return readSpan(sql, start, "word", WORD_PART);
  }

  if (DIGIT.test(char)) {
    return readSpan(sql, start, "number", NUMBER_PART);
  }

  if (char === ";") {
    return violate(sql, "only one statement is allowed");
  }

  return readPunct(sql, start);
};

const tokenize = (sql: string): readonly Token[] => {
  const tokens: Token[] = [];
  let at = scanWhile(sql, 0, SPACE);

  while (at < sql.length) {
    const token = readToken(sql, at);
    tokens.push(token);
    at = scanWhile(sql, token.end, SPACE);
  }

  return tokens;
};

const checkTokens = (sql: string, tokens: readonly Token[]): void => {
  let depth = 0;

  for (const token of tokens) {
    if (token.kind === "word" && BANNED_WORDS.has(token.lower)) {
      violate(sql, `${token.lower} is not allowed`);
    }

    if (depth > 0 && token.kind === "word" && token.lower === "select") {
      violate(sql, "a subquery is not allowed");
    }

    depth += Number(token.text === "(") - Number(token.text === ")");

    if (depth < 0) {
      violate(sql, "the parentheses do not match");
    }
  }

  if (depth !== 0) {
    violate(sql, "the parentheses do not match");
  }
};

export { checkTokens, tokenize, violate };

export type { Token, TokenKind };

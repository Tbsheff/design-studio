import type { Token } from "./sql-tokens.js";

const SET_STOPS = new Set(["from", "returning", "where"]);

const RETURNING_STOPS = new Set(["returning"]);

const isWord = (token: Token | undefined, word: string): boolean =>
  token?.kind === "word" && token.lower === word;

const isName = (token: Token | undefined): boolean =>
  token?.kind === "word" || token?.kind === "quoted";

const isWordIn = (
  token: Token | undefined,
  words: ReadonlySet<string>
): boolean => token?.kind === "word" && words.has(token.lower);

const topIndexes = (
  tokens: readonly Token[],
  test: (token: Token) => boolean
): readonly number[] => {
  const found: number[] = [];
  let depth = 0;

  for (const [index, token] of tokens.entries()) {
    if (token.text === ")") {
      depth -= 1;
    }

    if (depth === 0 && test(token)) {
      found.push(index);
    }

    if (token.text === "(") {
      depth += 1;
    }
  }

  return found;
};

const splitTop = (
  tokens: readonly Token[],
  test: (token: Token) => boolean
): readonly (readonly Token[])[] => {
  const cuts = topIndexes(tokens, test);
  const parts: (readonly Token[])[] = [];
  let from = 0;

  for (const cut of cuts) {
    parts.push(tokens.slice(from, cut));
    from = cut + 1;
  }

  parts.push(tokens.slice(from));

  return parts;
};

const firstTop = (
  tokens: readonly Token[],
  words: ReadonlySet<string>,
  from: number
): number =>
  topIndexes(tokens, (token) => isWordIn(token, words)).find(
    (index) => index >= from
  ) ?? -1;

const endOf = (
  tokens: readonly Token[],
  stops: ReadonlySet<string>,
  from: number
): number => {
  const stop = firstTop(tokens, stops, from);

  if (stop < 0) {
    return tokens.length;
  }

  return stop;
};

const clauseOf = (
  tokens: readonly Token[],
  word: string,
  stops: ReadonlySet<string>
): readonly Token[] | null => {
  const start = firstTop(tokens, new Set([word]), 0);

  if (start < 0) {
    return null;
  }

  return tokens.slice(start + 1, endOf(tokens, stops, start + 1));
};

const isOrgParam = (side: readonly Token[]): boolean =>
  side.length === 1 && side[0]?.kind === "param" && side[0].lower === ":org";

const skipOrClause = (tokens: readonly Token[], at: number): number => {
  if (isWord(tokens[at], "or")) {
    return at + 2;
  }

  return at;
};

export {
  clauseOf,
  endOf,
  firstTop,
  isName,
  isOrgParam,
  isWord,
  isWordIn,
  RETURNING_STOPS,
  SET_STOPS,
  skipOrClause,
  splitTop,
  topIndexes,
};

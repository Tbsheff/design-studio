import type { SourceToken } from "./to-source-tokens.js";

interface LiteralText {
  readonly kind: "text";
  readonly text: string;
}

interface LiteralList {
  readonly items: readonly LiteralValue[];
  readonly kind: "list";
}

interface LiteralEntry {
  readonly key: string;
  readonly value: LiteralValue;
}

interface LiteralRecord {
  readonly entries: readonly LiteralEntry[];
  readonly kind: "record";
}

interface LiteralOther {
  readonly kind: "other";
  readonly name: string;
}

type LiteralValue = LiteralList | LiteralOther | LiteralRecord | LiteralText;

interface ParseStep {
  readonly next: number;
  readonly value: LiteralValue;
}

interface ListStep {
  readonly items: readonly LiteralValue[];
  readonly next: number;
}

const OPEN_MARKS = new Set(["(", "[", "{"]);
const CLOSE_MARKS = new Set([")", "]", "}"]);
const KEY_OFFSET = 2;

type ValueParser = (tokens: readonly SourceToken[], start: number) => ParseStep;

const isMark = (token: SourceToken | undefined, text: string): boolean =>
  token?.kind === "mark" && token.text === text;

const isStop = (token: SourceToken): boolean =>
  token.kind === "mark" && (token.text === "," || CLOSE_MARKS.has(token.text));

const toDepth = (token: SourceToken, depth: number): number => {
  if (token.kind !== "mark") {
    return depth;
  }

  if (OPEN_MARKS.has(token.text)) {
    return depth + 1;
  }

  if (CLOSE_MARKS.has(token.text)) {
    return depth - 1;
  }

  return depth;
};

const toFirstWord = (
  tokens: readonly SourceToken[],
  start: number,
  end: number
): string =>
  tokens.slice(start, end).find((token) => token.kind === "word")?.text ?? "";

const toSkipStep = (
  tokens: readonly SourceToken[],
  start: number
): ParseStep => {
  let depth = 0;
  let index = start;

  while (index < tokens.length) {
    const token = tokens[index];

    if (!token || (depth === 0 && isStop(token))) {
      break;
    }

    depth = toDepth(token, depth);
    index += 1;
  }

  return {
    next: index,
    value: { kind: "other", name: toFirstWord(tokens, start, index) },
  };
};

const toItemsStep = (
  tokens: readonly SourceToken[],
  start: number,
  close: string,
  toValue: ValueParser
): ListStep => {
  const items: LiteralValue[] = [];
  let index = start;

  while (index < tokens.length && !isMark(tokens[index], close)) {
    const step = toValue(tokens, index);

    items.push(step.value);
    index = Math.max(step.next, index + 1);

    if (isMark(tokens[step.next], ",")) {
      index = step.next + 1;
    }
  }

  return { items, next: index + 1 };
};

const isKey = (token: SourceToken | undefined): token is SourceToken =>
  token?.kind === "word" || token?.kind === "text";

const toEntryStep = (
  tokens: readonly SourceToken[],
  index: number,
  toValue: ValueParser
): ParseStep => {
  if (isKey(tokens[index]) && isMark(tokens[index + 1], ":")) {
    return toValue(tokens, index + KEY_OFFSET);
  }

  return toSkipStep(tokens, index);
};

const toRecordStep = (
  tokens: readonly SourceToken[],
  start: number,
  toValue: ValueParser
): ParseStep => {
  const entries: LiteralEntry[] = [];
  let index = start + 1;

  while (index < tokens.length && !isMark(tokens[index], "}")) {
    const key = tokens[index];
    const step = toEntryStep(tokens, index, toValue);

    if (isKey(key) && isMark(tokens[index + 1], ":")) {
      entries.push({ key: key.text, value: step.value });
    }

    index = Math.max(step.next, index + 1);

    if (isMark(tokens[step.next], ",")) {
      index = step.next + 1;
    }
  }

  return { next: index + 1, value: { entries, kind: "record" } };
};

const toValueStep = (
  tokens: readonly SourceToken[],
  start: number
): ParseStep => {
  const token = tokens[start];
  const after = tokens[start + 1];

  if (token?.kind === "text" && token.isPlain && (!after || isStop(after))) {
    return { next: start + 1, value: { kind: "text", text: token.text } };
  }

  if (isMark(token, "[")) {
    const step = toItemsStep(tokens, start + 1, "]", toValueStep);

    return { next: step.next, value: { items: step.items, kind: "list" } };
  }

  if (isMark(token, "{")) {
    return toRecordStep(tokens, start, toValueStep);
  }

  return toSkipStep(tokens, start);
};

const toCallArguments = (
  tokens: readonly SourceToken[],
  open: number
): readonly LiteralValue[] =>
  toItemsStep(tokens, open + 1, ")", toValueStep).items;

export { isMark, toCallArguments };

export type { LiteralEntry, LiteralValue };

type SourceTokenKind = "mark" | "text" | "word";

interface SourceToken {
  readonly isPlain: boolean;
  readonly kind: SourceTokenKind;
  readonly text: string;
}

interface ScanStep {
  readonly next: number;
  readonly token: SourceToken | null;
}

const WORD_START = /[A-Za-z_$]/u;
const WORD_PART = /[\w$-]/u;
const SPACE = /\s/u;
const QUOTES = new Set(["'", '"', "`"]);
const TEMPLATE_QUOTE = "`";
const ESCAPE = "\\";
const LINE_END = "\n";
const TEMPLATE_HOLE = "${";
const COMMENT_SIZE = 2;
const ESCAPE_SIZE = 2;

const toMarkStep = (source: string, start: number): ScanStep => ({
  next: start + 1,
  token: { isPlain: true, kind: "mark", text: source.charAt(start) },
});

const isOpenString = (quote: string, char: string): boolean =>
  char === LINE_END && quote !== TEMPLATE_QUOTE;

const toTextToken = (quote: string, text: string): SourceToken => ({
  isPlain: quote !== TEMPLATE_QUOTE || !text.includes(TEMPLATE_HOLE),
  kind: "text",
  text,
});

const toStringStep = (source: string, start: number): ScanStep => {
  const quote = source.charAt(start);
  let index = start + 1;
  let text = "";

  while (index < source.length) {
    const char = source.charAt(index);

    if (char === quote) {
      return { next: index + 1, token: toTextToken(quote, text) };
    }

    if (isOpenString(quote, char)) {
      return toMarkStep(source, start);
    }

    if (char === ESCAPE) {
      text += source.charAt(index + 1);
      index += ESCAPE_SIZE;
    } else {
      text += char;
      index += 1;
    }
  }

  return toMarkStep(source, start);
};

const toWordStep = (source: string, start: number): ScanStep => {
  let index = start + 1;

  while (index < source.length && WORD_PART.test(source.charAt(index))) {
    index += 1;
  }

  return {
    next: index,
    token: { isPlain: true, kind: "word", text: source.slice(start, index) },
  };
};

const toCommentEnd = (source: string, start: number): number => {
  const pair = source.slice(start, start + COMMENT_SIZE);

  if (pair === "//") {
    const end = source.indexOf(LINE_END, start);

    if (end === -1) {
      return source.length;
    }

    return end;
  }

  if (pair === "/*") {
    const end = source.indexOf("*/", start + COMMENT_SIZE);

    if (end === -1) {
      return source.length;
    }

    return end + COMMENT_SIZE;
  }

  return start;
};

const toScanStep = (source: string, start: number): ScanStep => {
  const char = source.charAt(start);

  if (SPACE.test(char)) {
    return { next: start + 1, token: null };
  }

  const commentEnd = toCommentEnd(source, start);

  if (commentEnd !== start) {
    return { next: commentEnd, token: null };
  }

  if (QUOTES.has(char)) {
    return toStringStep(source, start);
  }

  if (WORD_START.test(char)) {
    return toWordStep(source, start);
  }

  return toMarkStep(source, start);
};

const toSourceTokens = (source: string): readonly SourceToken[] => {
  const tokens: SourceToken[] = [];
  let index = 0;

  while (index < source.length) {
    const step = toScanStep(source, index);

    if (step.token !== null) {
      tokens.push(step.token);
    }

    index = step.next;
  }

  return tokens;
};

export { toSourceTokens };

export type { SourceToken };

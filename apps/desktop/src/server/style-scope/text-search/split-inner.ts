interface InnerTag {
  readonly name: string;
  readonly open: string;
}

interface TagToken {
  readonly end: number;
  readonly isClose: boolean;
  readonly name: string;
  readonly start: number;
  readonly text: string;
}

interface SplitInput {
  readonly after: string;
  readonly before: string;
  readonly close: string;
  readonly isJsx: boolean;
  readonly middle: string;
  readonly open: string;
}

type SplitOutcome =
  | { readonly code: string; readonly isOk: true }
  | { readonly isOk: false; readonly message: string };

const INNER_MESSAGE = "Remove the inner style first, then this one.";

const NAME_CHAR = /[\w.:-]/u;

const NAME_START = /[A-Za-z]/u;

const VOID_TAGS = new Set(["br", "hr", "img", "input", "wbr"]);

const UNSAFE_OPEN = /\{|\sid=/u;

const toBraceStep = (char: string): number => {
  if (char === "{") {
    return 1;
  }

  if (char === "}") {
    return -1;
  }

  return 0;
};

const isQuote = (char: string): boolean => char === '"' || char === "'";

const toTagEnd = (text: string, from: number): number => {
  let quote = "";
  let depth = 0;

  for (let at = from; at < text.length; at += 1) {
    const char = text.charAt(at);

    const isOpenText = quote === "";

    if (!isOpenText && char === quote) {
      quote = "";
    }

    if (isOpenText) {
      depth += toBraceStep(char);
    }

    if (isOpenText && isQuote(char)) {
      quote = char;
    }

    if (isOpenText && char === ">" && depth === 0) {
      return at + 1;
    }
  }

  return -1;
};

const toNameEnd = (text: string, from: number): number => {
  let at = from;

  while (at < text.length && NAME_CHAR.test(text.charAt(at))) {
    at += 1;
  }

  return at;
};

const toTokenAt = (text: string, start: number): TagToken | null => {
  const isClose = text.charAt(start + 1) === "/";
  let nameStart = start + 1;

  if (isClose) {
    nameStart += 1;
  }

  if (!NAME_START.test(text.charAt(nameStart))) {
    return null;
  }

  const nameEnd = toNameEnd(text, nameStart);
  const end = toTagEnd(text, nameEnd);

  if (end === -1) {
    return null;
  }

  const name = text.slice(nameStart, nameEnd);

  return { end, isClose, name, start, text: text.slice(start, end) };
};

const isPairedTag = (token: TagToken): boolean =>
  !token.text.endsWith("/>") && !VOID_TAGS.has(token.name.toLowerCase());

const toTokens = (text: string): TagToken[] => {
  const tokens: TagToken[] = [];
  let at = text.indexOf("<");

  while (at !== -1) {
    const token = toTokenAt(text, at);
    let next = at + 1;

    if (token !== null) {
      next = token.end;
    }

    if (token !== null && isPairedTag(token)) {
      tokens.push(token);
    }

    at = text.indexOf("<", next);
  }

  return tokens;
};

const toOpenStack = (before: string): InnerTag[] | null => {
  const stack: InnerTag[] = [];

  for (const token of toTokens(before)) {
    if (!token.isClose) {
      stack.push({ name: token.name, open: token.text });
    } else if (stack.at(-1)?.name === token.name) {
      stack.pop();
    } else {
      return null;
    }
  }

  return stack;
};

const isOnlyTokens = (text: string, expected: readonly string[]): boolean => {
  const tokens = toTokens(text);

  if (tokens.length !== expected.length) {
    return false;
  }

  let at = 0;

  for (const [index, token] of tokens.entries()) {
    if (token.start !== at || token.name !== expected[index]) {
      return false;
    }

    at = token.end;
  }

  return at === text.length;
};

const toCloses = (stack: readonly InnerTag[]): string =>
  stack
    .toReversed()
    .map((tag) => `</${tag.name}>`)
    .join("");

const toOpens = (stack: readonly InnerTag[]): string =>
  stack.map((tag) => tag.open).join("");

const isUnsafeSplit = (
  input: SplitInput,
  stack: readonly InnerTag[]
): boolean => {
  if (stack.length === 0) {
    return false;
  }

  if (stack.some((tag) => UNSAFE_OPEN.test(tag.open))) {
    return true;
  }

  return (
    input.before.includes("<!--") ||
    (input.isJsx && (input.before.includes("{") || input.after.includes("{")))
  );
};

const toSplitOuter = (input: SplitInput): SplitOutcome => {
  const stack = toOpenStack(input.before);

  if (stack === null || isUnsafeSplit(input, stack)) {
    return { isOk: false, message: INNER_MESSAGE };
  }

  const names = stack.map((tag) => tag.name);
  const isBareHead = isOnlyTokens(input.before, names);
  const isBareTail = isOnlyTokens(input.after, names.toReversed());
  let head = "";
  let tail = "";
  let middleOpen = toOpens(stack);
  let middleClose = toCloses(stack);

  if (isBareHead) {
    middleOpen = input.before;
  } else {
    head = input.open + input.before + toCloses(stack) + input.close;
  }

  if (isBareTail) {
    middleClose = input.after;
  } else {
    tail = input.open + toOpens(stack) + input.after + input.close;
  }

  return {
    code: head + middleOpen + input.middle + middleClose + tail,
    isOk: true,
  };
};

export { toSplitOuter };

export type { SplitInput, SplitOutcome };

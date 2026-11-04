interface Tag {
  readonly end: number;
  readonly kind: "close" | "open" | "self";
  readonly name: string;
  readonly start: number;
}

interface Element {
  readonly children: Element[];
  closeEnd: number;
  closeStart: number;
  readonly name: string;
  readonly openEnd: number;
  readonly openStart: number;
}

interface TextRun {
  readonly end: number;
  readonly start: number;
}

interface Scan {
  readonly root: Element;
  readonly runs: readonly TextRun[];
}

const VOID_NAMES = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

const COMMENT_END = "-->";

const RAW_NAMES = new Set(["script", "style"]);

const NAME_PATTERN = /^<(?<close>\/?)(?<name>[A-Za-z][\w.:-]*)?/u;

const QUOTES = new Set(['"', "'", "`"]);

interface TagState {
  depth: number;
  quote: string;
}

const stepTag = (state: TagState, letter: string): boolean => {
  if (state.quote !== "") {
    if (letter === state.quote) {
      state.quote = "";
    }

    return false;
  }

  if (QUOTES.has(letter)) {
    state.quote = letter;

    return false;
  }

  if (letter === "{" || letter === "}") {
    state.depth += Number(letter === "{") - Number(letter === "}");

    return false;
  }

  return letter === ">" && state.depth <= 0;
};

const tagEndFrom = (source: string, from: number): number => {
  const state: TagState = { depth: 0, quote: "" };

  for (let index = from; index < source.length; index += 1) {
    if (stepTag(state, source.charAt(index))) {
      return index + 1;
    }
  }

  return -1;
};

const isTagStart = (source: string, index: number): boolean => {
  const next = source.charAt(index + 1);

  return /[A-Za-z/>]/u.test(next);
};

const tagOf = (
  kind: Tag["kind"],
  name: string,
  start: number,
  end: number
): Tag => ({ end, kind, name, start });

const readTag = (source: string, start: number): Tag | null => {
  const end = tagEndFrom(source, start + 1);

  if (end === -1) {
    return null;
  }

  const head = NAME_PATTERN.exec(source.slice(start, end));
  const name = (head?.groups?.["name"] ?? "").toLowerCase();
  const isClose = head?.groups?.["close"] === "/";
  const isSelf = source.charAt(end - 2) === "/" || VOID_NAMES.has(name);

  if (isClose) {
    return tagOf("close", name, start, end);
  }

  if (isSelf) {
    return tagOf("self", name, start, end);
  }

  return tagOf("open", name, start, end);
};

const skipRaw = (source: string, from: number, name: string): number => {
  const found = source.toLowerCase().indexOf(`</${name}`, from);

  if (found === -1) {
    return source.length;
  }

  return found;
};

const skipComment = (source: string, index: number): number => {
  const end = source.indexOf(COMMENT_END, index);

  if (end === -1) {
    return source.length;
  }

  return end + COMMENT_END.length;
};

const closeElement = (stack: Element[], tag: Tag): void => {
  const found = stack.map((item) => item.name).lastIndexOf(tag.name);

  if (found < 1) {
    return;
  }

  while (stack.length > found + 1) {
    stack.pop();
  }

  const top = stack.pop() as Element;
  top.closeStart = tag.start;
  top.closeEnd = tag.end;
};

const openElement = (stack: Element[], tag: Tag, isSelf: boolean): Element => {
  const element: Element = {
    children: [],
    closeEnd: tag.end,
    closeStart: tag.end,
    name: tag.name,
    openEnd: tag.end,
    openStart: tag.start,
  };

  const parent = stack.at(-1) as Element;
  parent.children.push(element);

  if (!isSelf) {
    stack.push(element);
  }

  return element;
};

interface Cursor {
  position: number;
  textStart: number;
}

const takeTag = (
  source: string,
  tag: Tag,
  state: { stack: Element[]; runs: TextRun[] },
  cursor: Cursor
): void => {
  state.runs.push({ end: tag.start, start: cursor.textStart });
  cursor.textStart = tag.end;
  cursor.position = tag.end;

  if (tag.kind === "close") {
    closeElement(state.stack, tag);

    return;
  }

  openElement(state.stack, tag, tag.kind === "self");

  if (tag.kind === "open" && RAW_NAMES.has(tag.name)) {
    cursor.position = skipRaw(source, cursor.position, tag.name);
    cursor.textStart = cursor.position;
  }
};

const readTagAt = (source: string, index: number): Tag | null => {
  if (!isTagStart(source, index)) {
    return null;
  }

  return readTag(source, index);
};

const stepScan = (
  source: string,
  state: { stack: Element[]; runs: TextRun[] },
  cursor: Cursor
): void => {
  if (source.charAt(cursor.position) !== "<") {
    cursor.position += 1;

    return;
  }

  if (source.startsWith("<!--", cursor.position)) {
    cursor.position = skipComment(source, cursor.position);

    return;
  }

  const tag = readTagAt(source, cursor.position);

  if (tag === null) {
    cursor.position += 1;

    return;
  }

  takeTag(source, tag, state, cursor);
};

const scanSource = (source: string): Scan => {
  const root: Element = {
    children: [],
    closeEnd: source.length,
    closeStart: source.length,
    name: "",
    openEnd: 0,
    openStart: 0,
  };

  const state = { runs: [] as TextRun[], stack: [root] };
  const cursor: Cursor = { position: 0, textStart: 0 };

  while (cursor.position < source.length) {
    stepScan(source, state, cursor);
  }

  state.runs.push({ end: source.length, start: cursor.textStart });

  return { root, runs: state.runs };
};

const findElement = (root: Element, offset: number): Element | null => {
  if (root.openStart === offset && root.name !== "") {
    return root;
  }

  for (const child of root.children) {
    const found = findElement(child, offset);

    if (found !== null) {
      return found;
    }
  }

  return null;
};

export { findElement, scanSource };

export type { Element, Scan, TextRun };

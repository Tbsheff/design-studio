import type {
  BabelNode,
  CallExpression,
  ObjectExpression,
} from "./babel-types.js";
import { endOf, startOf } from "./cva-node.js";
import { ComponentVariantError } from "./errors.js";

interface Splice {
  readonly end: number;
  readonly start: number;
  readonly text: string;
}

interface CodeStyle {
  readonly quote: string;
  readonly trailing: boolean;
  readonly unit: string;
}

type EntriesAt = (indent: string) => readonly string[];

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;

const OVERLAP = "Two changes touch the same code. Make them in two calls.";

const quoteOf = (text: string): string => {
  const found = /["']/u.exec(text);

  if (found) {
    return found[0];
  }

  return '"';
};

const unitOf = (text: string): string => {
  const indents = text
    .split("\n")
    .map((line) => /^[ \t]*/u.exec(line)?.[0] ?? "")
    .filter((indent) => indent.length > 0)
    .toSorted((left, right) => left.length - right.length);

  return indents[0] ?? "  ";
};

const styleOf = (code: string, call: CallExpression): CodeStyle => {
  const text = code.slice(startOf(call), endOf(call));

  return {
    quote: quoteOf(text),
    trailing: /,\n[ \t]*[}\]]/u.test(text),
    unit: unitOf(text),
  };
};

const literal = (style: CodeStyle, text: string): string =>
  `${style.quote}${text}${style.quote}`;

const keyText = (style: CodeStyle, name: string): string => {
  if (IDENTIFIER.test(name)) {
    return name;
  }

  return literal(style, name);
};

const commaOf = (style: CodeStyle): string => {
  if (style.trailing) {
    return ",";
  }

  return "";
};

const lineIndent = (code: string, at: number): string => {
  const lineStart = code.lastIndexOf("\n", at - 1) + 1;

  return /^[ \t]*/u.exec(code.slice(lineStart, at))?.[0] ?? "";
};

const block = (
  style: CodeStyle,
  indent: string,
  name: string,
  entries: readonly string[]
): string => {
  const inner = `${indent}${style.unit}`;
  const body = entries.map((entry) => `${inner}${entry}`).join(",\n");

  return `${keyText(style, name)}: {\n${body}${commaOf(style)}\n${indent}}`;
};

const skipSpace = (code: string, from: number): number => {
  let at = from;

  while (at < code.length && /\s/u.test(code[at] ?? "")) {
    at += 1;
  }

  return at;
};

const fillEmpty = (
  code: string,
  style: CodeStyle,
  object: ObjectExpression,
  entries: EntriesAt
): Splice => {
  const outer = lineIndent(code, startOf(object));
  const inner = `${outer}${style.unit}`;

  const body = entries(inner)
    .map((entry) => `${inner}${entry}`)
    .join(",\n");

  return {
    end: endOf(object),
    start: startOf(object),
    text: `{\n${body}${commaOf(style)}\n${outer}}`,
  };
};

const appendAfter = (
  code: string,
  last: BabelNode,
  joined: string,
  separator: string
): Splice => {
  const after = skipSpace(code, endOf(last));

  if (code[after] === ",") {
    return { end: after + 1, start: after + 1, text: `${separator}${joined},` };
  }

  return {
    end: endOf(last),
    start: endOf(last),
    text: `,${separator}${joined}`,
  };
};

const insertEntries = (
  code: string,
  style: CodeStyle,
  object: ObjectExpression,
  entries: EntriesAt
): Splice => {
  const last = object.properties.at(-1);

  if (!last) {
    return fillEmpty(code, style, object, entries);
  }

  const isMultiLine = code.slice(startOf(object), endOf(object)).includes("\n");

  if (isMultiLine) {
    const indent = lineIndent(code, startOf(last));

    return appendAfter(
      code,
      last,
      entries(indent).join(`,\n${indent}`),
      `\n${indent}`
    );
  }

  const indent = lineIndent(code, startOf(object));

  return appendAfter(code, last, entries(indent).join(", "), " ");
};

const replaceNode = (node: BabelNode, text: string): Splice => ({
  end: endOf(node),
  start: startOf(node),
  text,
});

const applySplices = (code: string, splices: readonly Splice[]): string => {
  const ordered = splices.toSorted((left, right) => right.start - left.start);
  let out = code;
  let limit = code.length;

  for (const splice of ordered) {
    if (splice.end > limit) {
      throw new ComponentVariantError(OVERLAP);
    }

    out = `${out.slice(0, splice.start)}${splice.text}${out.slice(splice.end)}`;
    limit = splice.start;
  }

  return out;
};

export {
  applySplices,
  block,
  commaOf,
  insertEntries,
  keyText,
  lineIndent,
  literal,
  replaceNode,
  styleOf,
};

export type { CodeStyle, EntriesAt, Splice };

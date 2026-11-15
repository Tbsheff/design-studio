import { toGoogleFont } from "@design-studio/contracts/google-fonts";
import type { GoogleFont } from "@design-studio/contracts/google-fonts";

type NextFontFailure = "class_in_code" | "no_root" | "unknown_family";

type NextFontResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly code: NextFontFailure };

interface NextFontNames {
  readonly constName: string;
  readonly importName: string;
  readonly variable: string;
}

interface TagRange {
  readonly end: number;
  readonly nameEnd: number;
  readonly start: number;
}

interface ClassAttr {
  readonly end: number;
  readonly start: number;
  readonly value: string;
}

interface ScanState {
  readonly depth: number;
  readonly quote: string | null;
}

const GOOGLE_IMPORT =
  /import\s*\{(?<names>[^}]*)\}\s*from\s*["']next\/font\/google["'];?/u;

const IMPORT_LINE =
  /^import\s(?:[^;]*?\sfrom\s*)?["'][^"'\n]+["'];?[^\S\n]*$/gmu;

const CLASS_NAME = /^className\s*=\s*/u;

const QUOTES: ReadonlySet<string> = new Set(['"', "'", "`"]);

const CLASS_PEEK = 40;

const toWords = (family: string): string[] =>
  family.split(/\s+/u).filter((word) => word !== "");

const toCapitalized = (word: string): string =>
  `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`;

const toNextFontNames = (family: string): NextFontNames => {
  const words = toWords(family);
  const [first = "", ...rest] = words;

  return {
    constName: `${first.toLowerCase()}${rest.map((word) => toCapitalized(word)).join("")}`,
    importName: words.join("_"),
    variable: `--font-${words.map((word) => word.toLowerCase()).join("-")}`,
  };
};

const toImportNames = (list: string): string[] =>
  list
    .split(",")
    .map((part) => part.trim().replaceAll(/\s+/gu, " ").split(" as ")[0] ?? "")
    .filter((name) => name !== "");

const hasNextFontImport = (code: string, family: string): boolean => {
  const match = GOOGLE_IMPORT.exec(code);

  if (match === null) {
    return false;
  }

  const { importName } = toNextFontNames(family);

  return toImportNames(match.groups?.["names"] ?? "").includes(importName);
};

const toWeightOption = (font: GoogleFont): string => {
  if (font.weights === null) {
    return 'weight: "400", ';
  }

  return 'weight: ["400", "700"], ';
};

const toFontConst = (font: GoogleFont, names: NextFontNames): string =>
  `const ${names.constName} = ${names.importName}({ subsets: ["latin"], ${toWeightOption(font)}variable: "${names.variable}" });`;

const toMergedImport = (code: string, importName: string): string | null => {
  const match = GOOGLE_IMPORT.exec(code);

  if (match === null) {
    return null;
  }

  const open = code.indexOf("{", match.index);
  const close = code.indexOf("}", open);
  const inner = code.slice(open + 1, close);
  const kept = inner.trimEnd();
  let glue = ", ";

  if (kept.endsWith(",")) {
    glue = " ";
  }

  return `${code.slice(0, open + 1)}${kept}${glue}${importName}${inner.slice(kept.length)}${code.slice(close)}`;
};

const toImportEnd = (code: string): number => {
  let end = 0;

  for (const match of code.matchAll(IMPORT_LINE)) {
    end = match.index + match[0].length;
  }

  return end;
};

const toInsertedLines = (code: string, at: number, lines: string): string => {
  if (at === 0) {
    return `${lines}\n\n${code}`;
  }

  return `${code.slice(0, at)}\n${lines}${code.slice(at)}`;
};

const toCodeWithImport = (
  code: string,
  font: GoogleFont,
  names: NextFontNames
): string => {
  const merged = toMergedImport(code, names.importName);
  const constLine = `\n${toFontConst(font, names)}`;

  if (merged !== null) {
    return toInsertedLines(merged, toImportEnd(merged), constLine);
  }

  const importLine = `import { ${names.importName} } from "next/font/google";`;

  return toInsertedLines(
    code,
    toImportEnd(code),
    `${importLine}\n${constLine}`
  );
};

const toNextScan = (state: ScanState, char: string): ScanState => {
  if (state.quote !== null) {
    if (char === state.quote) {
      return { depth: state.depth, quote: null };
    }

    return state;
  }

  if (QUOTES.has(char)) {
    return { depth: state.depth, quote: char };
  }

  if (char === "{") {
    return { depth: state.depth + 1, quote: null };
  }

  if (char === "}") {
    return { depth: state.depth - 1, quote: null };
  }

  return state;
};

const isScanOpen = (state: ScanState): boolean =>
  state.quote === null && state.depth === 0;

const toTagEnd = (code: string, from: number): number => {
  let state: ScanState = { depth: 0, quote: null };

  for (let at = from; at < code.length; at += 1) {
    const char = code[at] ?? "";

    if (char === ">" && isScanOpen(state)) {
      return at;
    }

    state = toNextScan(state, char);
  }

  return -1;
};

const toTagRange = (code: string, tag: string): TagRange | null => {
  const match = new RegExp(`<${tag}(?=[\\s>/])`, "u").exec(code);

  if (match === null) {
    return null;
  }

  const end = toTagEnd(code, match.index + match[0].length);

  if (end === -1) {
    return null;
  }

  return { end, nameEnd: match.index + match[0].length, start: match.index };
};

const toValueEnd = (code: string, start: number): number => {
  const first = code[start] ?? "";

  if (first === '"' || first === "'") {
    return code.indexOf(first, start + 1) + 1;
  }

  let state: ScanState = { depth: 0, quote: null };

  for (let at = start; at < code.length; at += 1) {
    state = toNextScan(state, code[at] ?? "");

    if (isScanOpen(state)) {
      return at + 1;
    }
  }

  return 0;
};

const toClassMatch = (
  code: string,
  at: number,
  state: ScanState
): string | null => {
  if (!isScanOpen(state) || !/\s/u.test(code[at - 1] ?? "")) {
    return null;
  }

  return CLASS_NAME.exec(code.slice(at, at + CLASS_PEEK))?.[0] ?? null;
};

const toClassAttr = (code: string, range: TagRange): ClassAttr | null => {
  let state: ScanState = { depth: 0, quote: null };

  for (let at = range.nameEnd; at < range.end; at += 1) {
    const match = toClassMatch(code, at, state);

    if (match !== null) {
      const start = at + match.length;
      const end = toValueEnd(code, start);

      return { end, start, value: code.slice(start, end) };
    }

    state = toNextScan(state, code[at] ?? "");
  }

  return null;
};

const toStringClass = (text: string, reference: string): string =>
  `{\`${reference} ${text.slice(1, -1).replaceAll("`", "\\`")}\`}`;

const isQuoted = (text: string, quotes: readonly string[]): boolean =>
  text.length >= 2 &&
  quotes.includes(text.slice(0, 1)) &&
  text.slice(0, 1) === text.slice(-1);

const toClassValue = (value: string, reference: string): string | null => {
  if (isQuoted(value, ['"', "'"])) {
    return toStringClass(value, reference);
  }

  const inner = value.slice(1, -1).trim();

  if (isQuoted(inner, ["`"])) {
    return `{\`${reference} ${inner.slice(1)}}`;
  }

  if (isQuoted(inner, ['"', "'"])) {
    return toStringClass(inner, reference);
  }

  return null;
};

const toRootRange = (code: string): TagRange | null => {
  const body = toTagRange(code, "body");
  const html = toTagRange(code, "html");

  if (body !== null && toClassAttr(code, body) !== null) {
    return body;
  }

  if (html !== null && toClassAttr(code, html) !== null) {
    return html;
  }

  return body ?? html;
};

const toCodeWithClass = (
  code: string,
  names: NextFontNames
): NextFontResult => {
  const range = toRootRange(code);
  const reference = `\${${names.constName}.variable}`;

  if (range === null) {
    return { code: "no_root", ok: false };
  }

  const attr = toClassAttr(code, range);

  if (attr === null) {
    const added = ` className={${names.constName}.variable}`;

    return {
      ok: true,
      value: `${code.slice(0, range.nameEnd)}${added}${code.slice(range.nameEnd)}`,
    };
  }

  const next = toClassValue(attr.value, reference);

  if (next === null) {
    return { code: "class_in_code", ok: false };
  }

  return {
    ok: true,
    value: `${code.slice(0, attr.start)}${next}${code.slice(attr.end)}`,
  };
};

const toNextFontLayoutCode = (code: string, family: string): NextFontResult => {
  const font = toGoogleFont(family);

  if (font === null) {
    return { code: "unknown_family", ok: false };
  }

  if (hasNextFontImport(code, font.family)) {
    return { ok: true, value: code };
  }

  const names = toNextFontNames(font.family);
  const classed = toCodeWithClass(code, names);

  if (!classed.ok) {
    return classed;
  }

  return { ok: true, value: toCodeWithImport(classed.value, font, names) };
};

export { hasNextFontImport, toNextFontLayoutCode, toNextFontNames };

export type { NextFontFailure, NextFontNames, NextFontResult };

import type { TextStyle, TextStyleProp } from "./deps.js";
import { designMdFile } from "./files.js";
import type { SourceFile } from "./files.js";
import { makeStyle } from "./style.js";

interface Row {
  name: string;
  rest: string;
}

type StyleValues = Partial<Record<TextStyleProp, string>>;

const SECTION_WORDS = ["typography", "type scale", "text styles", "text style"];
const HEADING = /^(?<marks>#{1,4})\s/u;
const LENGTH = /^\d+(?:\.\d+)?(?:px|rem|em)$/u;
const VALUE_SPLIT = /[\s/,]/u;
const LINE_HEIGHT = /\/\s?(?<value>\d+(?:\.\d+)?(?:px|rem|em|%)?)/u;
const WEIGHT = /\b(?<value>[1-9]00)\b/u;
const LIST_MARK = /^\s*[-*]\s/u;
const LIST_SPLIT = /[:–—]\s/u;
const SEPARATOR = /^[\s|:-]+$/u;
const NAME_MARKS = /[*`_]/gu;

const toHeadingLevel = (line: string): number =>
  HEADING.exec(line)?.groups?.["marks"]?.length ?? 0;

const isSectionHead = (line: string): boolean => {
  const lower = line.toLowerCase();

  return (
    toHeadingLevel(line) > 0 &&
    SECTION_WORDS.some((word) => lower.includes(word))
  );
};

const toSectionLines = (text: string): string[] => {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => isSectionHead(line));

  if (start === -1) {
    return [];
  }

  const level = toHeadingLevel(lines[start] ?? "");
  const body = lines.slice(start + 1);

  const end = body.findIndex((line) => {
    const found = toHeadingLevel(line);

    return found > 0 && found <= level;
  });

  if (end === -1) {
    return body;
  }

  return body.slice(0, end);
};

const toCleanName = (raw: string): string =>
  raw.replaceAll(NAME_MARKS, "").trim();

const toTableRow = (line: string): Row | null => {
  const trimmed = line.trim();

  if (!trimmed.startsWith("|") || SEPARATOR.test(trimmed)) {
    return null;
  }

  const cells = trimmed
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell) => cell !== "");

  const [name, ...rest] = cells;

  if (!name) {
    return null;
  }

  return { name: toCleanName(name), rest: rest.join(" ") };
};

const listRow = (line: string): Row | null => {
  if (!LIST_MARK.test(line)) {
    return null;
  }

  const item = line.replace(LIST_MARK, "");
  const split = LIST_SPLIT.exec(item);

  if (!split) {
    return null;
  }

  return {
    name: toCleanName(item.slice(0, split.index)),
    rest: item.slice(split.index + split[0].length),
  };
};

const toRowValues = (rest: string): StyleValues => {
  const lengths = rest.split(VALUE_SPLIT).filter((part) => LENGTH.test(part));
  const values: StyleValues = {};
  const [size, second] = lengths;
  const lineHeight = LINE_HEIGHT.exec(rest)?.groups?.["value"] ?? second;
  const weight = WEIGHT.exec(rest)?.groups?.["value"];

  if (size) {
    values.size = size;
  }

  if (lineHeight) {
    values.lineHeight = lineHeight;
  }

  if (weight) {
    values.weight = weight;
  }

  return values;
};

const toRowStyle = (source: SourceFile, line: string): TextStyle | null => {
  const row = toTableRow(line) ?? listRow(line);

  if (!row) {
    return null;
  }

  const values = toRowValues(row.rest);

  if (!("size" in values)) {
    return null;
  }

  return makeStyle({
    file: source.relative,
    name: row.name,
    source: "design-md",
    values,
  });
};

const toDesignMdStyles = async (workTree: string): Promise<TextStyle[]> => {
  const source = await designMdFile(workTree);
  const styles: TextStyle[] = [];

  if (!source) {
    return styles;
  }

  for (const line of toSectionLines(source.text)) {
    const style = toRowStyle(source, line);

    if (style) {
      styles.push(style);
    }
  }

  return styles;
};

export { toDesignMdStyles as designMdStyles };

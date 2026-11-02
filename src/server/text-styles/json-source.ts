import { z } from "zod";

import type { TextStyle, TextStyleProp } from "./deps.js";
import { tokenJsonFiles } from "./files.js";
import type { SourceFile } from "./files.js";
import { makeStyle } from "./style.js";

const jsonValue = z.json();

type JsonValue = z.infer<typeof jsonValue>;

type JsonObject = Record<string, JsonValue>;

type StyleValues = Partial<Record<TextStyleProp, string>>;

const KEYS: [TextStyleProp, string[]][] = [
  ["size", ["fontSize", "font-size", "size"]],
  ["weight", ["fontWeight", "font-weight", "weight"]],
  ["lineHeight", ["lineHeight", "line-height", "leading"]],
  ["letterSpacing", ["letterSpacing", "letter-spacing", "tracking"]],
  ["family", ["fontFamily", "font-family", "family"]],
];

const MAX_DEPTH = 4;

const objectSchema = z.record(z.string(), jsonValue);

const scalarSchema = z.union([
  z.string(),
  z.number().transform(String),
  z.array(z.string()).transform((parts) => parts.join(", ")),
]);

const leafSchema = z.union([
  scalarSchema,
  z.object({ $value: scalarSchema }).transform((leaf) => leaf.$value),
  z.object({ value: scalarSchema }).transform((leaf) => leaf.value),
]);

const groupWithTypography = z.object({ typography: objectSchema });

const rootSchema = z.union([
  z.object({ typography: objectSchema }).transform((root) => root.typography),
  z.object({ font: objectSchema }).transform((root) => root.font),
  z.object({ text: objectSchema }).transform((root) => root.text),
]);

const unwrap = (raw: JsonObject): JsonObject => {
  const inner = objectSchema.safeParse(raw["$value"] ?? raw["value"]);

  if (inner.success) {
    return inner.data;
  }

  return raw;
};

const valuesOf = (raw: JsonObject): StyleValues => {
  const entry = unwrap(raw);
  const values: StyleValues = {};

  for (const [prop, keys] of KEYS) {
    const key = keys.find((candidate) => candidate in entry) ?? "";
    const parsed = leafSchema.safeParse(entry[key]);

    if (parsed.success) {
      values[prop] = parsed.data;
    }
  }

  return values;
};

const hasText = (values: StyleValues): boolean =>
  "size" in values || "family" in values;

interface Pending {
  depth: number;
  group: JsonObject;
  prefix: string;
}

interface Walk {
  pending: Pending[];
  source: SourceFile;
  styles: TextStyle[];
}

const visit = (walk: Walk, at: Pending, key: string, raw: JsonValue): void => {
  const value = objectSchema.safeParse(raw);

  if (!value.success || key.startsWith("$")) {
    return;
  }

  const entryName = [at.prefix, key].filter((part) => part !== "").join("-");
  const values = valuesOf(value.data);

  if (hasText(values)) {
    walk.styles.push(
      makeStyle({
        file: walk.source.relative,
        name: entryName,
        source: "tokens-json",
        values,
      })
    );

    return;
  }

  if (at.depth < MAX_DEPTH) {
    walk.pending.push({
      depth: at.depth + 1,
      group: value.data,
      prefix: entryName,
    });
  }
};

const collect = (file: SourceFile, root: JsonObject): TextStyle[] => {
  const walk: Walk = {
    pending: [{ depth: 0, group: root, prefix: "" }],
    source: file,
    styles: [],
  };

  for (let at = walk.pending.shift(); at; at = walk.pending.shift()) {
    for (const [key, raw] of Object.entries(at.group)) {
      visit(walk, at, key, raw);
    }
  }

  return walk.styles;
};

const nestedTypography = (root: JsonObject): JsonObject | null => {
  for (const value of Object.values(root)) {
    const nested = groupWithTypography.safeParse(value);

    if (nested.success) {
      return nested.data.typography;
    }
  }

  return null;
};

const typographyOf = (root: JsonObject | null): JsonObject | null => {
  if (!root) {
    return null;
  }

  const direct = rootSchema.safeParse(root);

  if (direct.success) {
    return direct.data;
  }

  return nestedTypography(root);
};

const parseJson = (text: string): JsonObject | null => {
  try {
    const parsed = objectSchema.safeParse(JSON.parse(text));

    if (parsed.success) {
      return parsed.data;
    }

    return null;
  } catch {
    return null;
  }
};

const fileStyles = (source: SourceFile): TextStyle[] => {
  const typography = typographyOf(parseJson(source.text));

  if (!typography) {
    return [];
  }

  return collect(source, typography);
};

const tokenJsonStyles = async (workTree: string): Promise<TextStyle[]> => {
  const files = await tokenJsonFiles(workTree);

  return files.flatMap((file) => fileStyles(file));
};

export { objectSchema, parseJson, tokenJsonStyles };

export type { JsonObject };

import { Schema } from "effect";

import { toDecoder } from "./deps.js";
import type { TextStyle, TextStyleProp } from "./deps.js";
import { tokenJsonFiles } from "./files.js";
import type { SourceFile } from "./files.js";
import { makeStyle } from "./style.js";

type JsonValue =
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue }
  | null;

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

const isText = Schema.is(Schema.String);
const isNumber = Schema.is(Schema.Number);
const isTextList = Schema.is(Schema.Array(Schema.String));
const isRecord = Schema.is(Schema.Record(Schema.String, Schema.Json));

const decodeJsonText = toDecoder(Schema.fromJsonString(Schema.Json), "ignore");

const isJsonObject = (raw: JsonValue | null): raw is JsonObject =>
  isRecord(raw) && !Array.isArray(raw);

const toObject = (raw: JsonValue | null): JsonObject | null => {
  if (isJsonObject(raw)) {
    return raw;
  }

  return null;
};

const toScalar = (raw: JsonValue | null): string | null => {
  if (isText(raw)) {
    return raw;
  }

  if (isNumber(raw)) {
    return String(raw);
  }

  if (isTextList(raw)) {
    return raw.join(", ");
  }

  return null;
};

const toLeaf = (raw: JsonValue | null): string | null => {
  const scalar = toScalar(raw);

  if (scalar !== null) {
    return scalar;
  }

  const entry = toObject(raw);

  if (entry === null) {
    return null;
  }

  return toScalar(entry["$value"] ?? null) ?? toScalar(entry["value"] ?? null);
};

const ROOT_KEYS = ["typography", "font", "text"] as const;

const toRoot = (raw: JsonObject): JsonObject | null => {
  for (const key of ROOT_KEYS) {
    const found = toObject(raw[key] ?? null);

    if (found) {
      return found;
    }
  }

  return null;
};

const unwrap = (raw: JsonObject): JsonObject => {
  const inner = toObject(raw["$value"] ?? raw["value"] ?? null);

  if (inner) {
    return inner;
  }

  return raw;
};

const valuesOf = (raw: JsonObject): StyleValues => {
  const entry = unwrap(raw);
  const values: StyleValues = {};

  for (const [prop, keys] of KEYS) {
    const key = keys.find((candidate) => candidate in entry) ?? "";
    const parsed = toLeaf(entry[key] ?? null);

    if (parsed !== null) {
      values[prop] = parsed;
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
  const value = toObject(raw);

  if (value === null || key.startsWith("$")) {
    return;
  }

  const entryName = [at.prefix, key].filter((part) => part !== "").join("-");
  const values = valuesOf(value);

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
      group: value,
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
    const typography = toObject(toObject(value)?.["typography"] ?? null);

    if (typography) {
      return typography;
    }
  }

  return null;
};

const typographyOf = (root: JsonObject | null): JsonObject | null => {
  if (!root) {
    return null;
  }

  const direct = toRoot(root);

  if (direct) {
    return direct;
  }

  return nestedTypography(root);
};

const parseJson = (text: string): JsonObject | null => {
  const parsed = decodeJsonText(text);

  if (parsed._tag === "Failure") {
    return null;
  }

  return toObject(parsed.success);
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

export { parseJson, toObject, tokenJsonStyles };

export type { JsonObject };

import type { Schema } from "effect";

type TargetKind = "element" | "loc" | "owner" | "place";

interface NestedFields {
  readonly fields: readonly string[];
  readonly key: string;
}

type ToolKinds = Readonly<Record<string, TargetKind>>;

type ToolNesting = Readonly<Record<string, NestedFields>>;

type ToolKeys = Readonly<Record<string, readonly string[]>>;

type JsonFields = Readonly<Record<string, Schema.Json>>;

interface LegacyFields {
  readonly properties: JsonFields;
  readonly required: readonly string[];
}

const TARGET_KINDS = {
  apply_text_style: "element",
  clear_text: "owner",
  get_fill: "loc",
  get_spacing: "loc",
  get_stacking: "loc",
  insert_icon: "owner",
  insert_jsx: "owner",
  list_motion: "loc",
  list_state_styles: "loc",
  place_image: "place",
  set_accessibility: "element",
  set_fill: "element",
  set_motion: "element",
  set_spacing: "element",
  set_stacking: "element",
  set_state_style: "element",
} as const satisfies ToolKinds;

const NESTED = {
  set_fill: {
    fields: [
      "angle",
      "at",
      "blendMode",
      "blendProperty",
      "color",
      "form",
      "stops",
      "token",
      "type",
    ],
    key: "fill",
  },
  set_motion: {
    fields: [
      "delayMs",
      "durationMs",
      "easing",
      "end",
      "kind",
      "preset",
      "properties",
      "staggerMs",
      "state",
    ],
    key: "spec",
  },
  set_spacing: {
    fields: ["property", "side", "snap", "token", "value"],
    key: "spacing",
  },
} as const satisfies ToolNesting;

const NULLABLE_ARRAYS = {
  update_text: ["ids"],
} as const satisfies ToolKeys;

const LOC_KEYS: ReadonlySet<string> = new Set(["col", "file", "line"]);

const TARGET_KEY = "target";

const PATH_PROPERTY = {
  description:
    'Page path in the project, for example "about.html". Leave out for the entry page. Used with targetSelector.',
  maxLength: 300,
  type: "string",
} satisfies Schema.Json;

const SELECTOR_PROPERTY = {
  description:
    "CSS selector or layer id of the element. Use this, targetSource or the new target fields.",
  maxLength: 2000,
  minLength: 1,
  type: "string",
} satisfies Schema.Json;

const SOURCE_PROPERTY = {
  description:
    "Or the element as file:line:col of its tag, as get_layers prints it. file:line works when one tag starts on that line.",
  maxLength: 1100,
  type: "string",
} satisfies Schema.Json;

const TARGET_PROPERTIES = {
  path: PATH_PROPERTY,
  targetSelector: SELECTOR_PROPERTY,
  targetSource: SOURCE_PROPERTY,
} satisfies Record<string, Schema.Json>;

const toKind = (name: string): TargetKind | null =>
  Object.entries(TARGET_KINDS).find(([key]) => key === name)?.[1] ?? null;

const toNested = (name: string): NestedFields | null =>
  Object.entries(NESTED).find(([key]) => key === name)?.[1] ?? null;

const isRecord = (value: Schema.Json | undefined): value is JsonFields =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toNestedProperties = (
  nested: NestedFields,
  properties: JsonFields
): JsonFields => {
  const holder = properties[nested.key];

  if (!isRecord(holder) || !isRecord(holder["properties"])) {
    return {};
  }

  const inner = holder["properties"];
  const fields = new Set(nested.fields);

  return Object.fromEntries(
    Object.entries(inner).filter(([key]) => fields.has(key))
  );
};

const toDroppedKeys = (name: string): ReadonlySet<string> => {
  const kind = toKind(name);
  const nested = toNested(name);
  const keys: string[] = [];

  if (kind === "loc") {
    keys.push(...LOC_KEYS);
  }

  if (kind !== null && kind !== "loc") {
    keys.push(TARGET_KEY);
  }

  if (nested !== null) {
    keys.push(nested.key);
  }

  return new Set(keys);
};

const toArrayBranch = (value: Schema.Json | undefined): JsonFields | null => {
  if (!isRecord(value) || !Array.isArray(value["anyOf"])) {
    return null;
  }

  const branch = value["anyOf"].find(
    (item) => isRecord(item) && item["type"] === "array"
  );

  if (!isRecord(branch)) {
    return null;
  }

  return branch;
};

const toNullableArrays = (name: string, properties: JsonFields): JsonFields => {
  const keys: readonly string[] =
    Object.entries(NULLABLE_ARRAYS).find(([key]) => key === name)?.[1] ?? [];

  return Object.fromEntries(
    keys.flatMap((key) => {
      const branch = toArrayBranch(properties[key]);

      if (branch === null) {
        return [];
      }

      return [[key, { ...branch, type: ["array", "null"] }]];
    })
  );
};

const toAddedProperties = (
  name: string,
  properties: JsonFields
): JsonFields => {
  const nested = toNested(name);
  const added: Record<string, Schema.Json> = {};

  if (toKind(name) !== null) {
    Object.assign(added, TARGET_PROPERTIES);
  }

  if (nested !== null) {
    Object.assign(added, toNestedProperties(nested, properties));
  }

  return Object.fromEntries([
    ...Object.entries(added),
    ...Object.entries(toNullableArrays(name, properties)),
  ]);
};

const toLegacyTargetFields = (
  name: string,
  fields: LegacyFields
): LegacyFields => {
  const dropped = toDroppedKeys(name);

  return {
    properties: {
      ...fields.properties,
      ...toAddedProperties(name, fields.properties),
    },
    required: fields.required.filter((key) => !dropped.has(key)),
  };
};

export { toKind, toLegacyTargetFields, toNested };

export type { NestedFields, TargetKind };

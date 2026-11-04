import { Schema } from "effect";
import { z } from "zod";

import type { AnyAction } from "@design-studio/actions/_core/action";

type SdkFields = Readonly<Record<string, z.ZodType>>;

type SdkFieldSet<Fields extends Schema.Struct.Fields> = {
  readonly [Key in keyof Fields & string]: z.ZodType<
    Key extends keyof Schema.Struct.Encoded<Fields>
      ? Schema.Struct.Encoded<Fields>[Key]
      : never
  >;
};

type ZodJsonSchema = Parameters<typeof z.fromJSONSchema>[0];

type SchemaValue =
  | boolean
  | number
  | string
  | SchemaNode
  | readonly SchemaValue[]
  | null;

interface SchemaNode {
  readonly [key: string]: SchemaValue;
}

const DROPPED_KEYS: ReadonlySet<string> = new Set(["$schema", "not"]);

const TYPE_SIDE_KEYS: ReadonlySet<string> = new Set([
  "description",
  "maxLength",
  "minLength",
  "pattern",
]);

const TRIMMED_PATTERN = String.raw`^\S[\s\S]*\S$|^\S$|^$`;

const isNode = (value: SchemaValue): value is SchemaNode =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isList = (value: SchemaValue): value is readonly SchemaValue[] =>
  Array.isArray(value);

const toCheckNodes = (decoded: SchemaNode): readonly SchemaNode[] => {
  const checks = decoded["allOf"] ?? [];

  if (isList(checks)) {
    return checks.filter((check) => isNode(check));
  }

  return [];
};

const toTypeSideKeys = (
  encoded: SchemaNode,
  decoded: SchemaNode
): [string, SchemaValue][] => {
  if (encoded["type"] !== decoded["type"]) {
    return [];
  }

  const isKept = ([key, value]: [string, SchemaValue]): boolean =>
    TYPE_SIDE_KEYS.has(key) &&
    !(key in encoded) &&
    value !== TRIMMED_PATTERN &&
    value !== 0;

  return [decoded, ...toCheckNodes(decoded)].flatMap((node) =>
    Object.entries(node).filter((entry) => isKept(entry))
  );
};

const toMergedValue = (
  encoded: SchemaValue,
  decoded: SchemaValue
): SchemaValue => {
  if (isList(encoded) && isList(decoded)) {
    return encoded.map((value, index) =>
      toMergedValue(value, decoded[index] ?? null)
    );
  }

  if (isNode(encoded) && isNode(decoded)) {
    return Object.fromEntries([
      ...Object.entries(encoded).map(([key, value]) => [
        key,
        toMergedValue(value, decoded[key] ?? null),
      ]),
      ...toTypeSideKeys(encoded, decoded),
    ]);
  }

  return encoded;
};

const toSdkFromSchema = (input: Schema.Top): SdkFields => {
  const encoded = Schema.toJsonSchemaDocument(input);
  const decoded = Schema.toJsonSchemaDocument(Schema.toType(input));

  const merged = toMergedValue(
    encoded.schema as SchemaNode,
    decoded.schema as SchemaNode
  ) as SchemaNode;

  const kept = Object.entries(merged).filter(([key]) => !DROPPED_KEYS.has(key));

  const converted = z.fromJSONSchema({
    properties: {},
    type: "object",
    ...Object.fromEntries(kept),
    $defs: encoded.definitions,
  } as ZodJsonSchema);

  if (converted instanceof z.ZodObject) {
    return converted.shape;
  }

  return z.object({}).shape;
};

const toSdkFields = (action: AnyAction): SdkFields =>
  toSdkFromSchema(action.input);

const toSdkFieldSet = <Fields extends Schema.Struct.Fields>(
  fields: Fields
): SdkFieldSet<Fields> =>
  toSdkFromSchema(Schema.Struct(fields)) as SdkFieldSet<Fields>;

export { toSdkFields, toSdkFieldSet };

export type { SdkFields, SdkFieldSet };

import { Schema } from "effect";
import { z } from "zod";

import type { AnyAction } from "../../shared/actions/_core/action.js";

type SdkFields = Readonly<Record<string, z.ZodType>>;

type ZodJsonSchema = Parameters<typeof z.fromJSONSchema>[0];

const DROPPED_KEYS: ReadonlySet<string> = new Set(["$schema", "not"]);

const toSdkFromSchema = (input: Schema.Top): SdkFields => {
  const document = Schema.toJsonSchemaDocument(input);

  const kept = Object.entries(document.schema).filter(
    ([key]) => !DROPPED_KEYS.has(key)
  );

  const converted = z.fromJSONSchema({
    properties: {},
    type: "object",
    ...Object.fromEntries(kept),
    $defs: document.definitions,
  } as ZodJsonSchema);

  if (converted instanceof z.ZodObject) {
    return converted.shape;
  }

  return z.object({}).shape;
};

const toSdkFields = (action: AnyAction): SdkFields =>
  toSdkFromSchema(action.input);

const toSdkFieldSet = (fields: Schema.Struct.Fields): SdkFields =>
  toSdkFromSchema(Schema.Struct(fields));

export { toSdkFields, toSdkFieldSet };

export type { SdkFields };

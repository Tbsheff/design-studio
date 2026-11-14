import { Effect, Schema } from "effect";

const BASE_VARIANT = Effect.succeed("");

const StyleVariantSchema = Schema.String.pipe(
  Schema.withDecodingDefaultKey(BASE_VARIANT)
);

export { StyleVariantSchema };

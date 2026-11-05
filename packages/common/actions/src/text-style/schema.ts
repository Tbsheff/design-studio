import {
  TEXT_STYLE_LIST_DEFAULT,
  TEXT_STYLE_LIST_MAX,
  TEXT_STYLE_NAME,
  TEXT_STYLE_QUERY_MAX,
  TEXT_STYLE_SOURCES,
  TEXT_STYLE_VALUE_MAX,
} from "@design-studio/contracts/text-styles";
import { Effect, Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const PAGE_MAX = 300;

const SELECTOR_MAX = 2000;

const TextStyleTargetFields = {
  directionId: DirectionIdSchema,
  projectId: ProjectIdSchema,
} as const;

const TextStyleNameSchema = Schema.String.check(
  Schema.isPattern(TEXT_STYLE_NAME)
);

const TextStyleSourceSchema = Schema.Literals(TEXT_STYLE_SOURCES);

const TextStyleLimitSchema = Schema.Int.check(
  Schema.isBetween({ maximum: TEXT_STYLE_LIST_MAX, minimum: 1 })
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(TEXT_STYLE_LIST_DEFAULT)));

const TextStyleQuerySchema = Schema.String.check(
  Schema.isMaxLength(TEXT_STYLE_QUERY_MAX)
).pipe(Schema.withDecodingDefaultKey(Effect.succeed("")));

const TextStyleInspectFields = {
  limit: TextStyleLimitSchema,
  query: TextStyleQuerySchema,
} as const;

const TextStyleValueSchema = Schema.String.check(
  Schema.isMaxLength(TEXT_STYLE_VALUE_MAX)
);

const TextStyleComputedSchema = Schema.Record(
  Schema.String,
  TextStyleValueSchema
);

const TextStylePageSchema = Schema.String.check(Schema.isMaxLength(PAGE_MAX));

const TextStyleSelectorSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(SELECTOR_MAX)
);

const TextStyleProbeFields = {
  path: Schema.optionalKey(TextStylePageSchema),
  selector: Schema.optionalKey(TextStyleSelectorSchema),
  styles: Schema.optionalKey(TextStyleComputedSchema),
} as const;

const TextStyleVarsSchema = Schema.Struct({
  family: Schema.optionalKey(Schema.String),
  letterSpacing: Schema.optionalKey(Schema.String),
  lineHeight: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(Schema.String),
  weight: Schema.optionalKey(Schema.String),
});

const TextStyleValuesSchema = Schema.Struct({
  family: Schema.NullOr(Schema.String),
  letterSpacing: Schema.NullOr(Schema.String),
  lineHeight: Schema.NullOr(Schema.String),
  size: Schema.NullOr(Schema.String),
  weight: Schema.NullOr(Schema.String),
});

const TextStyleSchema = Schema.Struct({
  family: Schema.NullOr(Schema.String),
  file: Schema.String,
  letterSpacing: Schema.NullOr(Schema.String),
  lineHeight: Schema.NullOr(Schema.String),
  name: Schema.String,
  size: Schema.NullOr(Schema.String),
  source: TextStyleSourceSchema,
  vars: TextStyleVarsSchema,
  weight: Schema.NullOr(Schema.String),
});

const TextStyleListSchema = Schema.Struct({
  sources: Schema.Array(TextStyleSourceSchema),
  styles: Schema.Array(TextStyleSchema),
  total: Schema.Int,
});

const TextStyleClassChangesSchema = Schema.Struct({
  add: Schema.Array(Schema.String),
  remove: Schema.Array(Schema.String),
});

const TextStyleAppliedSchema = Schema.Struct({
  classes: Schema.NullOr(TextStyleClassChangesSchema),
  file: Schema.String,
  mode: Schema.Literals(["classes", "css"]),
  style: Schema.String,
  title: Schema.String,
  versionId: Schema.NullOr(Schema.String),
});

const TextStyleCreatedSchema = Schema.Struct({
  file: Schema.String,
  name: Schema.String,
  source: TextStyleSourceSchema,
  title: Schema.String,
  values: TextStyleValuesSchema,
  versionId: Schema.NullOr(Schema.String),
});

const TextStyleDetachedSchema = Schema.Struct({
  file: Schema.String,
  title: Schema.String,
  versionId: Schema.NullOr(Schema.String),
});

export {
  TextStyleAppliedSchema,
  TextStyleCreatedSchema,
  TextStyleDetachedSchema,
  TextStyleInspectFields,
  TextStyleListSchema,
  TextStyleNameSchema,
  TextStyleProbeFields,
  TextStyleTargetFields,
};

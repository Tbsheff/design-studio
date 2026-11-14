import { Effect, Schema } from "effect";

import { DirectionIdSchema } from "../_core/ids.js";

const MAX_APPLY_IDS = 20;

const KitDriftTagSchema = Schema.Literals([
  "button",
  "input",
  "textarea",
  "select",
  "label",
  "table",
  "a-as-button",
  "card",
]);

const KitDriftConfidenceSchema = Schema.Literals(["high", "medium"]);

const KitDriftSkipReasonSchema = Schema.Literals([
  "spread-props",
  "dynamic-tag",
  "inside-kit",
  "not-found",
  "needs-parts",
  "name-clash",
  "parse-failed",
]);

const KitDriftComponentSchema = Schema.Struct({
  importPath: Schema.String,
  name: Schema.String,
});

const KitDriftSchema = Schema.Struct({
  column: Schema.Int,
  confidence: KitDriftConfidenceSchema,
  droppedClasses: Schema.Array(Schema.String),
  file: Schema.String,
  id: Schema.String,
  keptClasses: Schema.Array(Schema.String),
  kitComponent: KitDriftComponentSchema,
  line: Schema.Int,
  parts: Schema.Array(Schema.String),
  suggestedSize: Schema.NullOr(Schema.String),
  suggestedVariant: Schema.NullOr(Schema.String),
  tag: KitDriftTagSchema,
});

const KitDriftScopeFields = {
  directionId: Schema.NullOr(DirectionIdSchema)
    .annotate({
      description: "Direction id. Pass null for the main direction.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
} as const;

const KitDriftListFields = {
  ...KitDriftScopeFields,
  page: Schema.NullOr(Schema.String)
    .annotate({
      description:
        "Source file to scan, relative to the app. Pass null to scan every route and component file of the app.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
} as const;

const KitDriftApplyFields = {
  ...KitDriftScopeFields,
  ids: Schema.Array(Schema.String).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(MAX_APPLY_IDS)
  ),
} as const;

const KitDriftSkippedSchema = Schema.Struct({
  id: Schema.String,
  reason: KitDriftSkipReasonSchema,
});

const KitDriftAppliedSchema = Schema.Struct({
  changed: Schema.Array(Schema.String),
  files: Schema.Array(Schema.String),
  skipped: Schema.Array(KitDriftSkippedSchema),
  versionId: Schema.NullOr(Schema.String),
});

export {
  KitDriftAppliedSchema,
  KitDriftApplyFields,
  KitDriftListFields,
  KitDriftSchema,
  KitDriftSkippedSchema,
};

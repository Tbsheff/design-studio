import { Effect, Schema } from "effect";

import { DirectionIdSchema } from "../_core/ids.js";

const IMPACT_ROUTES_DEFAULT = 8;

const IMPACT_ROUTES_MAX = 12;

const ImpactPhaseSchema = Schema.Literals(["baseline", "compare"]);

const ImpactLastPhaseSchema = Schema.Literals(["none", "baseline", "compare"]);

const ImpactRouteStatusSchema = Schema.Literals([
  "saved",
  "changed",
  "same",
  "failed",
]);

const ImpactDirectionField = Schema.NullOr(DirectionIdSchema)
  .annotate({
    description: "Direction id. Pass null for the main direction.",
  })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const ImpactLimitField = Schema.Int.check(
  Schema.isBetween({ maximum: IMPACT_ROUTES_MAX, minimum: 1 })
).annotate({
  description: "Most routes to return. 1 to 12.",
});

const ImpactGetFields = {
  directionId: ImpactDirectionField,
  limit: ImpactLimitField.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(IMPACT_ROUTES_MAX))
  ),
} as const;

const ImpactRunFields = {
  directionId: ImpactDirectionField,
  file: Schema.String.annotate({
    description:
      "Shared file to check, relative to the project folder or the app folder, for example src/components/Button.tsx.",
  }),
  limit: Schema.Int.check(
    Schema.isBetween({ maximum: IMPACT_ROUTES_MAX, minimum: 1 })
  )
    .annotate({
      description: "Most routes to shoot. 1 to 12. The default is 8.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(IMPACT_ROUTES_DEFAULT))),
  phase: ImpactPhaseSchema.annotate({
    description:
      "baseline shoots and keeps the routes before the edit. compare shoots them again and diffs them against the baseline.",
  }),
} as const;

const ImpactRouteSchema = Schema.Struct({
  after: Schema.NullOr(Schema.String),
  before: Schema.NullOr(Schema.String),
  changedPct: Schema.NullOr(Schema.Number),
  diff: Schema.NullOr(Schema.String),
  file: Schema.String,
  note: Schema.NullOr(Schema.String),
  route: Schema.String,
  status: ImpactRouteStatusSchema,
});

const ImpactResultSchema = Schema.Struct({
  component: Schema.NullOr(Schema.String),
  file: Schema.NullOr(Schema.String),
  hasBaseline: Schema.Boolean,
  phase: ImpactLastPhaseSchema,
  routes: Schema.Array(ImpactRouteSchema),
});

export {
  IMPACT_ROUTES_DEFAULT,
  IMPACT_ROUTES_MAX,
  ImpactGetFields,
  ImpactLastPhaseSchema,
  ImpactPhaseSchema,
  ImpactResultSchema,
  ImpactRouteSchema,
  ImpactRouteStatusSchema,
  ImpactRunFields,
};

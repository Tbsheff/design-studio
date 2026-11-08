import { Effect, Schema } from "effect";

const MAX_WIDTHS = 6;

const PHONE_WIDTH = 375;

const TABLET_WIDTH = 768;

const DESKTOP_WIDTH = 1280;

const DEFAULT_WIDTHS: readonly number[] = [
  PHONE_WIDTH,
  TABLET_WIDTH,
  DESKTOP_WIDTH,
];

const ViewportWidthSchema = Schema.Int.check(
  Schema.isBetween({ maximum: 4000, minimum: 200 })
);

const ViewportSchemeSchema = Schema.Literals(["light", "dark", "both"]);

const ViewportCellSchemeSchema = Schema.Literals(["light", "dark"]);

const ViewportFindingKindSchema = Schema.Literals([
  "clipped-text",
  "horizontal-scroll",
  "overflow",
  "tap-target",
]);

const ViewportMatrixFields = {
  page: Schema.String.annotate({
    description:
      "Page path relative to the project root. Leave out for the entry page.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed(""))),
  schemes: ViewportSchemeSchema.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed("both" as const))
  ),
  widths: Schema.Array(ViewportWidthSchema)
    .check(Schema.isMaxLength(MAX_WIDTHS), Schema.isMinLength(1))
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(DEFAULT_WIDTHS))),
} as const;

const ViewportFrameSchema = Schema.Struct({
  frameId: Schema.String,
  height: Schema.Int,
  label: Schema.String,
  left: Schema.Int,
  scheme: ViewportCellSchemeSchema,
  top: Schema.Int,
  width: Schema.Int,
});

const ViewportCreatedSchema = Schema.Struct({
  frames: Schema.Array(ViewportFrameSchema),
  page: Schema.String,
});

const ViewportFindingSchema = Schema.Struct({
  detail: Schema.String,
  frameId: Schema.NullOr(Schema.String),
  kind: ViewportFindingKindSchema,
  scheme: ViewportCellSchemeSchema,
  selector: Schema.String,
  source: Schema.NullOr(Schema.String),
  width: Schema.Int,
});

const ViewportCellSchema = Schema.Struct({
  clippedText: Schema.Int,
  frameId: Schema.NullOr(Schema.String),
  horizontalScroll: Schema.Boolean,
  overflow: Schema.Int,
  scheme: ViewportCellSchemeSchema,
  tapTargets: Schema.Int,
  width: Schema.Int,
});

const ViewportInspectedSchema = Schema.Struct({
  cells: Schema.Array(ViewportCellSchema),
  contactSheet: Schema.NullOr(Schema.String),
  findings: Schema.Array(ViewportFindingSchema),
  page: Schema.String,
});

const FIX_DEFAULT_WIDTHS: readonly number[] = [PHONE_WIDTH, TABLET_WIDTH];

const FIX_ALL_KINDS = [
  "overflow",
  "clipped-text",
  "tap-target",
  "horizontal-scroll",
] as const;

const ViewportFixFields = {
  isDryRun: Schema.Boolean.annotate({
    description:
      "True lists the edits and writes nothing. False writes them as one version.",
  }),
  kinds: Schema.Array(ViewportFindingKindSchema)
    .check(Schema.isMinLength(1))
    .annotate({
      description:
        "Finding kinds to fix: overflow, clipped-text, tap-target, horizontal-scroll. Default all.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(FIX_ALL_KINDS))),
  page: Schema.String.annotate({
    description:
      "Page path relative to the project root. Leave out for the entry page.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed(""))),
  widths: Schema.Array(ViewportWidthSchema)
    .check(Schema.isMaxLength(MAX_WIDTHS), Schema.isMinLength(1))
    .annotate({ description: "Widths to fix. Default 375 and 768." })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(FIX_DEFAULT_WIDTHS))),
} as const;

const ViewportFixAppliedSchema = Schema.Struct({
  after: Schema.String,
  before: Schema.String,
  kind: ViewportFindingKindSchema,
  layerId: Schema.String,
  width: Schema.Int,
});

const ViewportFixSkippedSchema = Schema.Struct({
  kind: ViewportFindingKindSchema,
  layerId: Schema.NullOr(Schema.String),
  reason: Schema.String,
  width: Schema.Int,
});

const ViewportFixCountSchema = Schema.Struct({
  clippedText: Schema.Int,
  horizontalScroll: Schema.Int,
  overflow: Schema.Int,
  tapTargets: Schema.Int,
  width: Schema.Int,
});

const ViewportFixedSchema = Schema.Struct({
  after: Schema.Array(ViewportFixCountSchema),
  applied: Schema.Array(ViewportFixAppliedSchema),
  before: Schema.Array(ViewportFixCountSchema),
  skipped: Schema.Array(ViewportFixSkippedSchema),
  versionId: Schema.NullOr(Schema.String),
});

export {
  ViewportFixAppliedSchema,
  ViewportFixCountSchema,
  ViewportFixedSchema,
  ViewportFixFields,
  ViewportFixSkippedSchema,
  ViewportCellSchema,
  ViewportCreatedSchema,
  ViewportFindingSchema,
  ViewportFrameSchema,
  ViewportInspectedSchema,
  ViewportMatrixFields,
  ViewportSchemeSchema,
  ViewportWidthSchema,
};

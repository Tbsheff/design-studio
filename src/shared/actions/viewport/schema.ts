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

export {
  ViewportCellSchema,
  ViewportCreatedSchema,
  ViewportFindingSchema,
  ViewportFrameSchema,
  ViewportInspectedSchema,
  ViewportMatrixFields,
  ViewportSchemeSchema,
  ViewportWidthSchema,
};

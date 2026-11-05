import {
  GRID_DISPLAYS,
  GRID_LINE_MAX,
  GRID_TRACKS_MAX,
  GRID_TRACKS_PATTERN,
} from "@design-studio/contracts/grid";
import { Effect, Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const BREAKPOINT_PATTERN = /^(?:base|[a-z0-9][a-z0-9-]{0,30})$/u;

const ITEM_LIMIT_MAX = 200;

const GridModeSchema = Schema.Literals(["classes", "css", "none"]);

const GridSourceSchema = Schema.Literals(["class", "css", "unset"]);

const GridBreakpointSchema = Schema.String.check(
  Schema.isPattern(BREAKPOINT_PATTERN)
);

const GridBreakpointDefaultSchema = GridBreakpointSchema.pipe(
  Schema.withDecodingDefaultKey(Effect.succeed("base"))
);

const GridItemLimitSchema = Schema.Int.check(
  Schema.isBetween({ maximum: ITEM_LIMIT_MAX, minimum: 1 })
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(ITEM_LIMIT_MAX)));

const GridTrackTextSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(GRID_TRACKS_MAX),
  Schema.isPattern(GRID_TRACKS_PATTERN)
);

const GridLineSchema = Schema.Int.check(
  Schema.isBetween({ maximum: GRID_LINE_MAX, minimum: 1 })
);

const GridTrackFieldSchema = Schema.optionalKey(
  Schema.NullOr(GridTrackTextSchema)
);

const GridLineFieldSchema = Schema.optionalKey(Schema.NullOr(GridLineSchema));

const GridTargetFields = {
  directionId: DirectionIdSchema,
  projectId: ProjectIdSchema,
} as const;

const GridChangeFields = {
  breakpoint: Schema.optionalKey(GridBreakpointSchema),
  columns: GridTrackFieldSchema,
  display: Schema.optionalKey(Schema.Literals(GRID_DISPLAYS)),
  rows: GridTrackFieldSchema,
} as const;

const GridItemChangeFields = {
  breakpoint: Schema.optionalKey(GridBreakpointSchema),
  colSpan: GridLineFieldSchema,
  colStart: GridLineFieldSchema,
  rowSpan: GridLineFieldSchema,
  rowStart: GridLineFieldSchema,
} as const;

const GridDisplayValueSchema = Schema.Struct({
  className: Schema.NullOr(Schema.String),
  isGrid: Schema.Boolean,
  source: GridSourceSchema,
  value: Schema.NullOr(Schema.String),
});

const GridTrackListSchema = Schema.Struct({
  className: Schema.NullOr(Schema.String),
  source: GridSourceSchema,
  text: Schema.NullOr(Schema.String),
  tracks: Schema.Array(Schema.String),
});

const GridGapValueSchema = Schema.Struct({
  className: Schema.NullOr(Schema.String),
  source: GridSourceSchema,
  value: Schema.NullOr(Schema.String),
});

const GridPlacementSchema = Schema.Struct({
  classes: Schema.Array(Schema.String),
  isFull: Schema.Boolean,
  span: Schema.NullOr(Schema.Int),
  start: Schema.NullOr(Schema.Int),
});

const GridPlacementsSchema = Schema.Struct({
  column: GridPlacementSchema,
  row: GridPlacementSchema,
});

const GridItemSourceSchema = Schema.Struct({
  col: Schema.Int,
  file: Schema.String,
  line: Schema.Int,
});

const GridItemSchema = Schema.Struct({
  column: GridPlacementSchema,
  index: Schema.Int,
  row: GridPlacementSchema,
  source: GridItemSourceSchema,
  tag: Schema.String,
});

const GridInfoSchema = Schema.Struct({
  breakpoint: Schema.String,
  columnGap: GridGapValueSchema,
  columns: GridTrackListSchema,
  display: GridDisplayValueSchema,
  file: Schema.String,
  items: Schema.Array(GridItemSchema),
  mode: GridModeSchema,
  placement: GridPlacementsSchema,
  prefix: Schema.String,
  reason: Schema.NullOr(Schema.String),
  rowGap: GridGapValueSchema,
  rows: GridTrackListSchema,
});

const GridClassChangesSchema = Schema.Struct({
  add: Schema.Array(Schema.String),
  remove: Schema.Array(Schema.String),
});

const GridChangeSchema = Schema.Struct({
  breakpoint: Schema.String,
  classes: Schema.NullOr(GridClassChangesSchema),
  files: Schema.Array(Schema.String),
  mode: GridModeSchema,
  prefix: Schema.String,
  style: Schema.Record(Schema.String, Schema.NullOr(Schema.String)),
  title: Schema.String,
  versionId: Schema.NullOr(Schema.String),
});

export {
  GridBreakpointDefaultSchema,
  GridChangeFields,
  GridChangeSchema,
  GridInfoSchema,
  GridItemChangeFields,
  GridItemLimitSchema,
  GridTargetFields,
};

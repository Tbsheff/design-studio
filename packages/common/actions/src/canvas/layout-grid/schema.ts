import {
  LAYOUT_GRID_COLUMNS_MAX,
  LAYOUT_GRID_GUTTER_MAX,
  LAYOUT_GRID_MARGIN_MAX,
  LAYOUT_GRID_ROW_STEP_MAX,
  LAYOUT_GRID_ROW_STEP_MIN,
} from "@design-studio/contracts/layout-grid";
import { Schema } from "effect";

const RowStepRange = Schema.isBetween({
  maximum: LAYOUT_GRID_ROW_STEP_MAX,
  minimum: LAYOUT_GRID_ROW_STEP_MIN,
});

const RowStepSchema = Schema.Int.check(RowStepRange);

const LayoutGridSchema = Schema.Struct({
  columns: Schema.Int.check(
    Schema.isBetween({ maximum: LAYOUT_GRID_COLUMNS_MAX, minimum: 1 })
  ).annotate({ description: "Column count, 1 to 24." }),
  gutter: Schema.Int.check(
    Schema.isBetween({ maximum: LAYOUT_GRID_GUTTER_MAX, minimum: 0 })
  ).annotate({ description: "Space between columns in px, 0 to 200." }),
  margin: Schema.Int.check(
    Schema.isBetween({ maximum: LAYOUT_GRID_MARGIN_MAX, minimum: 0 })
  ).annotate({
    description: "Space at the left and right edge of the frame in px.",
  }),
  rowStep: Schema.NullOr(RowStepSchema).annotate({
    description: "Baseline row step in px, 2 to 64. Null shows no rows.",
  }),
});

const LayoutGridSetSchema = Schema.Struct({
  frameId: Schema.String,
  layoutGrid: Schema.NullOr(LayoutGridSchema),
  note: Schema.String,
});

export { LayoutGridSchema, LayoutGridSetSchema };

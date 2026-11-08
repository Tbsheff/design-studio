import { Effect, Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const CHART_KINDS = ["bar", "line", "area", "pie", "sparkline"] as const;

const CHART_MODES = ["kit", "recharts", "svg"] as const;

const CHART_POSITIONS = ["inside", "before", "after", "replace"] as const;

const SERIES_MAX = 5;

const ROWS_MAX = 60;

const KEY_PATTERN = /^[a-z][A-Za-z0-9]{0,23}$/u;

const LABEL_MAX = 60;

const TITLE_MAX = 80;

const LAYER_MAX = 2000;

const HEIGHT_DEFAULT = 240;

const HEIGHT_MIN = 80;

const HEIGHT_MAX = 1200;

const ChartKindSchema = Schema.Literals(CHART_KINDS);

const ChartModeSchema = Schema.Literals(CHART_MODES);

const ChartPositionSchema = Schema.Literals(CHART_POSITIONS).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed("inside" as const))
);

const ChartDirectionSchema = Schema.NullOr(DirectionIdSchema).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(null))
);

const ChartProjectFields = {
  directionId: ChartDirectionSchema,
  projectId: ProjectIdSchema,
} as const;

const ChartSeriesSchema = Schema.Struct({
  key: Schema.String.check(Schema.isPattern(KEY_PATTERN)),
  label: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(LABEL_MAX)
  ),
});

const ChartRowSchema = Schema.Struct({
  label: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(LABEL_MAX)
  ),
  values: Schema.Array(Schema.Finite).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(SERIES_MAX)
  ),
});

const ChartSeriesListSchema = Schema.Array(ChartSeriesSchema).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(SERIES_MAX)
);

const ChartRowListSchema = Schema.Array(ChartRowSchema).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(ROWS_MAX)
);

const ChartRowsFieldSchema = Schema.NullOr(ChartRowListSchema).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(null))
);

const ChartTitleFieldSchema = Schema.NullOr(
  Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(TITLE_MAX))
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const ChartFlagSchema = Schema.Boolean.pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(false))
);

const ChartLegendSchema = Schema.Boolean.pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(true))
);

const ChartHeightSchema = Schema.Int.check(
  Schema.isBetween({ maximum: HEIGHT_MAX, minimum: HEIGHT_MIN })
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(HEIGHT_DEFAULT)));

const ChartInsertFields = {
  hasLegend: ChartLegendSchema,
  height: ChartHeightSchema,
  isStacked: ChartFlagSchema,
  kind: ChartKindSchema,
  layerId: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(LAYER_MAX)
  ),
  position: ChartPositionSchema,
  rows: ChartRowsFieldSchema,
  series: ChartSeriesListSchema,
  title: ChartTitleFieldSchema,
} as const;

const ChartInspectedSchema = Schema.Struct({
  colorTokens: Schema.Array(Schema.String),
  kinds: Schema.Array(ChartKindSchema),
  kitImportPath: Schema.NullOr(Schema.String),
  mode: ChartModeSchema,
  rechartsVersion: Schema.NullOr(Schema.String),
});

const ChartInsertedSchema = Schema.Struct({
  file: Schema.String,
  layerId: Schema.String,
  mode: ChartModeSchema,
  versionId: Schema.String,
});

export {
  CHART_KINDS,
  CHART_MODES,
  CHART_POSITIONS,
  ChartInsertedSchema,
  ChartInsertFields,
  ChartInspectedSchema,
  ChartProjectFields,
  HEIGHT_DEFAULT,
  HEIGHT_MAX,
  HEIGHT_MIN,
  ROWS_MAX,
  SERIES_MAX,
};

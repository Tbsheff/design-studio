import { Effect, Schema } from "effect";

const ONE_PX = 1;

const TWO_PX = 2;

const FOUR_PX = 4;

const EIGHT_PX = 8;

const DIVIDER_WIDTHS = [ONE_PX, TWO_PX, FOUR_PX, EIGHT_PX] as const;

const DIVIDER_COLOR = /^[a-zA-Z0-9#.,%()\s/-]{1,80}$/u;

const DIVIDER_TOKEN = /^[a-zA-Z0-9._-]{1,80}$/u;

const BASE_VARIANT = Effect.succeed("");

const DEFAULT_WIDTH = Effect.succeed(ONE_PX);

const DividerAxisSchema = Schema.NullOr(Schema.Literals(["x", "y"]));

const DividerWidthSchema = Schema.Literals(DIVIDER_WIDTHS);

const DividerVariantSchema = Schema.String.pipe(
  Schema.withDecodingDefaultKey(BASE_VARIANT)
);

const DividerColorSchema = Schema.String.check(Schema.isPattern(DIVIDER_COLOR));

const DividerTokenSchema = Schema.String.check(Schema.isPattern(DIVIDER_TOKEN));

const DividerWidthInputSchema = DividerWidthSchema.pipe(
  Schema.withDecodingDefaultKey(DEFAULT_WIDTH)
);

const DividerInputSchema = Schema.Struct({
  axis: DividerAxisSchema,
  color: Schema.optionalKey(DividerColorSchema),
  token: Schema.optionalKey(DividerTokenSchema),
  width: DividerWidthInputSchema,
});

const DividerInfoSchema = Schema.Struct({
  axis: DividerAxisSchema,
  classes: Schema.Array(Schema.String),
  color: Schema.NullOr(Schema.String),
  isReverse: Schema.Boolean,
  mode: Schema.Literals(["classes", "css"]),
  token: Schema.NullOr(Schema.String),
  width: Schema.NullOr(Schema.Number),
});

const DividerClassChangesSchema = Schema.Struct({
  add: Schema.Array(Schema.String),
  remove: Schema.Array(Schema.String),
});

const DividerChangeSchema = Schema.Struct({
  axis: DividerAxisSchema,
  classes: DividerClassChangesSchema,
  files: Schema.Array(Schema.String),
  title: Schema.String,
  versionId: Schema.String,
});

export {
  DividerChangeSchema,
  DividerInfoSchema,
  DividerInputSchema,
  DividerVariantSchema,
};

import {
  ICON_COLOR,
  ICON_LIST_DEFAULT,
  ICON_LIST_MAX,
  ICON_NAME,
  ICON_POSITIONS,
  ICON_QUERY_MAX,
  ICON_SIZE_DEFAULT,
  ICON_SIZE_MAX,
  ICON_SIZE_MIN,
  ICON_SOURCES,
  ICON_TARGET_MAX,
} from "@design-studio/contracts/icons";
import { Effect, Schema } from "effect";

import { ElementSourceSchema } from "../_core/element-target.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const OWNER_NAME_MAX = 64;

const OWNERS_MAX = 16;

const TAG_MAX = 100;

const IconTargetFields = {
  directionId: DirectionIdSchema,
  projectId: ProjectIdSchema,
} as const;

const IconLibrarySchema = Schema.Literals(ICON_SOURCES);

const IconQuerySchema = Schema.String.check(
  Schema.isMaxLength(ICON_QUERY_MAX)
).pipe(Schema.withDecodingDefaultKey(Effect.succeed("")));

const IconLimitSchema = Schema.Int.check(
  Schema.isBetween({ maximum: ICON_LIST_MAX, minimum: 1 })
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(ICON_LIST_DEFAULT)));

const IconLibraryFilterSchema = Schema.NullOr(IconLibrarySchema).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(null))
);

const IconInspectFields = {
  library: IconLibraryFilterSchema,
  limit: IconLimitSchema,
  query: IconQuerySchema,
} as const;

const IconNameSchema = Schema.String.check(Schema.isPattern(ICON_NAME));

const IconColorSchema = Schema.String.check(Schema.isPattern(ICON_COLOR));

const IconPositionSchema = Schema.Literals(ICON_POSITIONS).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed("inside" as const))
);

const IconSizeSchema = Schema.Int.check(
  Schema.isBetween({ maximum: ICON_SIZE_MAX, minimum: ICON_SIZE_MIN })
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(ICON_SIZE_DEFAULT)));

const IconOwnerSchema = Schema.Struct({
  name: Schema.String.check(Schema.isMaxLength(OWNER_NAME_MAX)),
  stack: Schema.String.check(Schema.isMaxLength(ICON_TARGET_MAX)),
});

const IconSelectorSchema = Schema.String.check(
  Schema.isMaxLength(ICON_TARGET_MAX)
);

const IconTagSchema = Schema.String.check(Schema.isMaxLength(TAG_MAX));

const IconOwnersSchema = Schema.Array(IconOwnerSchema).check(
  Schema.isMaxLength(OWNERS_MAX)
);

const IconElementSchema = Schema.Struct({
  owners: Schema.optionalKey(IconOwnersSchema),
  selector: Schema.optionalKey(IconSelectorSchema),
  source: Schema.NullOr(ElementSourceSchema),
  tag: Schema.optionalKey(IconTagSchema),
});

const IconInsertFields = {
  color: Schema.optionalKey(Schema.NullOr(IconColorSchema)),
  library: Schema.optionalKey(Schema.NullOr(IconLibrarySchema)),
  name: IconNameSchema,
  position: IconPositionSchema,
  size: IconSizeSchema,
  target: IconElementSchema,
} as const;

const IconSummarySchema = Schema.Struct({
  component: Schema.NullOr(Schema.String),
  library: IconLibrarySchema,
  name: Schema.String,
  svg: Schema.String,
});

const IconListSchema = Schema.Struct({
  icons: Schema.Array(IconSummarySchema),
  importFrom: Schema.NullOr(Schema.String),
  library: IconLibrarySchema,
  total: Schema.Int,
});

const IconSelectionSchema = Schema.Struct({
  col: Schema.Int,
  file: Schema.String,
  line: Schema.Int,
  tag: Schema.String,
});

const IconInsertedSchema = Schema.Struct({
  at: Schema.NullOr(Schema.String),
  file: Schema.String,
  icon: Schema.String,
  importAdded: Schema.Boolean,
  importFrom: Schema.NullOr(Schema.String),
  library: IconLibrarySchema,
  markup: Schema.String,
  select: Schema.Array(IconSelectionSchema),
  swapped: Schema.Boolean,
  title: Schema.String,
  versionId: Schema.String,
});

export {
  IconInsertedSchema,
  IconInsertFields,
  IconInspectFields,
  IconListSchema,
  IconTargetFields,
};

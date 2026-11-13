import {
  ACCESSIBILITY_LABEL_MAX,
  ACCESSIBILITY_LIST_MAX,
  ACCESSIBILITY_ROLES,
  NAME_SOURCES,
  TAB_INDEX_MAX,
  TAB_INDEX_MIN,
} from "@design-studio/contracts/accessibility";
import { Effect, Schema } from "effect";

import { ElementSourceSchema } from "../_core/element-target.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const FRAME_MAX = 60;

const SELECTOR_MAX = 2000;

const TAG_MAX = 100;

const AccessibilityTargetFields = {
  directionId: DirectionIdSchema,
  projectId: ProjectIdSchema,
} as const;

const AccessibilityFrameSchema = Schema.NullOr(
  Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(FRAME_MAX))
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const AccessibilityRootSchema = Schema.NullOr(
  Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(SELECTOR_MAX))
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const AccessibilityPassingSchema = Schema.Boolean.pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(false))
);

const AccessibilityLimitSchema = Schema.Int.check(
  Schema.isBetween({ maximum: ACCESSIBILITY_LIST_MAX, minimum: 1 })
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(ACCESSIBILITY_LIST_MAX)));

const AccessibilityInspectFields = {
  frame: AccessibilityFrameSchema,
  includePassing: AccessibilityPassingSchema,
  limit: AccessibilityLimitSchema,
  selector: AccessibilityRootSchema,
} as const;

const AccessibilityTextSchema = Schema.String.check(
  Schema.isMaxLength(ACCESSIBILITY_LABEL_MAX)
);

const AccessibilityLabelSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(ACCESSIBILITY_LABEL_MAX)
);

const AccessibilityRoleSchema = Schema.Literals(ACCESSIBILITY_ROLES);

const AccessibilityTabIndexSchema = Schema.Int.check(
  Schema.isBetween({ maximum: TAB_INDEX_MAX, minimum: TAB_INDEX_MIN })
);

const AccessibilitySetFields = {
  alt: Schema.optionalKey(Schema.NullOr(AccessibilityTextSchema)),
  ariaLabel: Schema.optionalKey(Schema.NullOr(AccessibilityLabelSchema)),
  role: Schema.optionalKey(Schema.NullOr(AccessibilityRoleSchema)),
  tabIndex: Schema.optionalKey(Schema.NullOr(AccessibilityTabIndexSchema)),
} as const;

const AccessibilitySelectorSchema = Schema.String.check(
  Schema.isMaxLength(SELECTOR_MAX)
);

const AccessibilityTagSchema = Schema.String.check(Schema.isMaxLength(TAG_MAX));

const AccessibilityElementSchema = Schema.Struct({
  selector: Schema.optionalKey(Schema.NullOr(AccessibilitySelectorSchema)),
  source: ElementSourceSchema,
  tag: Schema.optionalKey(Schema.NullOr(AccessibilityTagSchema)),
  usedAt: Schema.optionalKey(Schema.NullOr(ElementSourceSchema)),
});

const SourceLocationSchema = Schema.Struct({
  col: Schema.Int,
  file: Schema.String,
  line: Schema.Int,
});

const NameSourceSchema = Schema.Literals(NAME_SOURCES);

const AccessibleNodeSchema = Schema.Struct({
  name: Schema.String,
  nameFrom: NameSourceSchema,
  role: Schema.String,
  selector: Schema.String,
  source: Schema.NullOr(SourceLocationSchema),
  tag: Schema.String,
});

const TabStopSchema = Schema.Struct({
  name: Schema.String,
  nameFrom: NameSourceSchema,
  order: Schema.Int,
  role: Schema.String,
  selector: Schema.String,
  source: Schema.NullOr(SourceLocationSchema),
  tabIndex: Schema.Int,
  tag: Schema.String,
});

const MissingAltSchema = Schema.Struct({
  selector: Schema.String,
  source: Schema.NullOr(SourceLocationSchema),
  src: Schema.String,
  tag: Schema.String,
});

const ContrastFixMatchSchema = Schema.Struct({
  property: Schema.Literal("color"),
  selector: Schema.String,
  source: SourceLocationSchema,
  tag: Schema.String,
});

const ContrastFixSchema = Schema.Struct({
  frame: Schema.String,
  matches: Schema.Array(ContrastFixMatchSchema),
  token: Schema.String,
  tool: Schema.Literal("replace_style"),
});

const PassingTokenSchema = Schema.Struct({
  cssVar: Schema.String,
  hex: Schema.String,
  ratio: Schema.Number,
});

const ContrastPairSchema = Schema.Struct({
  background: Schema.String,
  fix: Schema.NullOr(ContrastFixSchema),
  foreground: Schema.String,
  large: Schema.Boolean,
  need: Schema.Number,
  passes: Schema.Boolean,
  ratio: Schema.Number,
  selector: Schema.String,
  source: Schema.NullOr(SourceLocationSchema),
  tag: Schema.String,
  text: Schema.String,
  token: Schema.NullOr(PassingTokenSchema),
});

const AccessibilityReportSchema = Schema.Struct({
  contrast: Schema.Array(ContrastPairSchema),
  frame: Schema.String,
  lowContrast: Schema.Int,
  missingAlt: Schema.Array(MissingAltSchema),
  page: Schema.String,
  root: Schema.NullOr(AccessibleNodeSchema),
  tabOrder: Schema.Array(TabStopSchema),
  truncated: Schema.Boolean,
  unnamed: Schema.Array(AccessibleNodeSchema),
});

const AccessibilityChangeSchema = Schema.Struct({
  attributes: Schema.Record(Schema.String, Schema.NullOr(Schema.String)),
  file: Schema.String,
  site: Schema.Literals(["element", "use"]),
  source: SourceLocationSchema,
  title: Schema.String,
  versionId: Schema.NullOr(Schema.String),
});

const VISION_KINDS = [
  "protanopia",
  "deuteranopia",
  "tritanopia",
  "achromatopsia",
  "blurred-vision",
  "reduced-contrast",
] as const;

const VISION_LIST_MAX = 100;

const VisionKindSchema = Schema.Literals(VISION_KINDS);

const VisionKindsSchema = Schema.Array(VisionKindSchema).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(VISION_KINDS.length)
);

const VisionFrameIdSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(FRAME_MAX)
);

const VisionDirectionSchema = Schema.NullOr(DirectionIdSchema).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(null))
);

const VisionLayerSchema = Schema.NullOr(
  Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(SELECTOR_MAX))
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const VisionKindsFieldSchema = VisionKindsSchema.pipe(
  Schema.withDecodingDefaultKey(Effect.succeed([...VISION_KINDS]))
);

const VisionFields = {
  directionId: VisionDirectionSchema,
  frameId: VisionFrameIdSchema,
  kinds: VisionKindsFieldSchema,
  layer: VisionLayerSchema,
  projectId: ProjectIdSchema,
} as const;

const VisionLostPairSchema = Schema.Struct({
  after: Schema.Number,
  afterForeground: Schema.String,
  background: Schema.String,
  before: Schema.Number,
  foreground: Schema.String,
  layerId: Schema.String,
  nearestToken: Schema.NullOr(PassingTokenSchema),
  need: Schema.Number,
  text: Schema.String,
});

const VisionCellSchema = Schema.Struct({
  kind: VisionKindSchema,
  lostPairs: Schema.Array(VisionLostPairSchema),
  shotPath: Schema.String,
});

const VisionColorSchema = Schema.Struct({
  color: Schema.String,
  label: Schema.String,
  layerId: Schema.String,
});

const VisionConfusedPairSchema = Schema.Struct({
  after: Schema.Number,
  before: Schema.Number,
  first: VisionColorSchema,
  kind: VisionKindSchema,
  second: VisionColorSchema,
});

const VisionReportSchema = Schema.Struct({
  cells: Schema.Array(VisionCellSchema),
  confusedPairs: Schema.Array(VisionConfusedPairSchema),
  frameId: Schema.String,
  sheetPath: Schema.String,
});

const ReaderLineStatesSchema = Schema.Struct({
  isChecked: Schema.NullOr(Schema.Boolean),
  isDisabled: Schema.Boolean,
  isExpanded: Schema.NullOr(Schema.Boolean),
  level: Schema.NullOr(Schema.Int),
});

const ReaderLineSchema = Schema.Struct({
  depth: Schema.Int,
  isNameMissing: Schema.Boolean,
  layerId: Schema.NullOr(Schema.String),
  name: Schema.String,
  role: Schema.String,
  selector: Schema.String,
  states: ReaderLineStatesSchema,
});

const ReaderLineFields = {
  frame: AccessibilityFrameSchema,
} as const;

const ReaderLinesTotalsFields = {
  frame: Schema.String,
  total: Schema.Int,
} as const;

export {
  ReaderLineFields,
  ReaderLineSchema,
  ReaderLinesTotalsFields,
  VISION_KINDS,
  VISION_LIST_MAX,
  VisionFields,
  VisionReportSchema,
  AccessibilityChangeSchema,
  AccessibilityElementSchema,
  AccessibilityInspectFields,
  AccessibilityReportSchema,
  AccessibilitySetFields,
  AccessibilityTargetFields,
};

import { SourceUseFields } from "@design-studio/actions/direct-edit/schema";
import { DESIGN_RULES_TEXT_MAX } from "@design-studio/contracts/design-rules";
import { FIGMA_NODES_MAX_BYTES } from "@design-studio/contracts/figma-nodes";
import {
  OWNERS_MAX,
  OWNER_STACK_MAX,
  PROPS_MAX,
  PROP_NAME,
  PROP_TEXT_MAX,
} from "@design-studio/contracts/props";
import { REVIEW_FIX_MAX } from "@design-studio/contracts/review";
import { Effect, Schema } from "effect";

const SIDE_MIN = 200;

const SIDE_MAX = 4000;

const FRAME_TEXT_MAX = 60;

const PATH_TEXT_MAX = 300;

const SELECTOR_TEXT_MAX = 2000;

const OWNER_NAME_MAX = 64;

const TAG_TEXT_MAX = 100;

const NODE_ID_MAX = 200;

const FINDING_ID_MAX = 80;

const SHORT_TEXT_MAX = 64;

const STYLE_VALUE_MAX = 200;

const CLASS_NAME_MAX = 100;

const CLASS_LIST_MAX = 30;

const QUERY_TEXT_MAX = 100;

const COMPONENT_FILE_MAX = 1000;

const SourceLocationSchema = Schema.Struct(SourceUseFields);

const SideSchema = Schema.Int.check(
  Schema.isBetween({ maximum: SIDE_MAX, minimum: SIDE_MIN })
);

const OwnerSchema = Schema.Struct({
  name: Schema.String.check(Schema.isMaxLength(OWNER_NAME_MAX)),
  stack: Schema.String.check(Schema.isMaxLength(OWNER_STACK_MAX)),
});

const OwnersSchema = Schema.Array(OwnerSchema).check(
  Schema.isMaxLength(OWNERS_MAX)
);

const FrameTextSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(FRAME_TEXT_MAX)
);

const PathTextSchema = Schema.String.check(Schema.isMaxLength(PATH_TEXT_MAX));

const SelectorTextSchema = Schema.String.check(
  Schema.isMaxLength(SELECTOR_TEXT_MAX)
);

const ReviewSelectorSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(SELECTOR_TEXT_MAX)
);

const FindingIdSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(FINDING_ID_MAX)
);

const ClassNameSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(CLASS_NAME_MAX)
);

const StyleValueSchema = Schema.NullOr(
  Schema.String.check(Schema.isMaxLength(STYLE_VALUE_MAX))
);

const TagTextSchema = Schema.String.check(Schema.isMaxLength(TAG_TEXT_MAX));

const NodeIdSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(NODE_ID_MAX)
);

const NodesTextSchema = Schema.String.check(
  Schema.isMinLength(2),
  Schema.isMaxLength(FIGMA_NODES_MAX_BYTES)
);

const ReviewFrameFields = {
  frame: Schema.optionalKey(FrameTextSchema),
  height: Schema.optionalKey(SideSchema),
  path: Schema.optionalKey(PathTextSchema),
  width: Schema.optionalKey(SideSchema),
} as const;

const RulesTextSchema = Schema.String.check(
  Schema.isMaxLength(DESIGN_RULES_TEXT_MAX)
);

const RulesSaveFields = { text: RulesTextSchema } as const;

const RulesTestFields = {
  ...ReviewFrameFields,
  text: Schema.optionalKey(RulesTextSchema),
} as const;

const ReviewRunFields = {
  ...ReviewFrameFields,
  selector: Schema.optionalKey(ReviewSelectorSchema),
} as const;

const ReviewFixFields = {
  allowShared: Schema.optionalKey(Schema.Boolean),
  findingIds: Schema.Array(FindingIdSchema).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(REVIEW_FIX_MAX)
  ),
} as const;

const SourceLocationTextSchema = Schema.fromJsonString(
  Schema.NullOr(SourceLocationSchema)
);

const PropsInstanceFields = {
  owners: Schema.optionalKey(Schema.fromJsonString(OwnersSchema)),
  use: Schema.optionalKey(SourceLocationTextSchema),
  usedAt: Schema.optionalKey(SourceLocationTextSchema),
} as const;

const PropsComponentQueryFields = {
  query: Schema.String.check(Schema.isMaxLength(QUERY_TEXT_MAX))
    .annotate({
      description:
        'Search text: matches the component name first (exact, then prefix, then part), then its folder or file, then the props, variants and other text of its file. For example "badge" or "card".',
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(""))),
  source: Schema.Literals(["package", "app", "all"])
    .annotate({
      description:
        '"package" for components of shared workspace packages (such as packages/ui), "app" for components in the app, "all" (default) for both. Package components always come first.',
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed("all" as const))),
} as const;

const PropTextSchema = Schema.String.check(Schema.isMaxLength(PROP_TEXT_MAX));

const PropValueSchema = Schema.NullOr(
  Schema.Union([PropTextSchema, Schema.Number, Schema.Boolean])
);

const SetPropsFields = {
  props: Schema.Record(
    Schema.String.check(Schema.isPattern(PROP_NAME)),
    PropValueSchema
  ).check(Schema.isMinProperties(1), Schema.isMaxProperties(PROPS_MAX)),
  source: SourceLocationSchema,
} as const;

const ComponentNameSchema = Schema.String.check(
  Schema.isPattern(/^[A-Z][A-Za-z0-9_$]{0,63}$/u)
);

const ComponentFileSchema = Schema.String.check(
  Schema.isMaxLength(COMPONENT_FILE_MAX)
);

const ComponentPreviewFields = {
  file: Schema.optionalKey(
    ComponentFileSchema.annotate({
      description:
        "File of the component, relative to the project, when two components have the same name.",
    })
  ),
  id: Schema.optionalKey(
    ComponentFileSchema.annotate({
      description:
        'Or the component id as the studio Components panel lists it: "<file>#<Name>".',
    })
  ),
  name: Schema.optionalKey(
    ComponentNameSchema.annotate({
      description: 'Component name from list_components, for example "Button".',
    })
  ),
} as const;

const ClassNamesSchema = Schema.Array(ClassNameSchema).check(
  Schema.isMaxLength(CLASS_LIST_MAX)
);

const ShortTextSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(SHORT_TEXT_MAX)
);

const VariantClassFields = {
  classes: Schema.optionalKey(
    Schema.Struct({
      add: Schema.optionalKey(ClassNamesSchema),
      remove: Schema.optionalKey(ClassNamesSchema),
    })
  ),
  cva: Schema.String.check(Schema.isPattern(PROP_NAME)),
  file: SourceUseFields.file,
  prop: ShortTextSchema,
  style: Schema.optionalKey(Schema.Record(Schema.String, StyleValueSchema)),
  value: ShortTextSchema,
} as const;

const FigmaTargetSchema = Schema.Struct({
  owners: Schema.optionalKey(OwnersSchema),
  selector: Schema.optionalKey(SelectorTextSchema),
  source: Schema.NullOr(SourceLocationSchema),
  tag: Schema.optionalKey(TagTextSchema),
});

const FigmaImportFields = {
  dryRun: Schema.optionalKey(Schema.Boolean),
  link: Schema.optionalKey(SelectorTextSchema),
  nodeId: Schema.optionalKey(NodeIdSchema),
  nodes: Schema.optionalKey(NodesTextSchema),
  position: Schema.Literals(["inside", "before", "after", "replace"]).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed("inside" as const))
  ),
  target: FigmaTargetSchema,
} as const;

export {
  ComponentPreviewFields,
  FigmaImportFields,
  PropsComponentQueryFields,
  PropsInstanceFields,
  ReviewFixFields,
  ReviewRunFields,
  RulesSaveFields,
  RulesTestFields,
  SetPropsFields,
  VariantClassFields,
};

import { SourceUseFields } from "@design-studio/actions/direct-edit/schema";
import {
  CANVAS_MAX_HEIGHT,
  CANVAS_MAX_SIDE,
} from "@design-studio/contracts/canvas-file";
import { DESIGN_RULES_TEXT_MAX } from "@design-studio/contracts/design-rules";
import { FIGMA_NODES_MAX_BYTES } from "@design-studio/contracts/figma-nodes";
import { INSERT_TEXT_MAX } from "@design-studio/contracts/insert";
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

const CREATE_TARGETS_MAX = 24;

const FOLDER_TEXT_MAX = 500;

const SourceLocationSchema = Schema.Struct(SourceUseFields);

const SideSchema = Schema.Int.check(
  Schema.isBetween({ maximum: CANVAS_MAX_SIDE, minimum: SIDE_MIN })
);

const HeightSchema = Schema.Int.check(
  Schema.isBetween({ maximum: CANVAS_MAX_HEIGHT, minimum: SIDE_MIN })
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
  height: Schema.optionalKey(HeightSchema),
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
  frame: Schema.optionalKey(
    FrameTextSchema.annotate({
      description:
        "Frame id or @label from canvas_list. Leave out for the frame the user has live, or the first frame.",
    })
  ),
  path: Schema.optionalKey(
    PathTextSchema.annotate({
      description:
        'Page path in the project, for example "about.html". Leave out for the entry page.',
    })
  ),
  selector: Schema.optionalKey(
    ReviewSelectorSchema.annotate({
      description:
        'CSS selector of one element, for example [data-slot="card"]. Only findings inside its subtree are returned. A layer id from get_layers works too.',
    })
  ),
  viewport: Schema.optionalKey(
    Schema.Literals(["desktop", "tablet", "mobile"]).annotate({
      description: "Render size instead of the frame size.",
    })
  ),
} as const;

const ReviewFixFields = {
  allowShared: Schema.optionalKey(
    Schema.Boolean.annotate({
      description:
        "Apply fixes whose finding has shared set: they edit a file outside the page's own route folder (a shared component), so the change reaches every page that uses it. Without it those fixes are skipped.",
    })
  ),
  findingId: Schema.optionalKey(
    FindingIdSchema.annotate({
      description: "id of one finding from review_frame.",
    })
  ),
  findingIds: Schema.optionalKey(
    Schema.Array(FindingIdSchema)
      .check(Schema.isMinLength(1), Schema.isMaxLength(REVIEW_FIX_MAX))
      .annotate({
        description: "Or several finding ids, applied as one version.",
      })
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
  )
    .check(Schema.isMinProperties(1), Schema.isMaxProperties(PROPS_MAX))
    .annotate({
      description:
        "Props to set: a string, number or boolean. null removes the prop. A value equal to the default removes the attribute. Variant props take one of the cva option names from list_components.",
    }),
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

const JsxTargetSchema = Schema.Struct({
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
  target: JsxTargetSchema,
} as const;

const InsertPropsSchema = Schema.Record(
  Schema.String.check(Schema.isPattern(PROP_NAME)),
  Schema.Union([PropTextSchema, Schema.Number, Schema.Boolean])
)
  .check(Schema.isMaxProperties(PROPS_MAX))
  .annotate({
    description:
      'Props to set, for example {"variant": "outline"}. Required props that you leave out get a default from the props type.',
  });

const InsertedComponentSchema = Schema.Struct({
  file: Schema.optionalKey(
    ComponentFileSchema.annotate({
      description:
        "File of the component, relative to the project, when two components have the same name.",
    })
  ),
  name: ComponentNameSchema.annotate({
    description:
      'Component name, for example "Button". The studio finds it in the project component library (exported React components in src, or in the app and its workspace packages such as @workspace/ui).',
  }),
});

const InsertComponentFields = {
  component: Schema.optionalKey(InsertedComponentSchema),
  position: Schema.Literals(["inside", "after"])
    .annotate({
      description:
        "inside adds the component as the last child of the target; after adds it as the next sibling.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed("inside" as const))),
  props: Schema.optionalKey(InsertPropsSchema),
  target: Schema.optionalKey(JsxTargetSchema),
  text: Schema.optionalKey(
    Schema.String.check(Schema.isMaxLength(INSERT_TEXT_MAX)).annotate({
      description:
        'Child text, for example "Save". Default: the component name, and that text stays when you later insert children into it, so pass "" for a container such as Card. To build a group (a Card with a header, rows and buttons) use insert_jsx instead: one call, one undo step.',
    })
  ),
} as const;

const CreateComponentFields = {
  folder: Schema.optionalKey(
    Schema.String.check(
      Schema.isMinLength(1),
      Schema.isMaxLength(FOLDER_TEXT_MAX)
    ).annotate({
      description:
        'Folder for the new file, relative to the project, for example "packages/ui/src/components" or "src/components". Leave out for the app components folder.',
    })
  ),
  name: Schema.String.check(
    Schema.isPattern(/^[A-Z][A-Za-z0-9]{0,63}$/u)
  ).annotate({
    description:
      'PascalCase component name, for example "StatRow". The file name follows the folder (stat-row.tsx in a kit of kebab-case files, StatRow.tsx in a folder of PascalCase files).',
  }),
  targets: Schema.Array(JsxTargetSchema).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(CREATE_TARGETS_MAX)
  ),
} as const;

export {
  ComponentPreviewFields,
  CreateComponentFields,
  InsertComponentFields,
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

import { Schema } from "effect";

const DirectEditCodeSchema = Schema.Literals([
  "attribute_not_literal",
  "cannot_move",
  "cannot_restructure",
  "classes_not_editable",
  "element_not_found",
  "history_empty",
  "history_stale",
  "invalid_request",
  "invalid_source",
  "invalid_token",
  "invalid_tweak_value",
  "no_base_version",
  "no_change",
  "no_design_system",
  "no_tweaks",
  "not_host_element",
  "parse_failed",
  "run_in_progress",
  "source_not_found",
  "stale_selection",
  "style_not_literal",
  "text_from_data",
  "text_not_editable",
  "token_exists",
  "tokens_invalid",
  "tweak_not_declared",
  "unknown_token",
  "unknown_tweak",
  "variant_not_supported",
]);

const TWEAK_ID_MAX = 64;

const TWEAK_TEXT_MAX = 200;

const TweakIdSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(TWEAK_ID_MAX)
).annotate({ description: "Tweak control id from list_tweaks." });

const TweakValueSchema = Schema.Union([
  Schema.Finite,
  Schema.String.check(Schema.isMaxLength(TWEAK_TEXT_MAX)),
  Schema.Boolean,
]).annotate({
  description:
    "New value: a number inside min and max for a range, a CSS color for a color, true or false for a toggle, one option value for a select.",
});

const TweakSetFields = {
  id: TweakIdSchema,
  value: TweakValueSchema,
} as const;

const TweakSetResultSchema = Schema.Struct({
  cssVar: Schema.NullOr(Schema.String),
  id: Schema.String,
  title: Schema.String,
  value: TweakValueSchema,
  versionId: Schema.String,
});

type DirectEditCode = typeof DirectEditCodeSchema.Type;

const CONFLICT_CODES: readonly DirectEditCode[] = [
  "history_stale",
  "run_in_progress",
  "token_exists",
];

const NOT_FOUND_CODES: readonly DirectEditCode[] = [
  "no_design_system",
  "no_tweaks",
];

const OptionalUnknownSchema = Schema.optionalKey(Schema.Unknown);

const DesignSystemStateSchema = Schema.Struct({
  css: Schema.NullOr(Schema.String),
  entries: Schema.Array(Schema.Unknown),
  errors: Schema.Array(Schema.String),
  manifest: Schema.Unknown,
  packId: Schema.NullOr(Schema.String),
  source: OptionalUnknownSchema,
  tokens: Schema.Unknown,
});

const TokenPreviewSchema = Schema.Struct({
  css: Schema.String,
  errors: Schema.Array(Schema.String),
});

const TokenChangeSchema = Schema.Struct({
  darkValue: Schema.optionalKey(Schema.NullOr(Schema.String)),
  path: Schema.String,
  value: Schema.optionalKey(Schema.String),
});

const TokenChangesQueryFields = {
  changes: Schema.fromJsonString(Schema.Array(TokenChangeSchema)),
} as const;

const FILE_TEXT_MAX = 1000;

const SourceUseFields = {
  col: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  file: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(FILE_TEXT_MAX)
  ),
  line: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
} as const;

const TokenChangesFields = {
  changes: Schema.Unknown,
} as const;

const TweakValuesFields = {
  values: Schema.Unknown,
} as const;

const CreateTokenFields = {
  apply: OptionalUnknownSchema,
  darkValue: OptionalUnknownSchema,
  description: OptionalUnknownSchema,
  group: Schema.Unknown,
  name: Schema.Unknown,
  value: Schema.Unknown,
} as const;

const CreateTokenResultSchema = Schema.Struct({
  cssVar: Schema.String,
  edit: Schema.NullOr(Schema.Unknown),
  state: DesignSystemStateSchema,
  version: Schema.Unknown,
});

const UpdateTokensResultSchema = Schema.Struct({
  state: DesignSystemStateSchema,
  version: Schema.Unknown,
});

const TweaksStateSchema = Schema.Struct({
  controls: Schema.Array(Schema.Unknown),
  current: Schema.Record(Schema.String, Schema.Unknown),
  error: Schema.NullOr(Schema.String),
  problems: Schema.Array(Schema.String),
  tokenPaths: Schema.Record(Schema.String, Schema.String),
});

const CommitTweaksResultSchema = Schema.Struct({
  state: TweaksStateSchema,
  version: Schema.Unknown,
});

const DirectEditFields = {
  after: OptionalUnknownSchema,
  arrange: OptionalUnknownSchema,
  before: OptionalUnknownSchema,
  classes: OptionalUnknownSchema,
  component: OptionalUnknownSchema,
  edits: OptionalUnknownSchema,
  hints: OptionalUnknownSchema,
  insert: OptionalUnknownSchema,
  into: OptionalUnknownSchema,
  move: OptionalUnknownSchema,
  name: OptionalUnknownSchema,
  op: OptionalUnknownSchema,
  replaceStyle: OptionalUnknownSchema,
  selector: OptionalUnknownSchema,
  source: OptionalUnknownSchema,
  style: OptionalUnknownSchema,
  tag: OptionalUnknownSchema,
  targets: OptionalUnknownSchema,
  text: OptionalUnknownSchema,
  variant: OptionalUnknownSchema,
} as const;

const DirectEditResultSchema = Schema.Struct({
  applied: OptionalUnknownSchema,
  changed: OptionalUnknownSchema,
  classes: OptionalUnknownSchema,
  file: OptionalUnknownSchema,
  files: OptionalUnknownSchema,
  mode: OptionalUnknownSchema,
  moved: OptionalUnknownSchema,
  note: OptionalUnknownSchema,
  replaced: OptionalUnknownSchema,
  select: OptionalUnknownSchema,
  sites: OptionalUnknownSchema,
  skipped: OptionalUnknownSchema,
  tailwind: OptionalUnknownSchema,
  textSource: OptionalUnknownSchema,
  value: OptionalUnknownSchema,
  version: OptionalUnknownSchema,
  writes: OptionalUnknownSchema,
  wrote: OptionalUnknownSchema,
});

const PreviewUrlSchema = Schema.Struct({ url: Schema.String });

const WorkTreeSchema = Schema.Struct({ files: Schema.Array(Schema.String) });

const RenderCheckListSchema = Schema.Struct({
  results: Schema.Array(Schema.Unknown),
});

type DirectEditResult = typeof DirectEditResultSchema.Type;

const InsertableComponentSchema = Schema.Struct({
  children: Schema.Boolean,
  file: Schema.String,
  folder: Schema.String,
  id: Schema.String,
  line: Schema.Number,
  name: Schema.String,
  uses: Schema.Number,
});

const InsertJsxImportSchema = Schema.Struct({
  added: Schema.Boolean,
  name: Schema.String,
  specifier: Schema.String,
});

const ComponentFolderSchema = Schema.Struct({
  folder: Schema.String,
  kebab: Schema.Boolean,
  kind: Schema.Literals(["kit", "app"]),
  label: Schema.String,
});

const SwapCandidateSchema = Schema.Struct({
  add: Schema.Array(Schema.String),
  drop: Schema.Array(Schema.String),
  file: Schema.String,
  keep: Schema.Array(Schema.String),
  name: Schema.String,
});

const CreatedPropSchema = Schema.Struct({
  name: Schema.String,
  optional: Schema.Boolean,
  type: Schema.String,
});

const ListInsertableSchema = Schema.Struct({
  components: Schema.Array(InsertableComponentSchema),
  note: Schema.NullOr(Schema.String),
  truncated: Schema.Boolean,
});

const InsertResultSchema = Schema.Struct({
  asset: OptionalUnknownSchema,
  changed: OptionalUnknownSchema,
  file: OptionalUnknownSchema,
  importAdded: OptionalUnknownSchema,
  importFrom: OptionalUnknownSchema,
  imports: Schema.optionalKey(Schema.Array(InsertJsxImportSchema)),
  jsx: OptionalUnknownSchema,
  mode: OptionalUnknownSchema,
  select: OptionalUnknownSchema,
  src: OptionalUnknownSchema,
  title: OptionalUnknownSchema,
  usedAt: OptionalUnknownSchema,
  version: OptionalUnknownSchema,
});

const ComponentListSchema = Schema.Struct({
  components: Schema.Array(Schema.Unknown),
});

const ComponentFolderListSchema = Schema.Struct({
  folders: Schema.Array(ComponentFolderSchema),
  note: Schema.NullOr(Schema.String),
});

const SwapCandidateListSchema = Schema.Struct({
  candidates: Schema.Array(SwapCandidateSchema),
  from: Schema.String,
  note: Schema.NullOr(Schema.String),
});

const CreateComponentResultSchema = Schema.Struct({
  file: Schema.String,
  files: Schema.Array(Schema.String),
  importFrom: Schema.Array(Schema.String),
  name: Schema.String,
  props: Schema.Array(CreatedPropSchema),
  select: Schema.Array(Schema.Unknown),
  title: Schema.String,
  variants: Schema.Array(Schema.String),
  version: Schema.Unknown,
});

const SwapResultSchema = Schema.Struct({
  added: Schema.Array(Schema.String),
  dropped: Schema.Array(Schema.String),
  file: Schema.String,
  importFrom: Schema.String,
  select: Schema.Array(Schema.Unknown),
  title: Schema.String,
  version: Schema.Unknown,
});

const ComponentPreviewSchema = Schema.Struct({
  cached: Schema.Boolean,
  component: Schema.Unknown,
  hash: Schema.String,
  png: Schema.String,
  props: Schema.Unknown,
  text: Schema.NullOr(Schema.String),
});

const PropsComponentSchema = Schema.Struct({
  asChild: Schema.Boolean,
  cva: Schema.NullOr(Schema.Unknown),
  example: Schema.String,
  file: Schema.String,
  folder: Schema.String,
  import: Schema.String,
  line: Schema.Number,
  name: Schema.String,
  note: Schema.NullOr(Schema.String),
  parts: Schema.Array(Schema.String),
  props: Schema.Array(Schema.Unknown),
  source: Schema.String,
  uses: Schema.Number,
});

const PropsInstanceSchema = Schema.Struct({
  instance: Schema.NullOr(Schema.Unknown),
});

const SetPropsResultSchema = Schema.Struct({
  changed: Schema.Array(Schema.String),
  file: Schema.String,
  instance: Schema.NullOr(Schema.Unknown),
  removed: Schema.Array(Schema.String),
  version: Schema.NullOr(Schema.Unknown),
});

const VariantClassResultSchema = Schema.Struct({
  classes: Schema.Array(Schema.String),
  file: Schema.String,
  note: Schema.NullOr(Schema.String),
  version: Schema.NullOr(Schema.Unknown),
});

const RulesStateSchema = Schema.Struct({
  editable: Schema.Boolean,
  file: Schema.NullOr(Schema.String),
  importFrom: Schema.Array(Schema.String),
  imported: Schema.NullOr(Schema.String),
  origin: Schema.String,
  rules: Schema.Array(Schema.Unknown),
  text: Schema.String,
});

const SaveRulesResultSchema = Schema.Struct({
  state: RulesStateSchema,
  version: Schema.NullOr(Schema.Unknown),
  versionId: Schema.NullOr(Schema.String),
});

const RulesTestResultSchema = Schema.Struct({
  frame: Schema.Unknown,
  hits: Schema.Array(Schema.Unknown),
  notes: Schema.Array(Schema.String),
  rules: Schema.Array(Schema.Unknown),
});

const LastReviewSchema = Schema.Struct({
  review: Schema.NullOr(Schema.Unknown),
});

const ReviewResultSchema = Schema.Struct({
  counts: Schema.Unknown,
  directionId: Schema.String,
  findings: Schema.Array(Schema.Unknown),
  frame: Schema.Unknown,
  matched: OptionalUnknownSchema,
  notes: Schema.Array(Schema.String),
  projectId: Schema.String,
  ranAt: Schema.Number,
  versionId: Schema.NullOr(Schema.String),
});

const ReviewFixResultSchema = Schema.Struct({
  applied: Schema.Array(Schema.String),
  files: Schema.Array(Schema.String),
  shared: Schema.optionalKey(Schema.Array(Schema.String)),
  skipped: Schema.Array(Schema.Unknown),
  version: Schema.NullOr(Schema.Unknown),
});

const FigmaImportOutputSchema = Schema.Struct({
  file: OptionalUnknownSchema,
  fileName: OptionalUnknownSchema,
  frame: OptionalUnknownSchema,
  frames: OptionalUnknownSchema,
  imports: OptionalUnknownSchema,
  markup: OptionalUnknownSchema,
  select: OptionalUnknownSchema,
  stats: OptionalUnknownSchema,
  title: OptionalUnknownSchema,
  usedAt: OptionalUnknownSchema,
  version: OptionalUnknownSchema,
});

export {
  CONFLICT_CODES,
  CommitTweaksResultSchema,
  ComponentFolderListSchema,
  ComponentListSchema,
  ComponentPreviewSchema,
  CreateComponentResultSchema,
  CreateTokenFields,
  CreateTokenResultSchema,
  DesignSystemStateSchema,
  DirectEditCodeSchema,
  DirectEditFields,
  DirectEditResultSchema,
  InsertResultSchema,
  FigmaImportOutputSchema,
  LastReviewSchema,
  PropsComponentSchema,
  PropsInstanceSchema,
  ReviewFixResultSchema,
  ReviewResultSchema,
  RulesStateSchema,
  RulesTestResultSchema,
  SaveRulesResultSchema,
  SetPropsResultSchema,
  VariantClassResultSchema,
  ListInsertableSchema,
  NOT_FOUND_CODES,
  PreviewUrlSchema,
  RenderCheckListSchema,
  SourceUseFields,
  SwapCandidateListSchema,
  SwapResultSchema,
  TokenChangesFields,
  TweakSetFields,
  TweakSetResultSchema,
  TweakValuesFields,
  TokenChangesQueryFields,
  TokenPreviewSchema,
  TweaksStateSchema,
  UpdateTokensResultSchema,
  WorkTreeSchema,
};

export type { DirectEditCode, DirectEditResult };

import { Schema } from "effect";

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

const TokenChangesFields = {
  changes: Schema.Unknown,
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

const ListInsertableSchema = Schema.Struct({
  components: Schema.Array(Schema.Unknown),
  note: Schema.NullOr(Schema.String),
  truncated: Schema.Boolean,
});

const InsertResultSchema = Schema.Struct({
  asset: OptionalUnknownSchema,
  changed: OptionalUnknownSchema,
  file: OptionalUnknownSchema,
  importAdded: OptionalUnknownSchema,
  importFrom: OptionalUnknownSchema,
  imports: OptionalUnknownSchema,
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
  folders: Schema.Array(Schema.Unknown),
  note: Schema.NullOr(Schema.String),
});

const SwapCandidateListSchema = Schema.Struct({
  candidates: Schema.Array(Schema.Unknown),
  from: Schema.String,
  note: Schema.NullOr(Schema.String),
});

const CreateComponentResultSchema = Schema.Struct({
  file: Schema.String,
  files: Schema.Array(Schema.String),
  importFrom: Schema.Array(Schema.String),
  name: Schema.String,
  props: Schema.Array(Schema.Unknown),
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

export {
  CommitTweaksResultSchema,
  ComponentFolderListSchema,
  ComponentListSchema,
  ComponentPreviewSchema,
  CreateComponentResultSchema,
  CreateTokenFields,
  CreateTokenResultSchema,
  DesignSystemStateSchema,
  DirectEditFields,
  DirectEditResultSchema,
  InsertResultSchema,
  ListInsertableSchema,
  PreviewUrlSchema,
  RenderCheckListSchema,
  SwapCandidateListSchema,
  SwapResultSchema,
  TokenChangesFields,
  TokenPreviewSchema,
  TweaksStateSchema,
  UpdateTokensResultSchema,
  WorkTreeSchema,
};

export type { DirectEditResult };

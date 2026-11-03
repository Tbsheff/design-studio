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

export {
  CommitTweaksResultSchema,
  CreateTokenFields,
  CreateTokenResultSchema,
  DesignSystemStateSchema,
  DirectEditFields,
  DirectEditResultSchema,
  PreviewUrlSchema,
  RenderCheckListSchema,
  TokenChangesFields,
  TokenPreviewSchema,
  TweaksStateSchema,
  UpdateTokensResultSchema,
  WorkTreeSchema,
};

export type { DirectEditResult };

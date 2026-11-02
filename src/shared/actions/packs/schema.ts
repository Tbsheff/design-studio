import { Schema } from "effect";

const PackModeSchema = Schema.Literals(["light", "dark"]);

const PackSourceSchema = Schema.Literals(["builtin", "user"]);

const PackFontsSchema = Schema.Struct({
  body: Schema.String,
  display: Schema.String,
  googleFontsUrl: Schema.optionalKey(Schema.String),
  mono: Schema.String,
});

const SwatchSchema = Schema.Struct({
  name: Schema.String,
  value: Schema.String,
});

const PackSummarySchema = Schema.Struct({
  copiedFrom: Schema.optionalKey(Schema.String),
  darkSwatches: Schema.optionalKey(Schema.Array(SwatchSchema)),
  description: Schema.String,
  draft: Schema.optionalKey(Schema.Boolean),
  fonts: PackFontsSchema,
  id: Schema.String,
  license: Schema.String,
  mode: PackModeSchema,
  name: Schema.String,
  provenance: Schema.Literals(["original", "imported", "extracted"]),
  source: PackSourceSchema,
  swatches: Schema.Array(SwatchSchema),
  tags: Schema.Array(Schema.String),
});

const TokenEntrySchema = Schema.Struct({
  cssVar: Schema.String,
  darkValue: Schema.NullOr(Schema.String),
  description: Schema.optionalKey(Schema.String),
  path: Schema.String,
  source: Schema.optionalKey(Schema.Unknown),
  type: Schema.String,
  value: Schema.String,
});

const PackDetailSchema = Schema.Struct({
  designMd: Schema.String,
  entries: Schema.Array(TokenEntrySchema),
  summary: PackSummarySchema,
  tokensJson: Schema.String,
});

const CheckProblemSchema = Schema.Struct({
  message: Schema.String,
  rule: Schema.String,
});

const CheckResultSchema = Schema.Struct({
  passed: Schema.Boolean,
  problems: Schema.Array(CheckProblemSchema),
});

const CoverageEntrySchema = Schema.Struct({
  confidence: Schema.String,
  evidence: Schema.String,
  source: Schema.String,
  token: Schema.String,
  verified: Schema.optionalKey(Schema.Boolean),
});

const SourceReportSchema = Schema.Struct({
  error: Schema.optionalKey(Schema.String),
  found: Schema.Number,
  kind: Schema.String,
  label: Schema.String,
  ok: Schema.Boolean,
});

const CoverageSchema = Schema.Struct({
  basePackId: Schema.String,
  fallbacks: Schema.Array(Schema.String),
  grade: Schema.String,
  mode: PackModeSchema,
  score: Schema.Number,
  sources: Schema.Array(SourceReportSchema),
  tokens: Schema.Array(CoverageEntrySchema),
  version: Schema.Number,
});

const SourceStatusSchema = Schema.Struct({
  detail: Schema.String,
  id: Schema.String,
  kind: Schema.String,
  label: Schema.String,
  method: Schema.optionalKey(Schema.String),
  ms: Schema.optionalKey(Schema.Number),
  note: Schema.optionalKey(Schema.String),
  state: Schema.String,
});

const ImproveStartSchema = Schema.Struct({
  reason: Schema.optionalKey(Schema.String),
  runId: Schema.optionalKey(Schema.String),
  state: Schema.String,
  status: Schema.optionalKey(Schema.String),
});

const DraftSourcesSchema = Schema.Struct({
  done: Schema.Boolean,
  finishedAt: Schema.optionalKey(Schema.Number),
  improve: ImproveStartSchema,
  sources: Schema.Array(SourceStatusSchema),
  startedAt: Schema.Number,
});

const DraftInfoSchema = Schema.Struct({
  check: CheckResultSchema,
  coverage: Schema.NullOr(CoverageSchema),
  packId: Schema.String,
  sources: Schema.optionalKey(Schema.NullOr(DraftSourcesSchema)),
});

const DesignSystemItemSchema = Schema.Struct({
  draft: Schema.Boolean,
  fonts: PackFontsSchema,
  id: Schema.String,
  mode: PackModeSchema,
  name: Schema.String,
  projectId: Schema.optionalKey(Schema.String),
  source: PackSourceSchema,
  swatches: Schema.Array(SwatchSchema),
});

const StatusSourceSchema = Schema.Struct({
  detail: Schema.String,
  kind: Schema.String,
  label: Schema.String,
  note: Schema.optionalKey(Schema.String),
  state: Schema.String,
});

const StatusCoverageSchema = Schema.Struct({
  fallbacks: Schema.Array(Schema.String),
  grade: Schema.String,
  score: Schema.Number,
});

const StatusSourcesSchema = Schema.Struct({
  done: Schema.Boolean,
  improve: ImproveStartSchema,
  items: Schema.Array(StatusSourceSchema),
});

const DraftStatusSchema = Schema.Struct({
  check: CheckResultSchema,
  coverage: Schema.NullOr(StatusCoverageSchema),
  packId: Schema.String,
  running: Schema.Boolean,
  sources: Schema.NullOr(StatusSourcesSchema),
});

const UPLOAD_NAME_MAX = 255;

const DraftImageSchema = Schema.Struct({
  content: Schema.String.annotate({
    description: "The image file as base64 text.",
  }),
  mime: Schema.String,
  name: Schema.String.check(Schema.isMaxLength(UPLOAD_NAME_MAX)),
});

const TokensUploadSchema = Schema.Struct({
  name: Schema.String.check(Schema.isMaxLength(UPLOAD_NAME_MAX)),
  text: Schema.String,
});

const PackProblemSchema = Schema.Struct({
  errors: Schema.Array(Schema.String),
  id: Schema.String,
  source: PackSourceSchema,
});

const PackFileSchema = Schema.Struct({
  content: Schema.String,
  name: Schema.String,
  type: Schema.String,
});

const ImportResultSchema = Schema.Struct({
  pack: PackSummarySchema,
  replaced: Schema.Boolean,
});

const EditorResultSchema = Schema.Struct({
  created: Schema.Boolean,
  project: Schema.Unknown,
});

const ApplyResultSchema = Schema.Struct({
  notice: Schema.NullOr(Schema.String),
  project: Schema.Unknown,
  state: Schema.Unknown,
  version: Schema.Unknown,
  wired: Schema.Boolean,
  written: Schema.Array(Schema.String),
});

const SaveResultSchema = Schema.Struct({
  created: Schema.Boolean,
  pack: PackSummarySchema,
  project: Schema.Unknown,
  version: Schema.Unknown,
});

const DraftResultSchema = Schema.Struct({
  coverage: Schema.Unknown,
  directionId: Schema.NullOr(Schema.String),
  grade: Schema.String,
  improve: Schema.String,
  ms: Schema.Number,
  name: Schema.String,
  next: Schema.String,
  pack: PackSummarySchema,
  packId: Schema.String,
  project: Schema.Unknown,
  projectId: Schema.String,
});

const PublishedDraftSchema = Schema.Struct({
  checkPassed: Schema.Boolean,
  created: Schema.Boolean,
  name: Schema.String,
  packId: Schema.String,
  versionId: Schema.NullOr(Schema.String),
});

const OkSchema = Schema.Struct({ ok: Schema.Literal(true) });

const PackFontsInputSchema = PackFontsSchema;

const PackModeInputSchema = PackModeSchema;

const ProvenanceSchema = Schema.Literals(["original", "imported", "extracted"]);

const TokensJsonSchema = Schema.Union([
  Schema.String,
  Schema.Record(Schema.String, Schema.Unknown),
]);

type PackProblemItem = typeof PackProblemSchema.Type;

type PackFile = typeof PackFileSchema.Type;

type DraftResult = typeof DraftResultSchema.Type;

type PublishedDraft = typeof PublishedDraftSchema.Type;

type DesignSystemItem = typeof DesignSystemItemSchema.Type;

type DraftStatus = typeof DraftStatusSchema.Type;

export {
  ApplyResultSchema,
  CheckResultSchema,
  DraftImageSchema,
  DraftResultSchema,
  EditorResultSchema,
  ImportResultSchema,
  OkSchema,
  PackFileSchema,
  PackFontsInputSchema,
  PackModeInputSchema,
  PackProblemSchema,
  ProvenanceSchema,
  PublishedDraftSchema,
  SaveResultSchema,
  TokensJsonSchema,
  TokensUploadSchema,
  DesignSystemItemSchema,
  DraftInfoSchema,
  DraftStatusSchema,
  PackDetailSchema,
  PackSummarySchema,
};

export type {
  DesignSystemItem,
  DraftResult,
  DraftStatus,
  PackFile,
  PackProblemItem,
  PublishedDraft,
};

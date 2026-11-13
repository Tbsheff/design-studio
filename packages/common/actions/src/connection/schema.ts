import { Schema } from "effect";

const APPROVAL_WAIT_MAX = 25;

const McpStatusSchema = Schema.Struct({
  command: Schema.NullOr(Schema.String),
  edits: Schema.Boolean,
  enabled: Schema.Boolean,
  error: Schema.NullOr(Schema.String),
  running: Schema.Boolean,
  url: Schema.NullOr(Schema.String),
});

const McpSetupSchema = Schema.Struct({
  canEdit: Schema.Boolean,
  isEnabled: Schema.Boolean,
  isRunning: Schema.Boolean,
  name: Schema.String,
  token: Schema.String,
  trustedFolders: Schema.Array(Schema.String),
  url: Schema.String,
});

const McpActivitySchema = Schema.Struct({
  at: Schema.Number,
  beforeVersionId: Schema.NullOr(Schema.String),
  client: Schema.String,
  directionId: Schema.NullOr(Schema.String),
  frameId: Schema.NullOr(Schema.String),
  id: Schema.String,
  projectId: Schema.String,
  summary: Schema.String,
  tool: Schema.String,
  versionId: Schema.NullOr(Schema.String),
});

const McpActivityListSchema = Schema.Struct({
  activity: Schema.Array(McpActivitySchema),
});

const McpApprovalSchema = Schema.Struct({
  action: Schema.String,
  client: Schema.String,
  createdAt: Schema.Number,
  detail: Schema.String,
  expiresAt: Schema.Number,
  id: Schema.String,
  projectId: Schema.NullOr(Schema.String),
  title: Schema.String,
  tool: Schema.String,
});

const McpApprovalPollSchema = Schema.Struct({
  edits: Schema.Boolean,
  pending: Schema.Array(McpApprovalSchema),
});

const McpApprovalIdSchema = Schema.String.annotate({
  description: "Approval id from the approval list.",
});

const McpApprovalAnsweredSchema = Schema.Struct({
  ok: Schema.Literal(true),
});

type McpSetup = typeof McpSetupSchema.Type;

export {
  APPROVAL_WAIT_MAX,
  McpActivityListSchema,
  McpActivitySchema,
  McpApprovalAnsweredSchema,
  McpApprovalIdSchema,
  McpApprovalPollSchema,
  McpApprovalSchema,
  McpSetupSchema,
  McpStatusSchema,
};

export type { McpSetup };

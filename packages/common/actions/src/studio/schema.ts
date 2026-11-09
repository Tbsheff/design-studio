import { Effect, Schema } from "effect";

const SkillOriginSchema = Schema.Union([
  Schema.Literal("personal"),
  Schema.TemplateLiteral(["plugin:", Schema.String]),
]);

const SkillInfoSchema = Schema.Struct({
  description: Schema.String,
  id: Schema.String,
  modelInvocable: Schema.Boolean,
  name: Schema.String,
  needsBash: Schema.Boolean,
  origin: SkillOriginSchema,
  sourcePath: Schema.String,
});

const SkillProblemSchema = Schema.Struct({
  reason: Schema.String,
  source: Schema.String,
});

const SkillCatalogSchema = Schema.Struct({
  problems: Schema.Array(SkillProblemSchema),
  skills: Schema.Array(SkillInfoSchema),
});

type SkillCatalog = typeof SkillCatalogSchema.Type;

const ACTIVITY_LIMIT_DEFAULT = 8;

const ACTIVITY_LIMIT_MAX = 50;

const ActivityLimitRange = Schema.isBetween({
  maximum: ACTIVITY_LIMIT_MAX,
  minimum: 1,
});

const ActivityLimitSchema = Schema.Int.check(ActivityLimitRange).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(ACTIVITY_LIMIT_DEFAULT))
);

const ActivityRunSchema = Schema.Struct({
  client: Schema.NullOr(Schema.String),
  costUsd: Schema.NullOr(Schema.Number),
  finishedAt: Schema.NullOr(Schema.Number),
  id: Schema.String,
  projectId: Schema.String,
  projectName: Schema.String,
  source: Schema.Literals(["chat", "mcp"]),
  startedAt: Schema.Number,
  status: Schema.String,
  title: Schema.String,
});

const ActivityApprovalSchema = Schema.Struct({
  client: Schema.String,
  createdAt: Schema.Number,
  id: Schema.String,
  projectId: Schema.NullOr(Schema.String),
  projectName: Schema.NullOr(Schema.String),
  title: Schema.String,
  tool: Schema.String,
});

const ActivityDevServerSchema = Schema.Struct({
  folder: Schema.String,
  projectId: Schema.String,
  projectName: Schema.String,
  state: Schema.String,
  url: Schema.NullOr(Schema.String),
});

const ActivityBranchSchema = Schema.Struct({
  branch: Schema.String,
  folder: Schema.String,
});

const ActivityMcpSchema = Schema.Struct({
  clients: Schema.Array(Schema.String),
  isEnabled: Schema.Boolean,
  isRunning: Schema.Boolean,
  url: Schema.NullOr(Schema.String),
});

const StudioActivitySchema = Schema.Struct({
  approvals: Schema.Array(ActivityApprovalSchema),
  branches: Schema.Array(ActivityBranchSchema),
  devServers: Schema.Array(ActivityDevServerSchema),
  mcp: ActivityMcpSchema,
  recent: Schema.Array(ActivityRunSchema),
  running: Schema.Array(ActivityRunSchema),
});

type ActivityRun = typeof ActivityRunSchema.Type;

type ActivityApproval = typeof ActivityApprovalSchema.Type;

type ActivityDevServer = typeof ActivityDevServerSchema.Type;

type ActivityBranch = typeof ActivityBranchSchema.Type;

type StudioActivity = typeof StudioActivitySchema.Type;

export {
  ActivityApprovalSchema,
  ActivityLimitSchema,
  ActivityBranchSchema,
  ActivityDevServerSchema,
  ActivityMcpSchema,
  ActivityRunSchema,
  SkillCatalogSchema,
  SkillInfoSchema,
  SkillOriginSchema,
  SkillProblemSchema,
  StudioActivitySchema,
};

export type {
  ActivityApproval,
  ActivityBranch,
  ActivityDevServer,
  ActivityRun,
  SkillCatalog,
  StudioActivity,
};

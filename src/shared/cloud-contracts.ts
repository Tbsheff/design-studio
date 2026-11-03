import { Schema, Struct } from "effect";

const StringMapSchema = Schema.Record(Schema.String, Schema.String);

const OrgRoleSchema = Schema.Literals(["owner", "admin", "member"]);

const CloudRefSchema = Schema.Struct({
  orgId: Schema.String,
  pid: Schema.String,
  sig: Schema.String,
});

const ProjectBindingSchema = Schema.Struct({
  appDir: Schema.NullOr(Schema.String),
  attachmentPaths: StringMapSchema,
  cloudRef: Schema.NullOr(CloudRefSchema),
  env: StringMapSchema,
  orgId: Schema.String,
  sourcePath: Schema.NullOr(Schema.String),
  workTrees: StringMapSchema,
});

const BindingsFileSchema = Schema.Struct({
  bindings: Schema.Record(Schema.String, ProjectBindingSchema),
  projectIdMap: StringMapSchema,
  version: Schema.Literal(1),
});

const AccountFileSchema = Schema.Struct({
  deviceId: Schema.String,
  personalOrgId: Schema.String,
  userId: Schema.String,
});

const ProjectProgressSchema = Schema.Struct({
  isBackedUp: Schema.Boolean,
  isBound: Schema.Boolean,
});

const LegacyMcpRecordSchema = Schema.Struct({
  isBannerPending: Schema.Boolean,
  isReadOnly: Schema.Literal(true),
  orgId: Schema.String,
  tokenFile: Schema.String,
});

const MigrationStateSchema = Schema.Struct({
  isBindingsDone: Schema.Boolean,
  legacyMcp: Schema.NullOr(LegacyMcpRecordSchema),
  projects: Schema.Record(Schema.String, ProjectProgressSchema),
  version: Schema.Literal(1),
});

const LocalDirectionSchema = Schema.Struct({
  branch: Schema.String,
  createdAt: Schema.Number,
  headVersionId: Schema.NullOr(Schema.String),
  id: Schema.String,
  name: Schema.String,
  parentVersionId: Schema.NullOr(Schema.String),
  workTree: Schema.String,
});

const CloudDirectionSchema = LocalDirectionSchema.mapFields(
  Struct.pick([
    "branch",
    "createdAt",
    "headVersionId",
    "id",
    "name",
    "parentVersionId",
  ])
);

const LocalProjectSchema = Schema.Struct({
  appDir: Schema.NullOr(Schema.String),
  createdAt: Schema.Number,
  id: Schema.String,
  kind: Schema.Literals(["html", "react"]),
  name: Schema.String,
  packId: Schema.NullOr(Schema.String),
  sourcePath: Schema.NullOr(Schema.String),
  updatedAt: Schema.Number,
});

const CloudProjectSchema = LocalProjectSchema.mapFields(
  Struct.pick(["createdAt", "id", "kind", "name", "packId", "updatedAt"])
);

const OrgOptionSchema = Schema.Struct({
  isPersonal: Schema.Boolean,
  name: Schema.String,
  orgId: Schema.String,
  role: OrgRoleSchema,
});

const SignInOrgListSchema = Schema.Struct({
  activeOrgId: Schema.NullOr(Schema.String),
  orgs: Schema.Array(OrgOptionSchema),
});

const ProjectSyncToggleSchema = Schema.Struct({
  isSyncOn: Schema.Boolean,
  projectId: Schema.String,
});

const ProjectSyncStatusSchema = Schema.Struct({
  cloudRef: Schema.NullOr(CloudRefSchema),
  isSyncOn: Schema.Boolean,
  orgId: Schema.NullOr(Schema.String),
  projectId: Schema.String,
});

type AccountFile = typeof AccountFileSchema.Type;

type BindingsFile = typeof BindingsFileSchema.Type;

type CloudDirection = typeof CloudDirectionSchema.Type;

type CloudProject = typeof CloudProjectSchema.Type;

type CloudRef = typeof CloudRefSchema.Type;

type LegacyMcpRecord = typeof LegacyMcpRecordSchema.Type;

type MigrationState = typeof MigrationStateSchema.Type;

type OrgOption = typeof OrgOptionSchema.Type;

type ProjectBinding = typeof ProjectBindingSchema.Type;

type ProjectProgress = typeof ProjectProgressSchema.Type;

type ProjectSyncStatus = typeof ProjectSyncStatusSchema.Type;

type ProjectSyncToggle = typeof ProjectSyncToggleSchema.Type;

type SignInOrgList = typeof SignInOrgListSchema.Type;

export {
  AccountFileSchema,
  BindingsFileSchema,
  CloudDirectionSchema,
  CloudProjectSchema,
  CloudRefSchema,
  LegacyMcpRecordSchema,
  LocalDirectionSchema,
  LocalProjectSchema,
  MigrationStateSchema,
  OrgOptionSchema,
  ProjectBindingSchema,
  ProjectProgressSchema,
  ProjectSyncStatusSchema,
  ProjectSyncToggleSchema,
  SignInOrgListSchema,
};

export type {
  AccountFile,
  BindingsFile,
  CloudDirection,
  CloudProject,
  CloudRef,
  LegacyMcpRecord,
  MigrationState,
  OrgOption,
  ProjectBinding,
  ProjectProgress,
  ProjectSyncStatus,
  ProjectSyncToggle,
  SignInOrgList,
};

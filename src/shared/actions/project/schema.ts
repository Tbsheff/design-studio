import { Schema } from "effect";

const ProjectSchema = Schema.Struct({
  directions: Schema.Array(Schema.Unknown),
  id: Schema.String,
  name: Schema.String,
});

const ProjectListSchema = Schema.Struct({
  items: Schema.Array(ProjectSchema),
});

const ProjectSearchResultSchema = Schema.Struct({
  projects: Schema.Array(Schema.Unknown),
  query: Schema.String,
  routes: Schema.Array(Schema.Unknown),
});

const SettingsFields = {
  allowBash: Schema.optionalKey(Schema.Boolean),
  allowInstall: Schema.optionalKey(Schema.Boolean),
  autoApprove: Schema.optionalKey(Schema.Boolean),
  defaultLevel: Schema.optionalKey(Schema.String),
  disabledSkills: Schema.optionalKey(Schema.Array(Schema.String)),
  maxBudgetUsd: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  maxTurns: Schema.optionalKey(Schema.Number),
  model: Schema.optionalKey(Schema.String),
} as const;

const ProjectCreateFields = {
  designMd: Schema.optionalKey(Schema.String),
  kind: Schema.optionalKey(Schema.String),
  level: Schema.optionalKey(Schema.String),
  name: Schema.optionalKey(Schema.String),
  packId: Schema.optionalKey(Schema.NullOr(Schema.String)),
  parentPath: Schema.optionalKey(Schema.String),
  prompt: Schema.String,
  referenceUrls: Schema.optionalKey(Schema.Array(Schema.String)),
  settings: Schema.optionalKey(Schema.Unknown),
  startRun: Schema.optionalKey(Schema.Boolean),
} as const;

const ProjectCreatedSchema = Schema.Struct({
  project: ProjectSchema,
  runId: Schema.NullOr(Schema.String),
});

const ProjectImportFields = {
  appDir: Schema.optionalKey(Schema.String),
  path: Schema.String,
  skipApp: Schema.optionalKey(Schema.Boolean),
} as const;

const ProjectImportedSchema = Schema.Struct({
  firstVersion: Schema.optionalKey(Schema.Unknown),
  legacyCanvas: Schema.optionalKey(Schema.Unknown),
  project: ProjectSchema,
});

const HiddenCountSchema = Schema.Struct({
  count: Schema.Number,
  target: Schema.String,
});

const HiddenMovedSchema = Schema.Struct({
  failed: Schema.Array(
    Schema.Struct({ error: Schema.String, projectId: Schema.String })
  ),
  moved: Schema.Array(Schema.String),
});

const CommandRulesSchema = Schema.Struct({
  rules: Schema.Unknown,
});

const AttachmentSchema = Schema.Struct({
  id: Schema.String,
  mime: Schema.String,
  name: Schema.String,
  path: Schema.Unknown,
});

const DesignMdContentSchema = Schema.Struct({
  content: Schema.String,
});

const DesignMdSavedSchema = Schema.Struct({
  ok: Schema.Boolean,
  versionId: Schema.NullOr(Schema.String),
});

const ProjectFileSchema = Schema.Struct({
  data: Schema.String,
  mimeType: Schema.String,
});

export {
  AttachmentSchema,
  CommandRulesSchema,
  DesignMdContentSchema,
  DesignMdSavedSchema,
  HiddenCountSchema,
  HiddenMovedSchema,
  ProjectCreateFields,
  ProjectCreatedSchema,
  ProjectFileSchema,
  ProjectImportFields,
  ProjectImportedSchema,
  ProjectListSchema,
  ProjectSchema,
  ProjectSearchResultSchema,
  SettingsFields,
};

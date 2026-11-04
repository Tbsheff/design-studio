import { Effect, Schema } from "effect";

import { ProjectIdSchema } from "../_core/ids.js";

const DirectionSchema = Schema.Struct({
  branch: Schema.String,
  createdAt: Schema.Number,
  headVersionId: Schema.NullOr(Schema.String),
  id: Schema.String,
  name: Schema.String,
  parentVersionId: Schema.NullOr(Schema.String),
  sessionId: Schema.NullOr(Schema.String),
});

const ProjectSchema = Schema.Struct({
  directions: Schema.Array(DirectionSchema),
  id: Schema.String,
  name: Schema.String,
});

const ProjectTypeSchema = Schema.Literals([
  "next",
  "vite",
  "html",
  "react",
  "design-system",
]);

const HealthSchema = Schema.Struct({
  level: Schema.Literals(["ok", "busy", "warn", "failed", "off"]),
  note: Schema.String,
});

const ProjectHitSchema = Schema.Struct({
  health: Schema.NullOr(HealthSchema),
  id: Schema.String,
  kind: Schema.Literal("project"),
  name: Schema.String,
  openedAt: Schema.NullOr(Schema.Number),
  place: Schema.NullOr(Schema.String),
  thumbnail: Schema.NullOr(Schema.String),
  type: ProjectTypeSchema,
  typeLabel: Schema.String,
  updatedAt: Schema.Number,
});

const RouteHitSchema = Schema.Struct({
  dynamic: Schema.Boolean,
  file: Schema.String,
  kind: Schema.Literal("route"),
  projectId: Schema.String,
  projectName: Schema.String,
  route: Schema.String,
});

const SearchHitSchema = Schema.Union([ProjectHitSchema, RouteHitSchema]);

const ProjectSearchFields = {
  projectId: Schema.NullOr(ProjectIdSchema)
    .annotate({
      description:
        "Project id that ranks first. Leave out to rank all projects the same.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  query: Schema.String.annotate({
    description: "Search text. Leave out to list recent projects.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed(""))),
} as const;

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
  settings: Schema.optionalKey(Schema.Struct(SettingsFields)),
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
  rules: Schema.Array(Schema.String),
});

const AttachmentSchema = Schema.Struct({
  id: Schema.String,
  mime: Schema.String,
  name: Schema.String,
  path: Schema.String,
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
  ProjectSchema,
  ProjectSearchFields,
  SearchHitSchema,
  SettingsFields,
};

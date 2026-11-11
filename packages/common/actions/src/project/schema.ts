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
  imageSearch: Schema.optionalKey(Schema.Boolean),
  isPinned: Schema.optionalKey(
    Schema.Boolean.annotate({
      description: "Pin the project to the top of the Home sidebar.",
    })
  ),
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
  isWorkspace: Schema.Boolean.annotate({
    description:
      "Link the folder as a workspace and do not change it. Any folder works: an app, docs, a design repo or a backend. Prompts in a workspace make HTML prototypes in the Design Studio folder. Leave out to import the folder as a project.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed(false))),
  path: Schema.NullOr(Schema.String)
    .annotate({
      description:
        "Folder on this Mac to import. Leave out when you pass url. Pass path or url, not both.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  skipApp: Schema.optionalKey(Schema.Boolean),
  url: Schema.NullOr(Schema.String)
    .annotate({
      description:
        "Public https repo URL to clone, on github.com, gitlab.com or bitbucket.org, or any https URL that ends in .git. Leave out when you pass path.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
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

const ProjectTrashedSchema = Schema.Struct({
  name: Schema.String,
  projectId: Schema.String,
  trashId: Schema.String,
});

const CommandRulesSchema = Schema.Struct({
  rules: Schema.Array(Schema.String),
});

const ProjectPrototypeFields = {
  level: Schema.NullOr(Schema.Literals(["wireframe", "prototype", "polish"]))
    .annotate({
      description:
        "Run level for the first run: wireframe, prototype or polish. Leave out to use the project default.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  name: Schema.NullOr(Schema.String)
    .annotate({
      description:
        "Name of the prototype. Leave out to make a name from the prompt.",
    })
    .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null))),
  prompt: Schema.String.annotate({
    description:
      "What the HTML prototype shows, in the user's words. The first run of the prototype gets this text.",
  }),
  shouldStartRun: Schema.Boolean.annotate({
    description:
      "Start the first agent run in the prototype with the prompt. Leave out to start it.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
} as const;

const ProjectPrototypeCreatedSchema = Schema.Struct({
  folder: Schema.String,
  project: ProjectSchema,
  runId: Schema.NullOr(Schema.String),
  tokensFile: Schema.NullOr(Schema.String),
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
  ProjectPrototypeCreatedSchema,
  ProjectPrototypeFields,
  ProjectSchema,
  ProjectSearchFields,
  ProjectTrashedSchema,
  SearchHitSchema,
  SettingsFields,
};

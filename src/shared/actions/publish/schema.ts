import { Schema } from "effect";

const ListProjectIdSchema = Schema.String.check(
  Schema.isPattern(/^[A-Za-z0-9_-]{1,64}$/u)
).annotate({ description: "Project id from list_projects." });

const PublishKindSchema = Schema.Literals(["site", "viewer"]);

const PublicationStatusSchema = Schema.Literals([
  "publishing",
  "live",
  "failed",
  "removed",
  "ended",
]);

const PublishedVersionSchema = Schema.Struct({
  bytes: Schema.Number,
  committedAt: Schema.NullOr(Schema.Number),
  fileCount: Schema.Number,
  id: Schema.String,
  label: Schema.String,
  live: Schema.Boolean,
  sourceVersion: Schema.String,
});

const PublicationViewsSchema = Schema.Struct({
  days: Schema.Array(
    Schema.Struct({ day: Schema.String, views: Schema.Number })
  ),
  last7: Schema.Number,
  total: Schema.Number,
});

const LastUploadSchema = Schema.Struct({
  reused: Schema.Number,
  sent: Schema.Number,
});

const PublicationSchema = Schema.Struct({
  accountId: Schema.NullOr(Schema.String),
  backend: Schema.Literals(["app", "legacy-worker"]),
  bytes: Schema.Number,
  commentCount: Schema.Number,
  commentsUrl: Schema.NullOr(Schema.String),
  createdAt: Schema.Number,
  directionId: Schema.String,
  error: Schema.NullOr(Schema.String),
  expiresAt: Schema.NullOr(Schema.Number),
  fileCount: Schema.Number,
  id: Schema.String,
  kind: PublishKindSchema,
  lastUpload: Schema.NullOr(LastUploadSchema),
  log: Schema.String,
  noindex: Schema.Boolean,
  pages: Schema.Array(Schema.String),
  password: Schema.Boolean,
  projectId: Schema.String,
  status: PublicationStatusSchema,
  title: Schema.String,
  updatedAt: Schema.Number,
  url: Schema.NullOr(Schema.String),
  versionId: Schema.String,
  versions: Schema.Array(PublishedVersionSchema),
  viewerComments: Schema.Boolean,
  views: Schema.NullOr(PublicationViewsSchema),
  workerName: Schema.NullOr(Schema.String),
});

const PublicationListSchema = Schema.Struct({
  backendError: Schema.NullOr(Schema.String),
  publications: Schema.Array(PublicationSchema),
});

const PublicationCommentSchema = Schema.Struct({
  author: Schema.String,
  body: Schema.String,
  createdAt: Schema.Number,
  id: Schema.String,
});

const PublicationCommentListSchema = Schema.Struct({
  comments: Schema.Array(PublicationCommentSchema),
});

const PublishAccountSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});

const PublishLoginStateSchema = Schema.Struct({
  error: Schema.NullOr(Schema.String),
  running: Schema.Boolean,
  url: Schema.NullOr(Schema.String),
});

const PublishCliStateSchema = Schema.Struct({
  accountId: Schema.NullOr(Schema.String),
  accounts: Schema.Array(PublishAccountSchema),
  email: Schema.NullOr(Schema.String),
  error: Schema.NullOr(Schema.String),
  installCommand: Schema.String,
  installed: Schema.Boolean,
  keyring: Schema.Boolean,
  login: PublishLoginStateSchema,
  minVersion: Schema.String,
  signedIn: Schema.Boolean,
  subdomain: Schema.NullOr(Schema.String),
  version: Schema.NullOr(Schema.String),
  versionOk: Schema.Boolean,
});

const SetupStepSchema = Schema.Struct({
  command: Schema.NullOr(Schema.String),
  detail: Schema.NullOr(Schema.String),
  id: Schema.Literals([
    "cli",
    "bucket",
    "database",
    "migrations",
    "key",
    "deploy",
    "health",
  ]),
  label: Schema.String,
  status: Schema.Literals(["pending", "running", "done", "skipped", "failed"]),
});

const PublishBackendStateSchema = Schema.Struct({
  accountId: Schema.NullOr(Schema.String),
  databaseId: Schema.NullOr(Schema.String),
  error: Schema.NullOr(Schema.String),
  keyStore: Schema.NullOr(Schema.Literals(["keychain", "file"])),
  localAllowed: Schema.Boolean,
  mode: Schema.NullOr(Schema.Literals(["cloudflare", "local"])),
  ready: Schema.Boolean,
  running: Schema.Boolean,
  setUpAt: Schema.NullOr(Schema.Number),
  steps: Schema.Array(SetupStepSchema),
  url: Schema.NullOr(Schema.String),
});

const QueryFlagSchema = Schema.optionalKey(Schema.String);

type PublicationList = typeof PublicationListSchema.Type;

type PublicationCommentList = typeof PublicationCommentListSchema.Type;

type PublishCliState = typeof PublishCliStateSchema.Type;

type PublishBackendState = typeof PublishBackendStateSchema.Type;

export {
  ListProjectIdSchema,
  PublicationCommentListSchema,
  PublicationCommentSchema,
  PublicationListSchema,
  PublicationSchema,
  PublishBackendStateSchema,
  PublishCliStateSchema,
  QueryFlagSchema,
};

export type {
  PublicationCommentList,
  PublicationList,
  PublishBackendState,
  PublishCliState,
};

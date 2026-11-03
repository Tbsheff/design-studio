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
  isLegacy: Schema.optionalKey(Schema.Boolean),
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

const NO_END_DAYS = 0;

const DAY = 1;

const WEEK_DAYS = 7;

const MONTH_DAYS = 30;

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/u;

const toIdField = (description: string): Schema.String =>
  Schema.String.check(Schema.isPattern(SAFE_ID)).annotate({ description });

const FRAME_REF_MAX = 80;

const FRAMES_MAX = 12;

const TITLE_MAX = 120;

const PASSWORD_MIN = 8;

const PASSWORD_MAX = 128;

const PublishFramesSchema = Schema.Array(
  Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(FRAME_REF_MAX))
)
  .check(Schema.isMinLength(1), Schema.isMaxLength(FRAMES_MAX))
  .annotate({
    description:
      "Attached app or React project only: frame ids or @labels from canvas_list to show. Leave out for every visible frame of the direction.",
  });

const ExpiryDaysSchema = Schema.Literals([
  NO_END_DAYS,
  DAY,
  WEEK_DAYS,
  MONTH_DAYS,
]).annotate({
  description:
    "Days until the link stops working: 1, 7 or 30, or 0 for no end date. Default 7 for a new publication; a republish keeps the old end date.",
});

const PublishInputFields = {
  comments: Schema.optionalKey(
    Schema.Boolean.annotate({
      description:
        "Attached app or React project only: show the open comments next to the frames as read-only text.",
    })
  ),
  directionId: Schema.optionalKey(
    toIdField("Direction id. Leave out for the main direction.")
  ),
  expiresInDays: Schema.optionalKey(ExpiryDaysSchema),
  frames: Schema.optionalKey(PublishFramesSchema),
  noindex: Schema.optionalKey(
    Schema.Boolean.annotate({
      description: "Send noindex so search engines skip it. Default true.",
    })
  ),
  password: Schema.optionalKey(
    Schema.String.check(
      Schema.isMinCodePoints(PASSWORD_MIN),
      Schema.isMaxCodePoints(PASSWORD_MAX)
    ).annotate({
      description:
        "Password viewers must type (HTTP Basic, any user name). Only a salted hash goes into the Worker; the reply never repeats it. Leave out for no password, or to keep the password of the publication you republish.",
    })
  ),
  projectId: ListProjectIdSchema,
  publicationId: Schema.optionalKey(
    toIdField(
      "Publication id from list_publications to republish into the same URL."
    )
  ),
  title: Schema.optionalKey(
    Schema.String.check(Schema.isMaxLength(TITLE_MAX)).annotate({
      description:
        "Title on the published viewer. Leave out for the project name.",
    })
  ),
  versionId: Schema.optionalKey(
    toIdField(
      "Saved version id from list_versions. Leave out for the head version."
    )
  ),
  viewerComments: Schema.optionalKey(
    Schema.Boolean.annotate({
      description:
        "Let viewers leave comments on a comments page (rate limited, owner can delete). Leave out for off on a new publication; a republish keeps the old value.",
    })
  ),
};

const PublishInputSchema = Schema.Struct(PublishInputFields);

const PublicationTargetFields = {
  projectId: ListProjectIdSchema,
  publicationId: toIdField("Publication id from list_publications."),
};

const PublicationResultSchema = Schema.Struct({
  publication: PublicationSchema,
});

const DeletedSchema = Schema.Struct({ ok: Schema.Literal(true) });

const PublishBackendModeSchema = Schema.Literals(["cloudflare", "local"]);

type PublishInput = typeof PublishInputSchema.Type;

type PublicationList = typeof PublicationListSchema.Type;

type PublicationCommentList = typeof PublicationCommentListSchema.Type;

type PublishCliState = typeof PublishCliStateSchema.Type;

type PublishBackendState = typeof PublishBackendStateSchema.Type;

type PublishBackendMode = typeof PublishBackendModeSchema.Type;

export {
  DeletedSchema,
  ListProjectIdSchema,
  PublicationResultSchema,
  PublicationTargetFields,
  PublishInputFields,
  PublishInputSchema,
  toIdField,
  PublicationCommentListSchema,
  PublicationCommentSchema,
  PublicationListSchema,
  PublicationSchema,
  PublishBackendModeSchema,
  PublishBackendStateSchema,
  PublishCliStateSchema,
  QueryFlagSchema,
};

export type {
  PublicationCommentList,
  PublicationList,
  PublishBackendMode,
  PublishBackendState,
  PublishCliState,
  PublishInput,
};

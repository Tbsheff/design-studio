import { Schema } from "effect";

const ShareFrameSchema = Schema.Struct({
  cssHeight: Schema.Number,
  height: Schema.Number,
  id: Schema.optionalKey(Schema.String),
  name: Schema.String,
  path: Schema.optionalKey(Schema.String),
  width: Schema.Number,
});

const ShareLinkSchema = Schema.Struct({
  active: Schema.Boolean,
  comments: Schema.Number,
  createdAt: Schema.Number,
  directionId: Schema.String,
  expiresAt: Schema.Number,
  frames: Schema.Array(ShareFrameSchema),
  id: Schema.String,
  live: Schema.Boolean,
  projectId: Schema.String,
  rev: Schema.Number,
  revokedAt: Schema.NullOr(Schema.Number),
  studioCursor: Schema.Boolean,
  title: Schema.String,
  versionId: Schema.String,
  viewers: Schema.Number,
});

const ShareServerStateSchema = Schema.Struct({
  lan: Schema.Boolean,
  lanUrl: Schema.NullOr(Schema.String),
  localUrl: Schema.NullOr(Schema.String),
  running: Schema.Boolean,
});

const ShareListSchema = Schema.Struct({
  links: Schema.Array(ShareLinkSchema),
  server: ShareServerStateSchema,
});

const ShareMadeSchema = Schema.Struct({
  link: ShareLinkSchema,
  server: ShareServerStateSchema,
  token: Schema.String,
  url: Schema.NullOr(Schema.String),
});

const ShareFrameUrlSchema = Schema.Struct({
  frameKey: Schema.String,
  name: Schema.String,
  url: Schema.NullOr(Schema.String),
});

const ShareCreatedSchema = Schema.Struct({
  ...ShareMadeSchema.fields,
  frameUrls: Schema.Array(ShareFrameUrlSchema),
});

const ShareRevokedSchema = Schema.Struct({
  link: Schema.NullOr(ShareLinkSchema),
  server: ShareServerStateSchema,
});

const ShareLinkResultSchema = Schema.Struct({
  link: ShareLinkSchema,
});

const ShareServerResultSchema = Schema.Struct({
  server: ShareServerStateSchema,
});

const ShareIdSchema = Schema.String.check(
  Schema.isPattern(/^[A-Za-z0-9_-]{1,64}$/u)
).annotate({
  description: "Share link id from list_share_links or create_share_link.",
});

type ShareCreated = typeof ShareCreatedSchema.Type;

type ShareMade = typeof ShareMadeSchema.Type;

type ShareFrameUrl = typeof ShareFrameUrlSchema.Type;

type ShareRevoked = typeof ShareRevokedSchema.Type;

type ShareLinkResult = typeof ShareLinkResultSchema.Type;

type ShareFrame = typeof ShareFrameSchema.Type;

type ShareLink = typeof ShareLinkSchema.Type;

type ShareList = typeof ShareListSchema.Type;

type ShareListWire = typeof ShareListSchema.Encoded;

type ShareServerState = typeof ShareServerStateSchema.Type;

export {
  ShareCreatedSchema,
  ShareFrameSchema,
  ShareFrameUrlSchema,
  ShareIdSchema,
  ShareMadeSchema,
  ShareLinkResultSchema,
  ShareRevokedSchema,
  ShareServerResultSchema,
  ShareLinkSchema,
  ShareListSchema,
  ShareServerStateSchema,
};

export type {
  ShareCreated,
  ShareFrame,
  ShareFrameUrl,
  ShareLinkResult,
  ShareMade,
  ShareRevoked,
  ShareLink,
  ShareList,
  ShareListWire,
  ShareServerState,
};

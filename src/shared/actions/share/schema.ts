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

type ShareFrame = typeof ShareFrameSchema.Type;

type ShareLink = typeof ShareLinkSchema.Type;

type ShareList = typeof ShareListSchema.Type;

type ShareListWire = typeof ShareListSchema.Encoded;

type ShareServerState = typeof ShareServerStateSchema.Type;

export {
  ShareFrameSchema,
  ShareLinkSchema,
  ShareListSchema,
  ShareServerStateSchema,
};

export type {
  ShareFrame,
  ShareLink,
  ShareList,
  ShareListWire,
  ShareServerState,
};

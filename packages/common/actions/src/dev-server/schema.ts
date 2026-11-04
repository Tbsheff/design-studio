import { Schema } from "effect";

const SOURCE_FIELD_MAX = 4096;

const SourceFieldSchema = Schema.String.check(
  Schema.isMaxLength(SOURCE_FIELD_MAX)
);

const AppModeSchema = Schema.Literals(["managed", "url"]);

const AppServerStateSchema = Schema.Literals([
  "failed",
  "idle",
  "ready",
  "starting",
  "stopped",
]);

const AppServerStatusSchema = Schema.Struct({
  command: Schema.NullOr(Schema.String),
  doctor: Schema.optionalKey(Schema.Unknown),
  message: Schema.NullOr(Schema.String),
  mode: AppModeSchema,
  startedAt: Schema.NullOr(Schema.Number),
  state: AppServerStateSchema,
  upstream: Schema.NullOr(Schema.String),
});

const AppLogLineSchema = Schema.Struct({
  at: Schema.Number,
  stream: Schema.Literals(["stderr", "stdout", "studio"]),
  text: Schema.String,
});

const DevServerViewSchema = Schema.Struct({
  app: Schema.Unknown,
  firstVersion: Schema.Unknown,
  logs: Schema.Array(AppLogLineSchema),
  status: Schema.NullOr(AppServerStatusSchema),
});

const DevServerConfigSavedSchema = Schema.Struct({
  app: Schema.Unknown,
});

const AppRouteSchema = Schema.Struct({
  dynamic: Schema.Boolean,
  file: Schema.String,
  group: Schema.NullOr(Schema.String),
  route: Schema.String,
});

const DevServerRoutesSchema = Schema.Struct({
  routes: Schema.Array(AppRouteSchema),
});

const DevServerAttachedSchema = Schema.Struct({
  firstVersion: Schema.Unknown,
  legacyCanvas: Schema.Unknown,
  project: Schema.Unknown,
});

export {
  AppLogLineSchema,
  AppRouteSchema,
  AppServerStatusSchema,
  DevServerAttachedSchema,
  DevServerConfigSavedSchema,
  DevServerRoutesSchema,
  DevServerViewSchema,
  SourceFieldSchema,
};

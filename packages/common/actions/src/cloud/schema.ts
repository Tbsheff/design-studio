import { Schema } from "effect";

const CloudStateSchema = Schema.Literals([
  "expired",
  "signed-in",
  "signed-out",
]);

const CloudUserSchema = Schema.Struct({
  email: Schema.String,
  id: Schema.String,
  name: Schema.String,
});

const CloudOrgSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  role: Schema.String,
});

const CloudViewSchema = Schema.Struct({
  orgs: Schema.Array(CloudOrgSchema),
  state: CloudStateSchema,
  user: Schema.NullOr(CloudUserSchema),
});

const CloudStateViewSchema = Schema.Struct({
  state: CloudStateSchema,
});

type CloudOrg = typeof CloudOrgSchema.Type;

type CloudState = typeof CloudStateSchema.Type;

type CloudUser = typeof CloudUserSchema.Type;

type CloudView = typeof CloudViewSchema.Type;

export {
  CloudOrgSchema,
  CloudStateSchema,
  CloudStateViewSchema,
  CloudUserSchema,
  CloudViewSchema,
};

export type { CloudOrg, CloudState, CloudUser, CloudView };

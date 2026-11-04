import { Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";

const MAX_CALL_SITES = 400;

const PropKindSchema = Schema.Literals([
  "text",
  "boolean",
  "slot",
  "instance",
  "value",
]);

const PropMakeKindSchema = Schema.Literals([
  "text",
  "boolean",
  "slot",
  "instance",
]);

const PropNameSchema = Schema.String.check(
  Schema.isPattern(/^[A-Za-z_$][\w$]{0,63}$/u)
);

const PropTargetFields = {
  component: Schema.String.check(Schema.isMinLength(1)),
  directionId: DirectionIdSchema,
  file: Schema.String.check(Schema.isMinLength(1)),
  projectId: ProjectIdSchema,
};

const PropSchema = Schema.Struct({
  default: Schema.NullOr(Schema.String),
  isDeclared: Schema.Boolean,
  isRequired: Schema.Boolean,
  kind: PropKindSchema,
  name: Schema.String,
  type: Schema.NullOr(Schema.String),
  useCount: Schema.Int,
});

const PropCallSiteSchema = Schema.Struct({
  file: Schema.String,
  line: Schema.Int,
});

const PropChangeSchema = Schema.Struct({
  callSites: Schema.Array(PropCallSiteSchema).check(
    Schema.isMaxLength(MAX_CALL_SITES)
  ),
  component: Schema.String,
  default: Schema.NullOr(Schema.String),
  files: Schema.Array(Schema.String),
  kind: PropKindSchema,
  name: Schema.String,
  newName: Schema.NullOr(Schema.String),
  note: Schema.NullOr(Schema.String),
  title: Schema.String,
  versionId: Schema.NullOr(Schema.String),
});

export {
  MAX_CALL_SITES,
  PropCallSiteSchema,
  PropChangeSchema,
  PropKindSchema,
  PropMakeKindSchema,
  PropNameSchema,
  PropSchema,
  PropTargetFields,
};

import { Effect, Schema } from "effect";

const NAME_PATTERN = /^[a-z][a-z0-9_]{0,31}$/u;

const COMMAND_MAX = 400;

const ARGS_MAX = 40;

const ARG_MAX = 400;

const URL_MAX = 600;

const SECRET_NAME_MAX = 64;

const TOOLS_MAX = 200;

const TOOL_NAME_MAX = 128;

const IntegrationIdSchema = Schema.String.check(
  Schema.isPattern(NAME_PATTERN)
).annotate({
  description:
    "The server name. Lowercase letters, digits and single underscores. It is also the tool prefix mcp__<name>__.",
});

const IntegrationTransportSchema = Schema.Literals(["stdio", "http"]);

const IntegrationStatusSchema = Schema.Literals([
  "untested",
  "connected",
  "error",
]);

const IntegrationToolSchema = Schema.Struct({
  description: Schema.String,
  name: Schema.String,
});

const IntegrationSchema = Schema.Struct({
  allowedTools: Schema.Array(Schema.String),
  args: Schema.Array(Schema.String),
  checkedAt: Schema.NullOr(Schema.String),
  command: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  hasSecret: Schema.Boolean,
  id: IntegrationIdSchema,
  isEnabled: Schema.Boolean,
  name: IntegrationIdSchema,
  secretName: Schema.NullOr(Schema.String),
  status: IntegrationStatusSchema,
  statusMessage: Schema.NullOr(Schema.String),
  tools: Schema.Array(IntegrationToolSchema),
  transport: IntegrationTransportSchema,
  url: Schema.NullOr(Schema.String),
});

const NULL_DEFAULT = Effect.succeed(null);

const ToolNameSchema = Schema.String.check(Schema.isMaxLength(TOOL_NAME_MAX));

const ToolNamesSchema = Schema.Array(ToolNameSchema).check(
  Schema.isMaxLength(TOOLS_MAX)
);

const CommandSchema = Schema.String.check(Schema.isMaxLength(COMMAND_MAX));

const UrlSchema = Schema.String.check(Schema.isMaxLength(URL_MAX));

const SecretNameSchema = Schema.String.check(
  Schema.isMaxLength(SECRET_NAME_MAX)
);

const ArgsSchema = Schema.Array(
  Schema.String.check(Schema.isMaxLength(ARG_MAX))
).check(Schema.isMaxLength(ARGS_MAX));

const IntegrationCreateFields = {
  args: ArgsSchema.pipe(Schema.withDecodingDefaultKey(Effect.succeed([]))),
  command: Schema.NullOr(CommandSchema).pipe(
    Schema.withDecodingDefaultKey(NULL_DEFAULT)
  ),
  name: IntegrationIdSchema,
  secret: Schema.NullOr(Schema.String).pipe(
    Schema.withDecodingDefaultKey(NULL_DEFAULT)
  ),
  secretName: Schema.NullOr(SecretNameSchema).pipe(
    Schema.withDecodingDefaultKey(NULL_DEFAULT)
  ),
  transport: IntegrationTransportSchema,
  url: Schema.NullOr(UrlSchema).pipe(
    Schema.withDecodingDefaultKey(NULL_DEFAULT)
  ),
} as const;

const IntegrationUpdateFields = {
  allowedTools: Schema.NullOr(ToolNamesSchema).pipe(
    Schema.withDecodingDefaultKey(NULL_DEFAULT)
  ),
  args: Schema.NullOr(ArgsSchema).pipe(
    Schema.withDecodingDefaultKey(NULL_DEFAULT)
  ),
  command: Schema.NullOr(CommandSchema).pipe(
    Schema.withDecodingDefaultKey(NULL_DEFAULT)
  ),
  isEnabled: Schema.NullOr(Schema.Boolean).pipe(
    Schema.withDecodingDefaultKey(NULL_DEFAULT)
  ),
  secret: Schema.NullOr(Schema.String).pipe(
    Schema.withDecodingDefaultKey(NULL_DEFAULT)
  ),
  secretName: Schema.NullOr(SecretNameSchema).pipe(
    Schema.withDecodingDefaultKey(NULL_DEFAULT)
  ),
  url: Schema.NullOr(UrlSchema).pipe(
    Schema.withDecodingDefaultKey(NULL_DEFAULT)
  ),
} as const;

const IntegrationIdFields = {
  integrationId: IntegrationIdSchema,
} as const;

const IntegrationDeletedSchema = Schema.Struct({
  id: IntegrationIdSchema,
  name: IntegrationIdSchema,
});

export {
  IntegrationCreateFields,
  IntegrationDeletedSchema,
  IntegrationIdFields,
  IntegrationIdSchema,
  IntegrationSchema,
  IntegrationStatusSchema,
  IntegrationToolSchema,
  IntegrationTransportSchema,
  IntegrationUpdateFields,
};

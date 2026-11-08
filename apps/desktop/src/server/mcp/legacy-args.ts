import { Schema } from "effect";
import type { JsonSchema } from "effect";

import type { WireArgs } from "../handlers/_core/run-action.js";
import { toDecoder } from "../platform/decode/index.js";
import { toLegacyTargetFields } from "./legacy-target-schema.js";

type LegacyArgs = WireArgs;

interface LegacyTool {
  readonly action: { readonly input: { readonly fields: object } };
  readonly name: string;
}

const ALIASES = {
  create_text_style: { targetSelector: "selector" },
  detach_text_style: { targetSelector: "selector" },
  inspect_accessibility: { targetSelector: "selector" },
  keep_links: { linkIds: "ids" },
  set_frame_session: { forgetCookies: "forget" },
} as const;

const DEFAULTS = {
  keep_links: { ids: "all" },
  list_comments: { limit: 200 },
  list_design_systems: { limit: 200 },
  list_links: { check: true },
} as const;

const toAliases = (name: string): Readonly<Record<string, string>> =>
  Object.entries(ALIASES).find(([key]) => key === name)?.[1] ?? {};

const toDefaults = (name: string): LegacyArgs =>
  Object.entries(DEFAULTS).find(([key]) => key === name)?.[1] ?? {};

const toRenamedArgs = (name: string, args: LegacyArgs): LegacyArgs => {
  const aliases = toAliases(name);

  return Object.fromEntries(
    Object.entries(args).map(([key, value]) => [aliases[key] ?? key, value])
  );
};

const toKnownArgs = (tool: LegacyTool, args: LegacyArgs): LegacyArgs => {
  if ("directionId" in tool.action.input.fields) {
    return args;
  }

  return Object.fromEntries(
    Object.entries(args).filter(([key]) => key !== "directionId")
  );
};

const HIDDEN_ARGS = {
  add_comment: new Set(["author"]),
  create_design_system: new Set(["improve", "images", "tokensUpload"]),
  reply_comment: new Set(["author"]),
} as const;

const CLIENT_AUTHOR_TOOLS: ReadonlySet<string> = new Set([
  "add_comment",
  "reply_comment",
]);

const NO_HIDDEN: ReadonlySet<string> = new Set();

const toHiddenKeys = (name: string): ReadonlySet<string> =>
  Object.entries(HIDDEN_ARGS).find(([key]) => key === name)?.[1] ?? NO_HIDDEN;

const toVisibleArgs = (name: string, args: LegacyArgs): LegacyArgs => {
  const hidden = toHiddenKeys(name);

  return Object.fromEntries(
    Object.entries(args).filter(([key]) => !hidden.has(key))
  );
};

const toClientArgs = (
  name: string,
  args: LegacyArgs,
  client: string | null
): LegacyArgs => {
  if (client === null || !CLIENT_AUTHOR_TOOLS.has(name)) {
    return args;
  }

  return { ...args, author: client };
};

const toBaseArgs = (tool: LegacyTool, args: LegacyArgs): LegacyArgs => {
  const visible = toVisibleArgs(tool.name, args);
  const renamed = toRenamedArgs(tool.name, visible);

  return { ...toDefaults(tool.name), ...toKnownArgs(tool, renamed) };
};

const toLegacyArgs = (
  tool: LegacyTool,
  args: LegacyArgs,
  client: string | null
): LegacyArgs => toClientArgs(tool.name, toBaseArgs(tool, args), client);

const DIRECTION_PROPERTY = {
  description: "Direction id. Leave out for the main direction.",
  pattern: "^[A-Za-z0-9_-]{1,64}$",
  type: "string",
} satisfies Schema.Json;

const DIRECTION_TOOLS: ReadonlySet<string> = new Set([
  "add_flow",
  "add_link",
  "keep_links",
  "list_link_interactions",
  "list_links",
  "remove_link",
  "set_link_interaction",
  "set_start_frame",
]);

const LINK_IDS_PROPERTY = {
  description:
    "Implicit link ids from list_links (implicit: true). Omit to keep all.",
  items: { pattern: "^i[0-9a-z]{1,12}$", type: "string" },
  maxItems: 50,
  type: "array",
} satisfies Schema.Json;

const TARGET_SELECTOR_PROPERTY = {
  description: "CSS selector or layer id of the element.",
  maxLength: 2000,
  minLength: 1,
  type: "string",
} satisfies Schema.Json;

const FORGET_PROPERTY = {
  description: "Forget the cookies kept from a real sign-in.",
  type: "boolean",
} satisfies Schema.Json;

const ALIAS_PROPERTIES = {
  forgetCookies: FORGET_PROPERTY,
  linkIds: LINK_IDS_PROPERTY,
  targetSelector: TARGET_SELECTOR_PROPERTY,
} satisfies Record<string, Schema.Json>;

const toAliasProperty = (alias: string): Schema.Json =>
  Object.entries(ALIAS_PROPERTIES).find(([key]) => key === alias)?.[1] ??
  FORGET_PROPERTY;

const WAIT_TOOLS: ReadonlySet<string> = new Set([
  "redo",
  "revert_hunk",
  "undo",
]);

const WAIT_PROPERTY = {
  description:
    'Leave out to get the result as soon as the file is written and saved. "render": also wait until the dev server has rebuilt the page.',
  enum: ["render"],
  type: "string",
} satisfies Schema.Json;

const InputFieldsSchema = Schema.Struct({
  properties: Schema.Record(Schema.String, Schema.Json),
  required: Schema.Array(Schema.String),
});

const readInputFields = toDecoder(InputFieldsSchema, "ignore");

const toOptionalKeys = (name: string, takesDirection: boolean): string[] => {
  const keys = Object.keys(toDefaults(name));

  if (takesDirection) {
    return [...keys, "directionId"];
  }

  return keys;
};

const toExtraProperties = (
  name: string,
  takesDirection: boolean
): Readonly<Record<string, Schema.Json>> => {
  const aliases = Object.keys(toAliases(name)).map(
    (alias) => [alias, toAliasProperty(alias)] as const
  );

  const direction: (readonly [string, Schema.Json])[] = [];

  if (takesDirection || DIRECTION_TOOLS.has(name)) {
    direction.push(["directionId", DIRECTION_PROPERTY]);
  }

  const wait: (readonly [string, Schema.Json])[] = [];

  if (WAIT_TOOLS.has(name)) {
    wait.push(["wait", WAIT_PROPERTY]);
  }

  return Object.fromEntries([...direction, ...aliases, ...wait]);
};

const toLegacySchema = (
  name: string,
  takesDirection: boolean,
  schema: JsonSchema.JsonSchema
): JsonSchema.JsonSchema => {
  const fields = readInputFields({
    properties: schema.properties ?? {},
    required: schema.required ?? [],
  });

  if (fields._tag === "Failure") {
    return schema;
  }

  const optional = new Set(toOptionalKeys(name, takesDirection));

  const hidden = toHiddenKeys(name);

  const legacy = toLegacyTargetFields(name, {
    properties: {
      ...toExtraProperties(name, takesDirection),
      ...Object.fromEntries(
        Object.entries(fields.success.properties).filter(
          ([key]) => !hidden.has(key)
        )
      ),
    },
    required: fields.success.required.filter((key) => !optional.has(key)),
  });

  return { ...schema, ...legacy };
};

export { toLegacyArgs, toLegacySchema };

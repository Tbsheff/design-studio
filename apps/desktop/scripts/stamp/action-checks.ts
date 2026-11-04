import { access as accessFile } from "node:fs/promises";
import path from "node:path";

import { ACTION_ROOT, STAMP_ROOT } from "./action-index.js";
import type { ActionIndex } from "./action-index.js";
import { inputFields, pathParams, readPermissions } from "./action-sources.js";
import { fail, hasFlag, listFlag, stringFlag } from "./args.js";
import type { ParsedArgs } from "./args.js";
import { kebab } from "./names.js";
import type { DerivedNames } from "./names.js";
import type {
  ActionDefinitionSpec,
  AgentBinding,
  ErrorRef,
  McpBinding,
} from "./templates.js";

type Access = ActionDefinitionSpec["access"];

type Scope = ActionDefinitionSpec["scope"];

interface ActionPlan {
  readonly definition: ActionDefinitionSpec;
  readonly feature: string | null;
  readonly warnings: readonly string[];
}

interface PlanContext {
  readonly args: ParsedArgs;
  readonly index: ActionIndex;
  readonly isRestamp: boolean;
  readonly names: DerivedNames;
}

const ACCESS: readonly string[] = ["read", "edit", "destructive"];

const METHODS: readonly string[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const SCOPES: readonly string[] = ["project", "org", "device"];

const OFF_REASONS: readonly string[] = [
  "run-control",
  "secret",
  "stream",
  "ui-bootstrap",
];

const AGENT_SETS: readonly string[] = [
  "app",
  "core",
  "design-system",
  "kit",
  "tweak",
];

const SHORT_PARAMS = new Set(["did", "id", "pid", "vid"]);

const MAX_TOOL_NAME = 64;

const TOOL_NAME = /^[a-z][a-z0-9_]*$/u;

const RUN_CONTROL_VERBS = ["start", "steer", "stop"];

const FIX =
  "pnpm run new:action <domain> <verb> --access <a> --path /api/... --needs <p> --scope <s> --description <text>";

const exists = async (file: string): Promise<boolean> => {
  try {
    await accessFile(file);

    return true;
  } catch {
    return false;
  }
};

const oneOf = (
  name: string,
  value: string,
  allowed: readonly string[]
): string => {
  if (!allowed.includes(value)) {
    fail(
      `The flag --${name} has the value "${value}". It must be one of ${allowed.join(", ")}.`,
      `use --${name} ${allowed[0] ?? ""}`
    );
  }

  return value;
};

const required = (args: ParsedArgs, name: string): string => {
  const value = stringFlag(args, name);

  if (value === null) {
    return fail(`The flag --${name} is missing.`, FIX);
  }

  return value;
};

const checkText = (
  name: string,
  value: string,
  limits: { readonly max: number; readonly min: number }
): string => {
  if (value.length < limits.min || value.length > limits.max) {
    fail(
      `The text of --${name} has ${String(value.length)} chars. It must have ${String(limits.min)} to ${String(limits.max)}.`,
      `write a STE sentence of ${String(limits.min)} to ${String(limits.max)} chars`
    );
  }

  if (value.includes("TODO")) {
    fail(`The text of --${name} contains TODO.`, "write the real text");
  }

  return value;
};

const pickMethod = (args: ParsedArgs, access: Access): string => {
  let fallback = "POST";

  if (access === "read") {
    fallback = "GET";
  }

  const method = oneOf(
    "method",
    stringFlag(args, "method") ?? fallback,
    METHODS
  );

  if (access === "read" && method !== "GET") {
    fail("A read action must use GET.", "use --method GET");
  }

  if (access !== "read" && method === "GET") {
    fail(
      "An edit or destructive action must not use GET.",
      "use --method POST"
    );
  }

  return method;
};

const checkPath = (route: string): string => {
  if (!route.startsWith("/api/")) {
    fail(
      `The path "${route}" does not start with /api/.`,
      "use --path /api/..."
    );
  }

  for (const param of pathParams(route)) {
    if (SHORT_PARAMS.has(param)) {
      fail(
        `The path param :${param} is a short name. Path params use the full input field name.`,
        "use :projectId, :directionId, :versionId or :<noun>Id"
      );
    }
  }

  return route;
};

const checkNeeds = async (
  needs: string,
  access: Access,
  confirmFlag: string | null
): Promise<"none" | "user"> => {
  const permissions = await readPermissions();

  if (!permissions.all.has(needs)) {
    fail(
      `The permission "${needs}" is not in packages/common/actions/src/_core/permissions.ts.`,
      "use a member of PERMISSIONS"
    );
  }

  if (confirmFlag !== null) {
    oneOf("confirm", confirmFlag, ["user"]);

    return "user";
  }

  if (access === "destructive" || permissions.confirm.has(needs)) {
    fail(
      "A destructive action or an action that needs a confirm permission must ask the user.",
      "add --confirm user"
    );
  }

  return "none";
};

const takenNames = (context: PlanContext): Set<string> =>
  new Set([
    ...context.index.snapshotNames,
    ...context.index.actions.flatMap((known) =>
      [known.mcp, known.agent, known.tool].filter(
        (name): name is string => name !== null
      )
    ),
  ]);

const checkToolName = (
  flag: string,
  name: string,
  context: PlanContext
): string => {
  if (!TOOL_NAME.test(name) || name.length > MAX_TOOL_NAME) {
    fail(
      `The name "${name}" of --${flag} is not snake_case with 64 chars or less.`,
      `use --${flag} ${context.names.tool}`
    );
  }

  if (takenNames(context).has(name)) {
    fail(
      `The name "${name}" of --${flag} is already used by an action or an MCP snapshot.`,
      `pick a new name, for example ${context.names.tool}`
    );
  }

  return name;
};

const isRunControl = (names: DerivedNames): boolean =>
  names.domain === "runs" &&
  RUN_CONTROL_VERBS.some((verb) => names.verb.startsWith(verb));

const offReason = (
  flag: string,
  reason: string,
  names: DerivedNames
): string => {
  oneOf(flag, reason, OFF_REASONS);

  if (isRunControl(names) && reason !== "run-control") {
    fail(
      "A runs action that starts, steers or stops a run is run-control.",
      `use --${flag} run-control`
    );
  }

  return reason;
};

const refuseBoth = (args: ParsedArgs, name: string): void => {
  const isOn = stringFlag(args, name) !== null;
  const isOff = stringFlag(args, `${name}-off`) !== null;

  if (isOn === isOff) {
    fail(
      `Give exactly one of --${name} and --${name}-off.`,
      `use --${name} <snake_name> or --${name}-off <reason>`
    );
  }
};

const mcpBinding = (context: PlanContext): McpBinding => {
  const { args, names } = context;

  refuseBoth(args, "mcp");

  const off = stringFlag(args, "mcp-off");

  if (off !== null) {
    return { off: offReason("mcp-off", off, names) };
  }

  if (isRunControl(names)) {
    fail(
      "A runs action that starts, steers or stops a run has no MCP tool.",
      "use --mcp-off run-control"
    );
  }

  const name = required(args, "mcp");

  if (context.isRestamp) {
    return { name };
  }

  return { name: checkToolName("mcp", name, context) };
};

const agentBinding = (context: PlanContext): AgentBinding => {
  const { args, names } = context;

  refuseBoth(args, "agent");

  const off = stringFlag(args, "agent-off");

  if (off !== null) {
    return { off: offReason("agent-off", off, names) };
  }

  if (isRunControl(names)) {
    fail(
      "A runs action that starts, steers or stops a run has no agent tool.",
      "use --agent-off run-control"
    );
  }

  let agentName = required(args, "agent");

  if (!context.isRestamp && agentName !== stringFlag(args, "mcp")) {
    agentName = checkToolName("agent", agentName, context);
  }

  return {
    lean: hasFlag(args, "agent-lean"),
    name: agentName,
    set: oneOf("agent-set", required(args, "agent-set"), AGENT_SETS),
    short: checkText("agent-short", required(args, "agent-short"), {
      max: 160,
      min: 20,
    }),
  };
};

const errorRef = async (domain: string, tag: string): Promise<ErrorRef> => {
  const file = `${kebab(tag)}.ts`;

  if (await exists(path.join(ACTION_ROOT, "_core/errors", file))) {
    return { name: tag, owner: "core" };
  }

  if (await exists(path.join(ACTION_ROOT, domain, "errors", file))) {
    return { name: tag, owner: "domain" };
  }

  return fail(
    `The error "${tag}" has no file in _core/errors or ${domain}/errors.`,
    `pnpm run new:error ${domain} ${tag} --status <code>`
  );
};

const errorRefs = (args: ParsedArgs, domain: string): Promise<ErrorRef[]> => {
  const tags = [...new Set([...listFlag(args, "errors"), "NotImplemented"])];

  return Promise.all(tags.map((tag) => errorRef(domain, tag)));
};

const checkInvalidates = (context: PlanContext): readonly string[] => {
  const ids = listFlag(context.args, "invalidates");
  const known = new Set(context.index.actions.map((action) => action.id));

  for (const id of ids) {
    if (!known.has(id)) {
      fail(
        `The action "${id}" in --invalidates does not exist.`,
        "list only read action ids that exist"
      );
    }
  }

  return ids;
};

const checkUnique = (context: PlanContext, route: string): void => {
  if (context.isRestamp) {
    return;
  }

  for (const known of context.index.actions) {
    if (known.id === context.names.id) {
      fail(
        `The action ${known.id} exists in ${known.file}.`,
        `pnpm run new:action --remove ${context.names.domain} ${context.names.verb}`
      );
    }

    if (known.route === route) {
      fail(
        `The route ${route} is used by ${known.id}.`,
        "pick another --method or --path"
      );
    }
  }
};

const checkFeature = async (args: ParsedArgs): Promise<string | null> => {
  const feature = stringFlag(args, "ui");

  if (feature === null) {
    return null;
  }

  const dir = path.join(STAMP_ROOT, "apps/desktop/src/ui/features", feature);

  if (!(await exists(dir))) {
    fail(
      `The feature apps/desktop/src/ui/features/${feature}/ does not exist.`,
      `pnpm run new:feature ${feature}`
    );
  }

  return feature;
};

const checkDomainFolder = async (domain: string): Promise<void> => {
  if (!(await exists(path.join(ACTION_ROOT, domain)))) {
    fail(
      "The domain does not exist.",
      `pnpm run new:domain ${domain} (merge step only)`
    );
  }
};

const editWarnings = (
  access: Access,
  invalidates: readonly string[]
): string[] => {
  if (access !== "read" && invalidates.length === 0) {
    return [
      "warning: this action changes data but lists no ids in --invalidates.",
    ];
  }

  return [];
};

const planAction = async (context: PlanContext): Promise<ActionPlan> => {
  const { args, names } = context;

  await checkDomainFolder(names.domain);

  const level = oneOf("access", required(args, "access"), ACCESS) as Access;
  const scopeKind = oneOf("scope", required(args, "scope"), SCOPES) as Scope;
  const method = pickMethod(args, level);
  const route = checkPath(required(args, "path"));

  checkUnique(context, `${method} ${route}`);

  const confirmMode = await checkNeeds(
    required(args, "needs"),
    level,
    stringFlag(args, "confirm")
  );

  const invalidateIds = checkInvalidates(context);

  const definition: ActionDefinitionSpec = {
    access: level,
    agent: agentBinding(context),
    confirm: confirmMode,
    description: checkText("description", required(args, "description"), {
      max: 600,
      min: 20,
    }),
    errors: await errorRefs(args, names.domain),
    http: { method, path: route },
    input: await inputFields(route, scopeKind),
    invalidates: invalidateIds,
    isList: hasFlag(args, "list"),
    mcp: mcpBinding(context),
    names: context.names,
    needs: required(args, "needs"),
    output: [],
    scope: scopeKind,
  };

  return {
    definition,
    feature: await checkFeature(args),
    warnings: editWarnings(level, invalidateIds),
  };
};

export { exists, planAction };

export type { ActionPlan, PlanContext };

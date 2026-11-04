import { AllActions } from "@design-studio/actions";
import type { AnyAction } from "@design-studio/actions/_core/action";
import { Forbidden } from "@design-studio/actions/_core/errors/forbidden";
import { Effect, Schema } from "effect";
import type { JsonSchema } from "effect";

import type { AgentArgs } from "../agent-tools/registry.js";
import { actionDeniedMessage } from "../agent/ask-gate.js";
import type { ActionAsk } from "../agent/ask-gate.js";
import type { Entries } from "../handlers/_core/handler.js";
import { allowAll, makeRunner } from "../handlers/_core/run-action.js";
import type { Gate, Runner, WireArgs } from "../handlers/_core/run-action.js";
import { ALL_ENTRIES } from "../handlers/all-entries.generated.js";
import type { StudioRuntime } from "../main/runtime.js";
import { runAsAgent } from "../platform/call-origin/index.js";
import { toLegacyPrincipal } from "../store/principal.js";
import type { Principal } from "../store/principal.js";
import type { ApprovalQueue } from "./approvals.js";
import { toLegacyArgs, toLegacySchema } from "./legacy-args.js";
import { toToolResult } from "./tool-result.js";
import type { ActionExit, TextResult } from "./tool-result.js";
import type { ToolDef } from "./tool-types.js";

type Group = Readonly<Record<string, AnyAction>>;

type Domain = keyof typeof AllActions;

interface RuntimeDeps {
  readonly runtime?: StudioRuntime | null | undefined;
}

interface GateDeps {
  readonly approvals?: ApprovalQueue | null | undefined;
}

type CallById = (action: AnyAction, args: AgentArgs) => Promise<TextResult>;

interface ActionRunner {
  readonly action: AnyAction;
  readonly run: Runner;
}

interface ActionTool extends ActionRunner {
  readonly def: ToolDef;
}

const RUNTIME_OFF =
  "The studio runtime is not ready, so this tool is not available. Restart Design Studio.";

const EDITS_OFF_TEXT =
  "Allow edits is off in Design Studio, so this tool is not available. The user can turn it on in Export > Connect to Claude Code. Then reconnect the MCP server.";

const DROPPED_KEYS: ReadonlySet<string> = new Set(["$schema", "not"]);

const toInputSchema = (action: AnyAction): JsonSchema.JsonSchema => {
  const jsonSchemaDocument = Schema.toJsonSchemaDocument(action.input, {
    onExcessProperty: "error",
  });

  const kept = Object.entries(jsonSchemaDocument.schema).filter(
    ([key]) => !DROPPED_KEYS.has(key)
  );

  const base = { properties: {}, type: "object", ...Object.fromEntries(kept) };

  if (Object.keys(jsonSchemaDocument.definitions).length === 0) {
    return base;
  }

  return { ...base, $defs: jsonSchemaDocument.definitions };
};

const LEGACY_DESTRUCTIVE: ReadonlySet<string> = new Set([
  "remove_link",
  "restore_version",
]);

const toToolDef = (action: AnyAction, toolName: string): ToolDef => ({
  annotations: {
    destructiveHint:
      action.access === "destructive" || LEGACY_DESTRUCTIVE.has(toolName),
    idempotentHint: action.access === "read",
    openWorldHint: false,
    readOnlyHint: action.access === "read",
  },
  description: action.description,
  inputSchema: toLegacySchema(
    toolName,
    action.http.path.includes(":directionId"),
    toInputSchema(action)
  ),
  name: toolName,
  title: action.id,
});

const runnersOf = (actions: Group, entries: Entries<Group>): ActionRunner[] =>
  Object.keys(actions).flatMap((key) => {
    const action = actions[key];
    const entry = entries[key];

    if (!action || !entry) {
      return [];
    }

    return [{ action, run: makeRunner(action, entry, allowAll) }];
  });

const ACTION_RUNNERS: readonly ActionRunner[] = (
  Object.keys(AllActions) as Domain[]
).flatMap((domain) =>
  runnersOf(AllActions[domain], ALL_ENTRIES[domain] as Entries<Group>)
);

const RUNNERS_BY_ID: ReadonlyMap<string, ActionRunner> = new Map(
  ACTION_RUNNERS.map((runner) => [runner.action.id, runner])
);

const toActionTool = (runner: ActionRunner): ActionTool[] => {
  if (!("name" in runner.action.mcp)) {
    return [];
  }

  return [{ ...runner, def: toToolDef(runner.action, runner.action.mcp.name) }];
};

const buildMcpTools = (): readonly ActionTool[] =>
  ACTION_RUNNERS.flatMap((runner) => toActionTool(runner));

const ACTION_TOOLS = buildMcpTools();

const ACTION_TOOLS_BY_NAME: ReadonlyMap<string, ActionTool> = new Map(
  ACTION_TOOLS.map((tool) => [tool.def.name, tool])
);

const ACTION_READ_TOOLS: readonly ToolDef[] = ACTION_TOOLS.flatMap((tool) => {
  if (tool.action.access === "read") {
    return [tool.def];
  }

  return [];
});

const ACTION_EDIT_TOOLS: readonly ToolDef[] = ACTION_TOOLS.flatMap((tool) => {
  if (tool.action.access === "read") {
    return [];
  }

  return [tool.def];
});

const isActionTool = (name: string): boolean => ACTION_TOOLS_BY_NAME.has(name);

const isReadActionTool = (name: string): boolean =>
  ACTION_TOOLS_BY_NAME.get(name)?.action.access === "read";

const GATE_TEXT = {
  closed:
    "Design Studio is not open, so nobody can approve this action. Open the Design Studio window, then call the tool again.",
  deny: "The user denied this action in Design Studio.",
  timeout:
    "Nobody answered the approval prompt in Design Studio in time, so it was refused. Ask the user to watch for the prompt, then call the tool again.",
} as const;

const NO_GATE =
  "This action needs the user to allow it in Design Studio, and this caller has no approval prompt. Ask the user to do it in Design Studio.";

const refuseAll: Gate = () =>
  Effect.fail(new Forbidden({ message: NO_GATE, perm: "confirm" }));

const askGate =
  (
    approvals: ApprovalQueue,
    tool: string,
    client: string,
    projectId: string | null
  ): Gate =>
  (card) =>
    Effect.flatMap(
      Effect.promise(() => approvals.ask({ ...card, client, projectId, tool })),
      (outcome) => {
        if (outcome === "allow") {
          return Effect.void;
        }

        return Effect.fail(
          new Forbidden({ message: GATE_TEXT[outcome], perm: "confirm" })
        );
      }
    );

const toProjectId = (args: WireArgs): string | null => {
  const value = args["projectId"] ?? null;

  if (value === null || value === "") {
    return null;
  }

  return String(value);
};

const gateOf = (
  gates: GateDeps | null,
  tool: string,
  client: string,
  projectId: string | null
): Gate => {
  const approvals = gates?.approvals ?? null;

  if (approvals === null) {
    return refuseAll;
  }

  return askGate(approvals, tool, client, projectId);
};

interface McpCaller {
  readonly client: string;
  readonly edits: GateDeps | null;
  readonly principal: Principal;
}

interface ActionRun {
  readonly gate: Gate;
  readonly principal: Principal;
}

const runActionTool = async (
  runtime: StudioRuntime,
  tool: ActionRunner,
  args: WireArgs,
  context: ActionRun
): Promise<TextResult> => {
  const program = tool.run(args, context.principal, "json", context.gate);

  return toToolResult(tool.action, await runtime.runPromiseExit(program));
};

const refuse = (text: string): Promise<TextResult> =>
  Promise.resolve({ content: [{ text, type: "text" }], isError: true });

const MAIN_DIRECTION = "main";

const toMainDirection = (tool: ActionRunner, args: WireArgs): WireArgs => {
  const takesDirection = tool.action.http.path.includes(":directionId");

  if (!takesDirection || "directionId" in args) {
    return args;
  }

  return { ...args, directionId: MAIN_DIRECTION };
};

const callActionTool = (
  deps: RuntimeDeps,
  name: string,
  args: WireArgs,
  caller: McpCaller
): Promise<TextResult> => {
  const { edits } = caller;
  const tool = ACTION_TOOLS_BY_NAME.get(name);
  const runtime = deps.runtime ?? null;

  if (!tool) {
    return refuse(`unknown tool ${name}`);
  }

  if (edits === null && tool.action.access !== "read") {
    return refuse(EDITS_OFF_TEXT);
  }

  if (runtime === null) {
    return refuse(RUNTIME_OFF);
  }

  const legacy = toLegacyArgs(
    { action: tool.action, name },
    args,
    caller.client
  );

  return runActionTool(runtime, tool, toMainDirection(tool, legacy), {
    gate: gateOf(edits, name, caller.client, toProjectId(legacy)),
    principal: caller.principal,
  });
};

const agentGate =
  (ask: ActionAsk, tool: string, args: WireArgs): Gate =>
  (card) =>
    Effect.flatMap(
      Effect.promise(() => ask(tool, args, card)),
      (decision) => {
        if (decision.allow) {
          return Effect.void;
        }

        return Effect.fail(
          new Forbidden({
            message: actionDeniedMessage(decision),
            perm: "confirm",
          })
        );
      }
    );

const callerGate = (
  ask: ActionAsk | null,
  action: AnyAction,
  args: WireArgs
): Gate => {
  if (ask === null) {
    return refuseAll;
  }

  if ("name" in action.agent) {
    return agentGate(ask, action.agent.name, args);
  }

  return agentGate(ask, action.id, args);
};

const SCOPE_KEYS = ["directionId", "projectId"] as const;

interface RunScope {
  readonly directionId: string;
  readonly projectId: string;
}

const toScopedArgs = (
  action: AnyAction,
  args: WireArgs,
  scope: RunScope | null
): WireArgs => {
  if (scope === null) {
    return args;
  }

  const fields = new Set(Object.keys(action.input.fields));

  const scoped = SCOPE_KEYS.flatMap((key) => {
    if (!fields.has(key)) {
      return [];
    }

    return [[key, scope[key]]];
  });

  return { ...args, ...Object.fromEntries(scoped) };
};

const actionCaller = (
  runtime: StudioRuntime | null | undefined,
  principal: Principal = toLegacyPrincipal(),
  ask: ActionAsk | null = null,
  scope: RunScope | null = null
): CallById | null => {
  if (!runtime) {
    return null;
  }

  return (action, args) => {
    const runner = RUNNERS_BY_ID.get(action.id);

    if (!runner) {
      return refuse(`unknown action ${action.id}`);
    }

    const scoped = toScopedArgs(action, args as WireArgs, scope);

    const call = (): Promise<TextResult> =>
      runActionTool(runtime, runner, scoped, {
        gate: callerGate(ask, action, scoped),
        principal,
      });

    if (scope === null) {
      return call();
    }

    return runAsAgent(scope, call);
  };
};

const runActionExit = (
  runtime: StudioRuntime,
  action: AnyAction,
  args: WireArgs,
  context: ActionRun
): Promise<ActionExit> => {
  const runner = RUNNERS_BY_ID.get(action.id);

  if (!runner) {
    return Promise.reject(new Error(`unknown action ${action.id}`));
  }

  return runtime.runPromiseExit(
    runner.run(args, context.principal, "json", context.gate)
  );
};

const isKnownTool = (tools: readonly ToolDef[], name: string): boolean =>
  isActionTool(name) || tools.some((tool) => tool.name === name);

const listActionTools = (
  readTools: readonly ToolDef[],
  editTools: readonly ToolDef[],
  edits: GateDeps | null
): ToolDef[] => {
  const reads = [...readTools, ...ACTION_READ_TOOLS];

  if (edits !== null) {
    return [...reads, ...editTools];
  }

  return reads;
};

const ActionTools = {
  call: callActionTool,
  isAction: isActionTool,
  isKnown: isKnownTool,
  isRead: isReadActionTool,
  list: listActionTools,
} as const;

interface RunCallerDeps {
  readonly actionAsk?: ActionAsk | null;
  readonly ctx: {
    readonly direction: { readonly id: string };
    readonly project: { readonly id: string };
  };
  readonly runtime?: StudioRuntime | null;
}

const runActionCaller = (deps: RunCallerDeps): CallById | null =>
  actionCaller(deps.runtime, toLegacyPrincipal(), deps.actionAsk ?? null, {
    directionId: deps.ctx.direction.id,
    projectId: deps.ctx.project.id,
  });

export {
  ACTION_EDIT_TOOLS,
  actionCaller,
  runActionCaller,
  ActionTools,
  ACTION_READ_TOOLS,
  buildMcpTools,
  callActionTool,
  isActionTool,
  isKnownTool,
  isReadActionTool,
  listActionTools,
  gateOf,
  runActionExit,
  toInputSchema,
  toProjectId,
};

export type {
  ActionRunner,
  ActionTool,
  CallById,
  GateDeps,
  McpCaller,
  RuntimeDeps,
};

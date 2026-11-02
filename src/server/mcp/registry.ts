import { Effect, Exit, Schema } from "effect";
import type { JsonSchema } from "effect";

import type { AnyAction } from "../../shared/actions/_core/action.js";
import type { StudioError } from "../../shared/actions/_core/errors/all.js";
import { Forbidden } from "../../shared/actions/_core/errors/forbidden.js";
import { AllActions } from "../../shared/actions/index.js";
import type { Entries } from "../handlers/_core/handler.js";
import { allowAll, makeRunner } from "../handlers/_core/run-action.js";
import type { Gate, Runner, WireArgs } from "../handlers/_core/run-action.js";
import { ALL_ENTRIES } from "../handlers/all-entries.generated.js";
import { failureOf, toWireError } from "../http/wire-error.js";
import type { StudioRuntime } from "../main/runtime.js";
import { toLegacyPrincipal } from "../store/local-principal.js";
import type { ApprovalQueue } from "./approvals.js";
import type { ToolDef } from "./tools.js";

type Group = Readonly<Record<string, AnyAction>>;

type Domain = keyof typeof AllActions;

type ActionExit = Exit.Exit<object, StudioError>;

interface RuntimeDeps {
  readonly runtime?: StudioRuntime | null | undefined;
}

interface GateDeps {
  readonly approvals?: ApprovalQueue | null | undefined;
}

interface TextResult {
  readonly content: { readonly text: string; readonly type: "text" }[];
  readonly isError: boolean;
}

type CallById = (action: AnyAction, args: WireArgs) => Promise<TextResult>;

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
  const document = Schema.toJsonSchemaDocument(action.input, {
    onExcessProperty: "error",
  });

  const kept = Object.entries(document.schema).filter(
    ([key]) => !DROPPED_KEYS.has(key)
  );

  const base = { properties: {}, type: "object", ...Object.fromEntries(kept) };

  if (Object.keys(document.definitions).length === 0) {
    return base;
  }

  return { ...base, $defs: document.definitions };
};

const toToolDef = (action: AnyAction, toolName: string): ToolDef => ({
  annotations: {
    destructiveHint: action.access === "destructive",
    idempotentHint: action.access === "read",
    openWorldHint: false,
    readOnlyHint: action.access === "read",
  },
  description: action.description,
  inputSchema: toInputSchema(action),
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

const textResult = (text: string, isError: boolean): TextResult => ({
  content: [{ text, type: "text" }],
  isError,
});

const toToolResult = (exit: ActionExit): TextResult => {
  if (Exit.isSuccess(exit)) {
    return textResult(JSON.stringify(exit.value), false);
  }

  const wire = toWireError(failureOf(exit));

  return textResult(JSON.stringify(wire.body), true);
};

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
  (approvals: ApprovalQueue, tool: string): Gate =>
  (card) =>
    Effect.flatMap(
      Effect.promise(() =>
        approvals.ask({ ...card, client: "mcp", projectId: null, tool })
      ),
      (outcome) => {
        if (outcome === "allow") {
          return Effect.void;
        }

        return Effect.fail(
          new Forbidden({ message: GATE_TEXT[outcome], perm: "confirm" })
        );
      }
    );

const gateOf = (gates: GateDeps | null, tool: string): Gate => {
  const approvals = gates?.approvals ?? null;

  if (approvals === null) {
    return refuseAll;
  }

  return askGate(approvals, tool);
};

const runActionTool = async (
  runtime: StudioRuntime,
  tool: ActionRunner,
  args: WireArgs,
  gate: Gate
): Promise<TextResult> => {
  const program = tool.run(args, toLegacyPrincipal(), "json", gate);

  return toToolResult(await runtime.runPromiseExit(program));
};

const refuse = (text: string): Promise<TextResult> =>
  Promise.resolve({ content: [{ text, type: "text" }], isError: true });

const callActionTool = (
  deps: RuntimeDeps,
  name: string,
  args: WireArgs,
  edits: GateDeps | null
): Promise<TextResult> => {
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

  return runActionTool(runtime, tool, args, gateOf(edits, name));
};

const actionCaller = (
  runtime: StudioRuntime | null | undefined
): CallById | null => {
  if (!runtime) {
    return null;
  }

  return (action, args) => {
    const runner = RUNNERS_BY_ID.get(action.id);

    if (!runner) {
      return refuse(`unknown action ${action.id}`);
    }

    return runActionTool(runtime, runner, args, refuseAll);
  };
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
  list: listActionTools,
} as const;

export {
  ACTION_EDIT_TOOLS,
  actionCaller,
  ActionTools,
  ACTION_READ_TOOLS,
  buildMcpTools,
  callActionTool,
  isActionTool,
  isKnownTool,
  isReadActionTool,
  listActionTools,
  toInputSchema,
  toToolResult,
};

export type {
  ActionExit,
  ActionRunner,
  ActionTool,
  CallById,
  GateDeps,
  RuntimeDeps,
  TextResult,
};

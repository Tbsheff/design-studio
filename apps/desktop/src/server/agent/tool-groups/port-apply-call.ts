import { applyPort } from "@design-studio/actions/port/apply";
import { PORT_TASK } from "@design-studio/contracts/port";
import { Schema } from "effect";

import type {
  AgentArgs,
  AgentTool,
  CallAction,
} from "../../agent-tools/registry.js";
import { runConfirmedAgentTool } from "../../mcp/index.js";
import { runActionCaller } from "../../mcp/registry.js";
import { toPortCheckRef } from "../port-review.js";
import type { PortCheckRef } from "../port-review.js";
import type { StudioToolDeps } from "../tools.js";

type PortCallDeps = Pick<StudioToolDeps, "actionAsk" | "ctx" | "runtime">;

interface PortApplyArgs {
  readonly directionId: string;
  readonly path: string;
  readonly projectId: string;
  readonly routePath: string;
  readonly targetProjectId: string;
}

const APPLY_TOOL = "apply_port";

const PORT_RUN_FIELDS: ReadonlySet<string> = new Set(["routePath"]);

const isText = Schema.is(Schema.NonEmptyString);

const toPortRunRef = (deps: PortCallDeps): PortCheckRef | null => {
  if (deps.ctx.request.task !== PORT_TASK) {
    return null;
  }

  return toPortCheckRef(deps.ctx.request.prompt);
};

const toRoutePath = (
  ref: PortCheckRef,
  routePath: AgentArgs[string]
): string => {
  if (isText(routePath)) {
    return routePath;
  }

  return ref.routePath;
};

const toApplyArgs = (
  ref: PortCheckRef,
  runProjectId: string,
  args: AgentArgs
): PortApplyArgs => ({
  directionId: ref.directionId,
  path: ref.path,
  projectId: ref.projectId,
  routePath: toRoutePath(ref, args["routePath"]),
  targetProjectId: runProjectId,
});

const toPortRunCaller = (deps: PortCallDeps): CallAction | null => {
  const base = runActionCaller(deps);
  const ref = toPortRunRef(deps);
  const { runtime } = deps;

  if (base === null || ref === null || !runtime) {
    return base;
  }

  return (action, args) => {
    if (action.id !== applyPort.id) {
      return base(action, args);
    }

    return runConfirmedAgentTool(
      runtime,
      APPLY_TOOL,
      { args: { ...toApplyArgs(ref, deps.ctx.project.id, args) } },
      { directionId: deps.ctx.direction.id, projectId: deps.ctx.project.id }
    );
  };
};

const toPortRunTool = (deps: PortCallDeps, entry: AgentTool): AgentTool => {
  if (entry.name !== APPLY_TOOL || toPortRunRef(deps) === null) {
    return entry;
  }

  return {
    ...entry,
    inputSchema: Object.fromEntries(
      Object.entries(entry.inputSchema).filter(([key]) =>
        PORT_RUN_FIELDS.has(key)
      )
    ),
  };
};

export { toPortRunCaller, toPortRunTool };

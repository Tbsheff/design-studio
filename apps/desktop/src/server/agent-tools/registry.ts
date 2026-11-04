import type {
  SdkMcpToolDefinition,
  tool as sdkTool,
} from "@anthropic-ai/claude-agent-sdk";

import type {
  AgentBinding,
  AnyAction,
} from "../../shared/actions/_core/action.js";
import { AllActions } from "../../shared/actions/index.js";
import { toSdkFields } from "./sdk-shape.js";
import type { SdkFields } from "./sdk-shape.js";

type ToolFn = typeof sdkTool;

type AgentTool = SdkMcpToolDefinition<SdkFields>;

type AgentResult = Awaited<ReturnType<AgentTool["handler"]>>;

type AgentArgs = Parameters<AgentTool["handler"]>[0];

type CallAction = (action: AnyAction, args: AgentArgs) => Promise<AgentResult>;

interface AgentAction {
  readonly action: AnyAction;
  readonly binding: AgentBinding;
  readonly fields: SdkFields;
}

const toAgentAction = (action: AnyAction): AgentAction[] => {
  if (!("name" in action.agent)) {
    return [];
  }

  return [{ action, binding: action.agent, fields: toSdkFields(action) }];
};

const AGENT_ACTIONS: readonly AgentAction[] = Object.values(AllActions).flatMap(
  (group) =>
    Object.values(group).flatMap((action: AnyAction) => toAgentAction(action))
);

const AGENT_ACTION_NAMES: ReadonlySet<string> = new Set(
  AGENT_ACTIONS.map((entry) => entry.binding.name)
);

const toAgentTool = (
  call: CallAction,
  toolFn: ToolFn,
  entry: AgentAction
): AgentTool =>
  toolFn(
    entry.binding.name,
    entry.binding.short,
    entry.fields,
    (args) => call(entry.action, args),
    {
      annotations: {
        destructiveHint: entry.action.access === "destructive",
        readOnlyHint: entry.action.access === "read",
      },
    }
  );

const buildAgentTools = (
  call: CallAction | null,
  toolFn: ToolFn
): AgentTool[] => {
  if (call === null) {
    return [];
  }

  return AGENT_ACTIONS.map((entry) => toAgentTool(call, toolFn, entry));
};

export { AGENT_ACTION_NAMES, buildAgentTools };

export type { AgentArgs, AgentResult, AgentTool, CallAction };

import { AllActions } from "@design-studio/actions";
import type { AnyAction } from "@design-studio/actions/_core/action";
import { Schema } from "effect";

import { TARGET_SCOPED_ACTIONS } from "../agent-tools/index.js";
import type { ActionAsk } from "../agent/ask-gate.js";
import { runAsAgent } from "../platform/call-origin/index.js";
import { toLegacyPrincipal } from "../store/index.js";
import { actionCaller, runActionCaller } from "./registry.js";
import type { CallById } from "./registry.js";
import type { TextResult } from "./tool-result.js";

type AgentRuntime = NonNullable<Parameters<typeof actionCaller>[0]>;

type AgentCallArgs = Readonly<Record<string, Schema.Json>>;

const MAIN_DIRECTION = "main";

const RUNTIME_OFF =
  "The studio runtime is not ready, so the agent tools are not available. Restart Design Studio.";

const BAD_BODY = "Send the body as {args: {...}} with the tool input.";

const AgentCallSchema = Schema.Struct({
  args: Schema.Record(Schema.String, Schema.Json),
});

const isAgentCall = Schema.is(AgentCallSchema);

const isText = Schema.is(Schema.NonEmptyString);

const toAllowAnswer: ActionAsk = () => Promise.resolve({ allow: true });

interface ConfirmedScope {
  readonly directionId: string;
  readonly projectId: string;
}

const toAgentEntries = (
  action: AnyAction
): (readonly [string, AnyAction])[] => {
  if (!("name" in action.agent)) {
    return [];
  }

  return [[action.agent.name, action]];
};

const AGENT_ACTIONS: ReadonlyMap<string, AnyAction> = new Map(
  Object.values(AllActions).flatMap((group) =>
    Object.values(group).flatMap((action: AnyAction) => toAgentEntries(action))
  )
);

const toRefusal = (text: string): TextResult => ({
  content: [{ text, type: "text" }],
  isError: true,
});

const toDirectionId = (args: AgentCallArgs): string => {
  const { directionId } = args;

  if (isText(directionId)) {
    return directionId;
  }

  return MAIN_DIRECTION;
};

const toScopeProjectId = (
  action: AnyAction,
  args: AgentCallArgs
): Schema.Json | null => {
  const { projectId, targetProjectId } = args;

  if (TARGET_SCOPED_ACTIONS.has(action.id)) {
    return targetProjectId ?? null;
  }

  return projectId ?? null;
};

const toAgentCaller = (
  runtime: AgentRuntime,
  action: AnyAction,
  args: AgentCallArgs,
  ask: ActionAsk | null
): CallById | null => {
  const projectId = toScopeProjectId(action, args);

  if (!isText(projectId)) {
    return actionCaller(runtime);
  }

  return runActionCaller({
    actionAsk: ask,
    ctx: {
      direction: { id: toDirectionId(args) },
      project: { id: projectId },
    },
    runtime,
  });
};

const runAskedAgentTool = (
  runtime: AgentRuntime,
  name: string,
  body: AgentCallArgs,
  ask: ActionAsk | null
): Promise<TextResult> => {
  const action = AGENT_ACTIONS.get(name) ?? null;

  if (action === null) {
    return Promise.resolve(toRefusal(`No agent tool has the name ${name}.`));
  }

  if (!isAgentCall(body)) {
    return Promise.resolve(toRefusal(BAD_BODY));
  }

  const { args } = body;
  const caller = toAgentCaller(runtime, action, args, ask);

  if (caller === null) {
    return Promise.resolve(toRefusal(RUNTIME_OFF));
  }

  return caller(action, args);
};

const runAgentTool = (
  runtime: AgentRuntime,
  name: string,
  body: AgentCallArgs
): Promise<TextResult> => runAskedAgentTool(runtime, name, body, null);

const runGatedAgentTool = (
  runtime: AgentRuntime,
  name: string,
  body: AgentCallArgs,
  ask: ActionAsk
): Promise<TextResult> => runAskedAgentTool(runtime, name, body, ask);

const runConfirmedAgentTool = (
  runtime: AgentRuntime,
  name: string,
  body: AgentCallArgs,
  scope: ConfirmedScope
): Promise<TextResult> => {
  const action = AGENT_ACTIONS.get(name) ?? null;

  if (action === null) {
    return Promise.resolve(toRefusal(`No agent tool has the name ${name}.`));
  }

  if (!isAgentCall(body)) {
    return Promise.resolve(toRefusal(BAD_BODY));
  }

  const caller = actionCaller(
    runtime,
    toLegacyPrincipal(),
    toAllowAnswer,
    null
  );

  if (caller === null) {
    return Promise.resolve(toRefusal(RUNTIME_OFF));
  }

  const { args } = body;

  return runAsAgent(scope, () => caller(action, args));
};

export { runAgentTool, runConfirmedAgentTool, runGatedAgentTool };

export type { ConfirmedScope };

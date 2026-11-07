import { AllActions } from "@design-studio/actions";
import type { AnyAction } from "@design-studio/actions/_core/action";
import { Option, Schema } from "effect";

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

const readAgentCall = Schema.decodeUnknownOption(AgentCallSchema);

const isText = Schema.is(Schema.NonEmptyString);

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

const toAgentCaller = (
  runtime: AgentRuntime,
  args: AgentCallArgs
): CallById | null => {
  const { projectId } = args;

  if (!isText(projectId)) {
    return actionCaller(runtime);
  }

  return runActionCaller({
    ctx: {
      direction: { id: toDirectionId(args) },
      project: { id: projectId },
    },
    runtime,
  });
};

const runAgentTool = (
  runtime: AgentRuntime,
  name: string,
  body: Schema.Json
): Promise<TextResult> => {
  const action = AGENT_ACTIONS.get(name) ?? null;

  if (action === null) {
    return Promise.resolve(toRefusal(`No agent tool has the name ${name}.`));
  }

  const decoded = readAgentCall(body);

  if (Option.isNone(decoded)) {
    return Promise.resolve(toRefusal(BAD_BODY));
  }

  const { args } = decoded.value;
  const caller = toAgentCaller(runtime, args);

  if (caller === null) {
    return Promise.resolve(toRefusal(RUNTIME_OFF));
  }

  return caller(action, args);
};

export { runAgentTool };

import { setTimeout as sleep } from "node:timers/promises";

import type { PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import type { PermissionDecision } from "@design-studio/contracts";

import type {
  IntegrationGate,
  ToolInput,
} from "../platform/tool-policy/index.js";
import { ASK_TIMEOUT_MS, actionDeniedMessage } from "./ask-gate.js";
import type { PermissionAsk } from "./types.js";

type AskDecision = (request: PermissionAsk) => Promise<PermissionDecision>;

const DETAIL_MAX = 600;

const NO_ANSWER: PermissionDecision = {
  allow: false,
  note: "No answer in time.",
};

const toTimeout = async (
  timeoutMs: number,
  signal: AbortSignal
): Promise<PermissionDecision> => {
  await Promise.allSettled([sleep(timeoutMs, null, { signal })]);

  return NO_ANSWER;
};

const createIntegrationGate = (
  ask: AskDecision,
  timeoutMs: number = ASK_TIMEOUT_MS
): IntegrationGate => {
  const decisions = new Map<string, Promise<PermissionResult>>();

  const decide = async (
    toolName: string,
    toolUseId: string,
    input: ToolInput
  ): Promise<PermissionResult> => {
    const stop = new AbortController();
    const detail = JSON.stringify(input).slice(0, DETAIL_MAX);
    const title = `Run ${toolName}?`;

    const decision = await Promise.race([
      ask({ detail, input, title, toolName, toolUseId }),
      toTimeout(timeoutMs, stop.signal),
    ]);

    stop.abort();

    if (decision.allow) {
      return { behavior: "allow", updatedInput: input };
    }

    return { behavior: "deny", message: actionDeniedMessage(decision) };
  };

  return (toolName, toolUseId, input) => {
    const known = decisions.get(toolUseId);

    if (known) {
      return known;
    }

    const next = decide(toolName, toolUseId, input);
    decisions.set(toolUseId, next);

    return next;
  };
};

export { createIntegrationGate };

import type { PermissionResult } from '@anthropic-ai/claude-agent-sdk';
import type { CommandRules, PermissionAsk } from './lifecycle.js';
import type { PermissionDecision } from '../../shared/contracts.js';

export const ASK_TIMEOUT_MS = 280_000;

import { ruleForCommand } from '../../shared/permissionRules.js';

export type ToolGate = (toolUseId: string, input: Record<string, unknown>) => Promise<PermissionResult>;

export function deniedMessage(decision: Extract<PermissionDecision, { allow: false }>): string {
  const note = decision.note?.trim();
  return note ? `The user denied this command and wrote: ${note}` : 'The user denied this command. Do not run it again; find another way or ask the user.';
}

export function createBashGate(ask: (request: PermissionAsk) => Promise<PermissionDecision>, timeoutMs = ASK_TIMEOUT_MS, rules?: CommandRules): ToolGate {
  const decisions = new Map<string, Promise<PermissionResult>>();
  const decide = async (toolUseId: string, input: Record<string, unknown>): Promise<PermissionResult> => {
    const command = typeof input['command'] === 'string' ? input['command'] : '';
    if (rules && command.trim() !== '' && (await rules.allows(command).catch(() => false))) return { behavior: 'allow', updatedInput: input };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<PermissionDecision>((resolve) => {
      timer = setTimeout(() => resolve({ allow: false, note: 'No answer in time.' }), timeoutMs);
    });
    const decision = await Promise.race([ask({ toolUseId, toolName: 'Bash', input, title: 'Run this command?', detail: command }), timeout]);
    clearTimeout(timer);
    if (decision.allow && rules && decision.always !== undefined && decision.always === ruleForCommand(command)) {
      await rules.remember(decision.always).catch((error: unknown) => console.error('[agent] could not save command rule', error));
    }
    return decision.allow ? { behavior: 'allow', updatedInput: input } : { behavior: 'deny', message: deniedMessage(decision) };
  };
  return (toolUseId, input) => {
    const known = decisions.get(toolUseId);
    if (known) return known;
    const next = decide(toolUseId, input);
    decisions.set(toolUseId, next);
    return next;
  };
}

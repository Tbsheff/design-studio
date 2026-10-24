import { describe, expect, it } from 'vitest';
import type { HookInput } from '@anthropic-ai/claude-agent-sdk';
import { createBashGate } from './ask-gate.js';
import { createCanUseTool, createPreToolUseGuard, type ToolPolicy } from './permissions.js';
import { createInboxHook } from './sdk-driver.js';

const policy: ToolPolicy = { workTree: '/tmp/none', mode: 'edit', allowBash: true, allowInstall: false };
const signal = new AbortController().signal;

describe('Bash ask gate', () => {
  it('asks once per tool call in canUseTool and the PreToolUse hook, and sends the note on deny', async () => {
    let asks = 0;
    const gate = createBashGate(async () => {
      asks += 1;
      return { allow: false, note: 'use npm' };
    });
    const canUse = createCanUseTool(policy, undefined, gate);
    const hook = createPreToolUseGuard(policy, undefined, undefined, undefined, gate);
    const hookResult = await hook({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'ls' }, tool_use_id: 't1' } as unknown as HookInput, 't1', { signal });
    const result = await canUse('Bash', { command: 'ls' }, { signal, toolUseID: 't1' } as Parameters<typeof canUse>[2]);
    expect(asks).toBe(1);
    expect(result).toEqual({ behavior: 'deny', message: 'The user denied this command and wrote: use npm' });
    expect(JSON.stringify(hookResult)).toContain('"permissionDecision":"deny"');
  });

  it('keeps hard denies without a prompt', async () => {
    let asks = 0;
    const gate = createBashGate(async () => {
      asks += 1;
      return { allow: true };
    });
    const result = await createCanUseTool(policy, undefined, gate)('Bash', { command: 'npm install left-pad' }, { signal, toolUseID: 't2' } as never);
    expect(result?.behavior).toBe('deny');
    expect(asks).toBe(0);
  });

  it('denies when nobody answers in time', async () => {
    const gate = createBashGate(() => new Promise(() => undefined), 20);
    expect((await gate('t3', { command: 'ls' })).behavior).toBe('deny');
  });
});

describe('PostToolUse inbox hook', () => {
  it('adds queued messages to the tool result context', async () => {
    const hook = createInboxHook({ inbox: { take: () => [{ id: 'q', text: 'Use serif' }] } });
    const out = await hook({ hook_event_name: 'PostToolUse' } as unknown as HookInput, 't', { signal });
    expect(JSON.stringify(out)).toContain('Use serif');
    const empty = await createInboxHook({ inbox: { take: () => [] } })({ hook_event_name: 'PostToolUse' } as unknown as HookInput, 't', { signal });
    expect(empty).toEqual({});
  });
});

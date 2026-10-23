import { describe, expect, it } from 'vitest';
import type { QualityFinding } from '../../shared/contracts.js';
import { DEFAULT_SETTINGS } from '../../shared/contracts.js';
import { resolveRunConfig } from '../../shared/run-levels.js';
import { checkSteps, continuationPrompt, decideLoop, loopReport, loopsDone, newLoopLog, recordCheck, recordShot, type LoopLog } from './polish-loop.js';

const polish = resolveRunConfig(DEFAULT_SETTINGS, 'polish');
const budget = { spentUsd: 0.3, capUsd: 1.5, continuations: 0 };
const finding = (severity: QualityFinding['severity'], check: QualityFinding['check'] = 'tap-target'): QualityFinding => ({ check, severity, viewport: 'mobile', selector: 'a', source: null, message: `${check} ${severity}` });

function tool(log: LoopLog, name: string): void {
  log.toolOrder.push(name);
}

function check(log: LoopLog, findings: QualityFinding[]): void {
  tool(log, 'mcp__studio__render_check');
  recordCheck(log, findings);
}

function shootAll(log: LoopLog): void {
  for (const viewport of ['mobile', 'tablet', 'desktop'] as const) {
    tool(log, 'mcp__studio__screenshot');
    recordShot(log, viewport);
  }
}

function round(log: LoopLog, findings: QualityFinding[]): void {
  tool(log, 'Edit');
  check(log, findings);
  shootAll(log);
}

describe('polish loop stop rule', () => {
  it('stops clean only when the last check came after the last edit, every size was shot after it, and no high or medium is left', () => {
    const log = newLoopLog();
    check(log, [finding('medium')]);
    shootAll(log);
    round(log, [finding('low')]);
    expect(decideLoop(log, polish, budget)).toEqual({ stop: true, reason: 'clean' });
    expect(loopsDone(log)).toBe(1);
  });

  it('continues when findings remain, when the agent edited after its last check, or when a size was not shot after the edit', () => {
    const log = newLoopLog();
    check(log, [finding('high')]);
    shootAll(log);
    expect(decideLoop(log, polish, budget)).toMatchObject({ stop: false, verified: true, missing: [], blocking: [{ severity: 'high' }] });
    tool(log, 'Edit');
    expect(decideLoop(log, polish, budget)).toMatchObject({ stop: false, verified: false, missing: ['desktop', 'tablet', 'mobile'] });
    check(log, []);
    tool(log, 'mcp__studio__screenshot');
    recordShot(log, 'mobile');
    expect(decideLoop(log, polish, budget)).toMatchObject({ stop: false, verified: true, missing: ['desktop', 'tablet'], blocking: [] });
  });

  it('stops after 3 fix loops even with findings left, but still asks for the checks after the third edit', () => {
    const log = newLoopLog();
    check(log, [finding('medium')]);
    shootAll(log);
    round(log, [finding('medium')]);
    round(log, [finding('medium')]);
    tool(log, 'Edit');
    expect(decideLoop(log, polish, budget)).toMatchObject({ stop: false, verified: false });
    check(log, [finding('medium')]);
    shootAll(log);
    expect(decideLoop(log, polish, budget)).toEqual({ stop: true, reason: 'loops' });
    expect(checkSteps(log).map((step) => step.loop)).toEqual([0, 1, 2, 3]);
  });

  it('stops when less than 20% of the budget is left or the continuation cap is reached', () => {
    const log = newLoopLog();
    check(log, [finding('high')]);
    expect(decideLoop(log, polish, { ...budget, spentUsd: 1.21 })).toEqual({ stop: true, reason: 'budget' });
    expect(decideLoop(log, polish, { ...budget, spentUsd: 1.19 })).toMatchObject({ stop: false });
    expect(decideLoop(log, polish, { ...budget, continuations: 4 })).toEqual({ stop: true, reason: 'continuations' });
  });

  it('never stops for budget when the run has no spending limit', () => {
    const log = newLoopLog();
    check(log, [finding('high')]);
    expect(decideLoop(log, polish, { spentUsd: 50, capUsd: null, continuations: 0 })).toMatchObject({ stop: false });
    expect(decideLoop(log, polish, { spentUsd: 50, capUsd: null, continuations: 4 })).toEqual({ stop: true, reason: 'continuations' });
  });

  it('keeps looping on duplicate-content findings', () => {
    const log = newLoopLog();
    check(log, [finding('medium', 'duplicate-content')]);
    shootAll(log);
    expect(decideLoop(log, polish, budget)).toMatchObject({ stop: false, blocking: [{ check: 'duplicate-content' }] });
  });

  it('does not keep looping on generic-layout or visual-diff notes, and never stops before any check ran', () => {
    const log = newLoopLog();
    expect(decideLoop(log, polish, budget)).toMatchObject({ stop: false, verified: false });
    check(log, [finding('medium', 'generic-layout'), finding('medium', 'visual-diff'), finding('low')]);
    shootAll(log);
    expect(decideLoop(log, polish, budget)).toEqual({ stop: true, reason: 'clean' });
  });
});

describe('continuation prompt and report', () => {
  it('lists the missing checks and the remaining findings, and asks for a per-loop reply', () => {
    const log = newLoopLog();
    check(log, [finding('high'), finding('medium', 'a11y')]);
    tool(log, 'Edit');
    const decision = decideLoop(log, polish, budget);
    if (decision.stop) throw new Error('expected continue');
    const text = continuationPrompt(decision, log);
    expect(text).toMatch(/^<studio-continue>\nThe run is not finished\. Fix loops done: 0 of 3\./);
    expect(text).toContain('You edited after your last render_check');
    expect(text).toContain('at: desktop, tablet, mobile');
    const verified = newLoopLog();
    check(verified, [finding('high'), finding('medium', 'a11y')]);
    shootAll(verified);
    const next = decideLoop(verified, polish, budget);
    if (next.stop) throw new Error('expected continue');
    const listed = continuationPrompt(next, verified);
    expect(listed).toContain('- [high] tap-target @mobile: tap-target high');
    expect(listed).toContain('- [medium] a11y @mobile: a11y medium');
    expect(listed).toContain('findings per loop');
  });

  it('tells the agent not to edit when the loops are used up', () => {
    const log = newLoopLog();
    check(log, [finding('medium')]);
    round(log, [finding('medium')]);
    round(log, [finding('medium')]);
    round(log, [finding('medium')]);
    tool(log, 'Edit');
    const decision = decideLoop(log, polish, budget);
    if (decision.stop) throw new Error('expected continue');
    const text = continuationPrompt(decision, log);
    expect(text).toContain('No fix loops are left. Do not edit again');
    expect(text).not.toContain('These high and medium findings remain');
  });

  it('reports loops, findings per check and the stop reason', () => {
    const log = newLoopLog();
    check(log, [finding('high'), finding('low')]);
    shootAll(log);
    round(log, []);
    expect(loopReport(log, 'clean', 1)).toBe('Studio check log: 1 fix loop(s), 1 studio continuation(s). Checks: start 1 high / 0 medium / 1 low; loop 1 0 high / 0 medium / 0 low. Stopped: no high or medium findings left. 0 blocking high or medium finding(s) left (generic-layout and visual-diff do not block).');
  });
});

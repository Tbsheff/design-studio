import type { CheckViewport, QualityFinding, QualitySeverity } from '../../shared/contracts.js';
import type { ResolvedRunConfig } from '../../shared/run-levels.js';
import { EDIT_ELEMENT_TOOL, SET_TOKEN_TOOL } from './permissions.js';

const EDIT_TOOL_NAMES = new Set(['Write', 'Edit', 'MultiEdit', EDIT_ELEMENT_TOOL, SET_TOKEN_TOOL]);
export const MAX_FIX_LOOPS = 3;
const MIN_BUDGET_LEFT = 0.2;
const MAX_CONTINUATIONS = 4;
const LISTED_FINDINGS = 8;

export interface CheckRecord {
  at: number;
  counts: Record<QualitySeverity, number>;
  blocking: QualityFinding[];
}

export interface ShotRecord {
  at: number;
  viewport: CheckViewport;
}

export interface LoopLog {
  toolOrder: string[];
  checks: CheckRecord[];
  shots: ShotRecord[];
}

export function newLoopLog(): LoopLog {
  return { toolOrder: [], checks: [], shots: [] };
}

export function isBlocking(finding: QualityFinding): boolean {
  return (finding.severity === 'high' || finding.severity === 'medium') && finding.check !== 'generic-layout' && finding.check !== 'visual-diff';
}

export function recordCheck(log: LoopLog, findings: QualityFinding[]): CheckRecord {
  const counts: Record<QualitySeverity, number> = { high: 0, medium: 0, low: 0 };
  for (const finding of findings) counts[finding.severity] += 1;
  const record = { at: log.toolOrder.length, counts, blocking: findings.filter(isBlocking) };
  log.checks.push(record);
  return record;
}

export function recordShot(log: LoopLog, viewport: CheckViewport): void {
  log.shots.push({ at: log.toolOrder.length, viewport });
}

function lastEditIndex(log: LoopLog): number {
  return log.toolOrder.findLastIndex((name) => EDIT_TOOL_NAMES.has(name));
}

function editBetween(log: LoopLog, from: number, to: number): boolean {
  return log.toolOrder.slice(from, to).some((name) => EDIT_TOOL_NAMES.has(name));
}

interface CheckStep {
  loop: number;
  counts: Record<QualitySeverity, number>;
  blocking: number;
}

export function checkSteps(log: LoopLog): CheckStep[] {
  let loop = 0;
  let previous = 0;
  return log.checks.map((check) => {
    if (editBetween(log, previous, check.at)) loop += 1;
    previous = check.at;
    return { loop, counts: check.counts, blocking: check.blocking.length };
  });
}

export function loopsDone(log: LoopLog): number {
  return checkSteps(log).at(-1)?.loop ?? 0;
}

export function missingShots(log: LoopLog, viewports: readonly CheckViewport[]): CheckViewport[] {
  const after = lastEditIndex(log);
  return viewports.filter((viewport) => !log.shots.some((shot) => shot.viewport === viewport && shot.at > after));
}

function checkedAfterLastEdit(log: LoopLog): boolean {
  const last = log.checks.at(-1);
  return last !== undefined && last.at > lastEditIndex(log);
}

export type StopReason = 'clean' | 'loops' | 'budget' | 'continuations';

export type LoopDecision = { stop: true; reason: StopReason } | { stop: false; missing: CheckViewport[]; blocking: QualityFinding[]; verified: boolean };

interface LoopBudget {
  spentUsd: number;
  capUsd: number | null;
  continuations: number;
}

function budgetLow(budget: LoopBudget): boolean {
  if (budget.capUsd === null) return false;
  const left = budget.capUsd > 0 ? 1 - budget.spentUsd / budget.capUsd : 0;
  return left < MIN_BUDGET_LEFT;
}

export function decideLoop(log: LoopLog, config: ResolvedRunConfig, budget: LoopBudget): LoopDecision {
  if (budgetLow(budget)) return { stop: true, reason: 'budget' };
  if (budget.continuations >= MAX_CONTINUATIONS) return { stop: true, reason: 'continuations' };
  const verified = checkedAfterLastEdit(log);
  const missing = missingShots(log, config.preset.checks.viewports);
  const blocking = verified ? (log.checks.at(-1)?.blocking ?? []) : [];
  const complete = verified && missing.length === 0;
  if (complete && blocking.length === 0) return { stop: true, reason: 'clean' };
  if (complete && loopsDone(log) >= MAX_FIX_LOOPS) return { stop: true, reason: 'loops' };
  return { stop: false, missing, blocking, verified };
}

export function wantsLoop(config: ResolvedRunConfig, mode: string): boolean {
  return mode === 'edit' && config.preset.checks.critic;
}

function findingText(finding: QualityFinding): string {
  return `- [${finding.severity}] ${finding.check}${finding.viewport ? ` @${finding.viewport}` : ''}: ${finding.message}`;
}

export function continuationPrompt(decision: Extract<LoopDecision, { stop: false }>, log: LoopLog): string {
  const done = loopsDone(log);
  const lines = [`<studio-continue>`, `The run is not finished. Fix loops done: ${done} of ${MAX_FIX_LOOPS}.`];
  if (done >= MAX_FIX_LOOPS) lines.push('- No fix loops are left. Do not edit again; only run the checks below.');
  if (!decision.verified) lines.push('- You edited after your last render_check. Run mcp__studio__render_check again.');
  if (decision.missing.length) lines.push(`- Take screenshots from=0 after your last edit at: ${decision.missing.join(', ')}. Look at every image.`);
  if (decision.blocking.length && done < MAX_FIX_LOOPS) {
    lines.push(`- These high and medium findings remain. Fix them with Edit, then run render_check and all screenshots again:`);
    lines.push(...decision.blocking.slice(0, LISTED_FINDINGS).map(findingText));
  }
  lines.push('Then reply with the loops run, the findings per loop, and what is left.', '</studio-continue>');
  return lines.join('\n');
}

function stepLabel(step: CheckStep, index: number): string {
  const name = step.loop === 0 ? (index === 0 ? 'start' : 'recheck') : `loop ${step.loop}`;
  return `${name} ${step.counts.high} high / ${step.counts.medium} medium / ${step.counts.low} low`;
}

const STOP_TEXT: Record<StopReason, string> = {
  clean: 'no high or medium findings left',
  loops: `${MAX_FIX_LOOPS} fix loops done`,
  budget: 'less than 20% of the spending limit left',
  continuations: 'the studio continued the run the maximum number of times',
};

export function loopReport(log: LoopLog, reason: StopReason | null, continuations: number): string {
  const steps = checkSteps(log).map(stepLabel).join('; ') || 'no render_check ran';
  const stop = reason ? `Stopped: ${STOP_TEXT[reason]}.` : 'Stopped before the loop finished.';
  const left = log.checks.at(-1)?.blocking.length ?? 0;
  return `Studio check log: ${loopsDone(log)} fix loop(s), ${continuations} studio continuation(s). Checks: ${steps}. ${stop} ${left} blocking high or medium finding(s) left (generic-layout and visual-diff do not block).`;
}

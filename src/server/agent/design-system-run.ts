import type { DesignSystemCheckResult, DesignSystemRunCheck } from '../../shared/contracts.js';
import { checkDesignSystem } from '../design-system/check.js';
import type { DriverOutcome } from './lifecycle.js';

export const MAX_DESIGN_SYSTEM_ROUNDS = 3;
const LISTED_PROBLEMS = 20;
const ERROR_PROBLEMS = 3;

export interface DesignSystemEnforceInput {
  workTree: string;
  first: DriverOutcome;
  signal: AbortSignal;
  continueWith: (text: string, round: number, total: DriverOutcome) => Promise<DriverOutcome | null>;
  check?: (workTree: string) => Promise<DesignSystemCheckResult>;
  maxRounds?: number;
}

export function wantsDesignSystemCheck(ctx: { project: { designSystemFor?: string | null }; request: { task?: string; mode: string } }): boolean {
  return Boolean(ctx.project.designSystemFor) && ctx.request.task === 'design-system' && ctx.request.mode === 'edit';
}

export function designSystemContinuation(result: DesignSystemCheckResult, round: number, maxRounds: number): string {
  return [
    '<studio-continue>',
    `The studio ran mcp__studio__design_system_check and it failed with ${result.problems.length} problem(s). Fix round ${round} of ${maxRounds}.`,
    'Fix every problem below with Edit. Then call mcp__studio__design_system_check again, until it passes:',
    ...result.problems.slice(0, LISTED_PROBLEMS).map((problem) => `- [${problem.rule}] ${problem.message}`),
    'Do not edit source/ and do not create other pages. Then reply in one or two sentences on what you fixed.',
    '</studio-continue>',
  ].join('\n');
}

export function designSystemReport(check: DesignSystemRunCheck): string {
  if (check.passed) return `Design system check: passed${check.rounds > 0 ? ` after ${check.rounds} studio fix round(s)` : ''}.`;
  return `Design system check: failed after ${check.rounds} studio fix round(s), ${check.problems.length} problem(s) left: ${check.problems.map((problem) => problem.message).join(' ')}`;
}

function finished(total: DriverOutcome, check: DesignSystemRunCheck): DriverOutcome {
  const finalText = [total.finalText, designSystemReport(check)].filter(Boolean).join('\n\n');
  if (check.passed) return { ...total, finalText, designSystemCheck: check };
  const shown = check.problems.slice(0, ERROR_PROBLEMS).map((problem) => problem.message).join(' ');
  const more = check.problems.length > ERROR_PROBLEMS ? ` (+${check.problems.length - ERROR_PROBLEMS} more)` : '';
  const error = `Design system check failed: ${check.problems.length} problem(s) after ${check.rounds} fix round(s). ${shown}${more}`;
  return { ...total, status: 'failed', error, finalText, designSystemCheck: check };
}

export async function enforceDesignSystemCheck(input: DesignSystemEnforceInput): Promise<DriverOutcome> {
  const check = input.check ?? checkDesignSystem;
  const maxRounds = input.maxRounds ?? MAX_DESIGN_SYSTEM_ROUNDS;
  let total = input.first;
  for (let rounds = 0; ; rounds += 1) {
    if (input.signal.aborted) return total;
    const result = await check(input.workTree);
    if (total.status !== 'completed') return { ...total, designSystemCheck: { ...result, rounds } };
    if (result.passed || rounds >= maxRounds) return finished(total, { ...result, rounds });
    const next = await input.continueWith(designSystemContinuation(result, rounds + 1, maxRounds), rounds + 1, total);
    if (!next) return finished(total, { ...result, rounds });
    total = next;
  }
}

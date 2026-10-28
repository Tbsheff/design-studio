import { writeFile } from 'node:fs/promises';
import type { query } from '@anthropic-ai/claude-agent-sdk';
import type { AgentRunContext, PreviewService } from '../types.js';
import { runScreens, type RunToolState } from './check-tool.js';
import { criticOutPrefix, regressionPairs, runCritic, type CriticIssue } from './critic.js';
import { warmScreens } from './screens.js';

type QueryFn = typeof query;

export interface RegressionInput {
  preview: PreviewService;
  ctx: AgentRunContext;
  run: RunToolState;
  runsDir: string;
  runId: string;
  queryFn: QueryFn;
  env?: Record<string, string | undefined>;
}

export function wantsRegressionCheck(run: RunToolState): boolean {
  return Boolean(run.config.preset.regressionCheck && run.config.criticModel && !run.regressionDone && run.reviewShots?.length);
}

export async function desktopRegression(input: RegressionInput): Promise<CriticIssue[]> {
  const { run } = input;
  run.regressionDone = true;
  const prefix = criticOutPrefix(input.runsDir, input.runId, 'regression');
  const screens = await runScreens(input.preview, input.ctx, run.config, run);
  await warmScreens(input.preview, input.ctx.project, screens);
  const pairs = await regressionPairs(input.preview, run.reviewShots ?? [], screens, prefix);
  if (pairs.length === 0) {
    run.regressionNote = 'Desktop regression check: no screen changed on desktop since the last design_review.';
    await writeFile(`${prefix}.json`, `${JSON.stringify({ changedScreens: 0, issues: [] }, null, 2)}\n`);
    return [];
  }
  const images = pairs.flatMap((pair) => [pair.before, pair.after]);
  const request = { request: input.ctx.request.prompt, findings: [], tasteRules: [], images, kind: 'regression' as const };
  const result = await runCritic(input.queryFn, request, run.config.criticModel as string, run.config.maxBudgetUsd === null ? null : run.config.preset.criticBudgetUsd, input.env);
  run.criticCostUsd += result.costUsd;
  await writeFile(`${prefix}.json`, `${JSON.stringify({ model: run.config.criticModel, changedScreens: pairs.map((pair) => pair.after.screen), costUsd: result.costUsd, error: result.error, issues: result.issues, raw: result.raw }, null, 2)}\n`);
  const kept = result.issues.filter((issue) => issue.severity !== 'low');
  run.regressionNote = `Desktop regression check: ${pairs.length} screen(s) changed on desktop since the last design_review (${pairs.map((pair) => pair.after.screen).join(', ')}); ${result.error ? 'the critic reply could not be read' : `${kept.length} high or medium regression(s) found`}.`;
  return kept;
}

export function regressionPrompt(issues: readonly CriticIssue[]): string {
  const lines = issues.map((issue) => `- [${issue.severity}] ${issue.screen ? `screen "${issue.screen}", ` : ''}${issue.where}: ${issue.problem} Fix: ${issue.fix}`);
  return [
    '<studio-continue>',
    'Desktop regression check: the studio compared desktop 1440 px before and after your last fixes. These got worse:',
    ...lines,
    'Fix them with Edit and keep your mobile fixes. Then run mcp__studio__render_check and take screenshots from=0 at desktop and mobile again. Then reply with what you changed and what is left.',
    '</studio-continue>',
  ].join('\n');
}

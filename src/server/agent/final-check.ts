import type { FinalCheck, RenderCheckResult } from '../../shared/contracts.js';
import type { PreviewService, AgentRunContext } from '../types.js';
import { buildCheckReport, saveCheck, type RunToolState } from './check-tool.js';
import { countSeverities } from '../preview/quality.js';
import { EDIT_ELEMENT_TOOL, SET_PROPS_TOOL, SET_TOKEN_TOOL } from './permissions.js';

const EDIT_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', EDIT_ELEMENT_TOOL, SET_TOKEN_TOOL, SET_PROPS_TOOL]);
const CHECK_TOOL = 'mcp__studio__render_check';

export function verifiedAfterLastEdit(toolOrder: readonly string[]): boolean {
  const lastEdit = toolOrder.findLastIndex((name) => EDIT_TOOLS.has(name));
  if (lastEdit === -1) return true;
  return toolOrder.lastIndexOf(CHECK_TOOL) > lastEdit;
}

function errorCount(results: RenderCheckResult[]): number {
  return results.reduce((sum, result) => sum + result.consoleErrors.length + result.pageErrors.length + (result.horizontalOverflow ? 1 : 0) + result.layout.filter((finding) => finding.severity === 'error').length, 0);
}

export function summarizeCheck(results: RenderCheckResult[], ranBy: FinalCheck['ranBy']): FinalCheck {
  const counts = countSeverities(results.flatMap((result) => result.quality ?? []));
  return { ranBy, errors: errorCount(results), ...counts };
}

interface FinalCheckInput {
  preview: PreviewService;
  ctx: AgentRunContext;
  run: RunToolState;
  toolOrder: readonly string[];
  runsDir: string;
  runId: string;
}

function wantsFinalCheck(input: Pick<FinalCheckInput, 'ctx' | 'run' | 'toolOrder'>): boolean {
  if (input.ctx.request.mode !== 'edit' || !input.ctx.previewUrl) return false;
  if (!input.run.config.preset.checks.screenshots) return false;
  return input.toolOrder.some((name) => EDIT_TOOLS.has(name));
}

export async function runFinalCheck(input: FinalCheckInput): Promise<FinalCheck | null> {
  if (!wantsFinalCheck(input)) return null;
  if (verifiedAfterLastEdit(input.toolOrder)) return summarizeCheck(input.run.lastChecks, 'agent');
  try {
    const report = await buildCheckReport(input.preview, input.ctx, input.run.config, input.run);
    await saveCheck(input.runsDir, input.runId, 'final', report.results);
    return summarizeCheck(report.results, 'studio');
  } catch (error) {
    console.warn(`[agent] studio final check failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

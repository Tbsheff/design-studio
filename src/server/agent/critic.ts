import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Options, SDKMessage, SDKUserMessage, query } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { QualityFinding } from '../../shared/contracts.js';
import type { PreviewService } from '../types.js';
import type { RunToolState } from './check-tool.js';
import type { TasteRule } from './taste.js';

type QueryFn = typeof query;

const CRITIC_TILES = { desktop: { width: 1440, height: 900, tileHeight: 900, maxTiles: 3 }, mobile: { width: 390, height: 844, tileHeight: 1560, maxTiles: 2 } } as const;

const CriticIssueSchema = z.object({
  severity: z.enum(['high', 'medium', 'low']),
  area: z.string().min(1),
  where: z.string().min(1),
  problem: z.string().min(1),
  fix: z.string().min(1),
});

type CriticIssue = z.infer<typeof CriticIssueSchema>;

const CriticReplySchema = z.union([z.array(CriticIssueSchema), z.object({ issues: z.array(CriticIssueSchema) }).transform((value) => value.issues)]);

const CRITIC_SYSTEM = `You are a senior product design critic. You did not build this design and you owe its builder nothing. Judge it with fresh eyes from the screenshots, the automatic check findings and the request.
- Find what a demanding design lead would send back: hierarchy, layout and rhythm, typography, color and contrast, copy (generic, placeholder or contradicting text), interaction states, accessibility, and mobile fit (clipped content, sideways scroll, hidden navigation, tables that do not restack).
- Judge against the user's taste rules when they are given.
- Judge distinctiveness: does the layout fit this request and content, or is it a stock template (for pricing: three equal plan cards with the middle one raised, then a table and an FAQ; for landing pages: a hero and three feature cards; every section centered)? A \`generic-layout\` check finding is a strong hint. If it is generic, file exactly one issue with "area": "generic-layout" and severity medium, and make its fix ONE concrete layout change that fits the content and keeps all of it (for pricing, for example: a plan selector with one detailed plan column, or the comparison table first with plan names and prices in its header). The change must merge: the content moves into the new structure and the old blocks go away.
- Check for duplicated facts: the same price, plan name with price, or call to action shown twice at one screen size (for example plan cards that repeat the prices already in a table header). File it as "area": "duplicate-content", severity medium, and say which copy to remove. Make sure no fact is dropped.
- Do not praise. Do not repeat a finding unless you add a concrete fix.
- Answer with JSON only: an array of at most 10 issues, worst first, each {"severity":"high"|"medium"|"low","area":"...","where":"section or element","problem":"...","fix":"one concrete change"}. Use high for issues that break the request, the layout or accessibility; medium for clear quality problems; low for polish.`;

interface CriticInput {
  request: string;
  findings: QualityFinding[];
  tasteRules: TasteRule[];
  images: { label: string; data: string }[];
}

interface CriticResult {
  issues: CriticIssue[];
  costUsd: number;
  raw: string;
  error: string | null;
}

export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const body = fenced?.[1] ?? text;
  const start = body.search(/[[{]/);
  if (start === -1) throw new Error('no JSON in critic reply');
  const end = Math.max(body.lastIndexOf(']'), body.lastIndexOf('}'));
  return JSON.parse(body.slice(start, end + 1));
}

export function parseCriticReply(text: string): CriticIssue[] {
  return CriticReplySchema.parse(extractJson(text));
}

function findingLine(finding: QualityFinding): string {
  return `- [${finding.severity}] ${finding.check}${finding.viewport ? ` @${finding.viewport}` : ''}: ${finding.message}`;
}

function criticFindings(findings: QualityFinding[]): QualityFinding[] {
  return findings.filter((finding) => finding.check !== 'visual-diff');
}

export function criticText(input: Omit<CriticInput, 'images'>): string {
  const relevant = criticFindings(input.findings);
  const findings = relevant.length ? relevant.slice(0, 20).map(findingLine).join('\n') : '- none reported yet';
  const taste = input.tasteRules.length ? input.tasteRules.map((rule) => `- ${rule.kind} (${rule.area}): ${rule.rule}`).join('\n') : '- none';
  return `<request>\n${input.request}\n</request>\n\n<check-findings>\n${findings}\n</check-findings>\n\n<taste>\n${taste}\n</taste>\n\nThe images are the design, top to bottom: desktop 1440 px first, then mobile 390 px. Reply with the JSON array only.`;
}

function criticPrompt(input: CriticInput): AsyncIterable<SDKUserMessage> {
  const content = [
    ...input.images.flatMap((image) => [
      { type: 'text' as const, text: image.label },
      { type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/png' as const, data: image.data } },
    ]),
    { type: 'text' as const, text: criticText(input) },
  ];
  const message: SDKUserMessage = { type: 'user', parent_tool_use_id: null, message: { role: 'user', content } };
  return (async function* single() {
    yield message;
  })();
}

function criticOptions(model: string, budgetUsd: number | null, env?: Record<string, string | undefined>): Options {
  return {
    ...(env ? { env } : {}),
    model,
    ...(budgetUsd !== null ? { maxBudgetUsd: budgetUsd } : {}),
    maxTurns: 1,
    tools: [],
    settingSources: [],
    strictMcpConfig: true,
    mcpServers: {},
    persistSession: false,
    permissionMode: 'default',
    cwd: os.tmpdir(),
    systemPrompt: CRITIC_SYSTEM,
    settings: { disableBundledSkills: true, syncClaudeAiSkills: false, syncClaudeAiPlugins: false },
    skills: [],
  };
}

interface CriticStream {
  text: string;
  costUsd: number;
}

async function drain(stream: AsyncIterable<SDKMessage>): Promise<CriticStream> {
  let text = '';
  let costUsd = 0;
  for await (const message of stream) {
    if (message.type === 'assistant') {
      for (const block of message.message.content) if (block.type === 'text') text += block.text;
    } else if (message.type === 'result') {
      costUsd = message.total_cost_usd ?? 0;
      if (message.subtype === 'success' && message.result) text = message.result;
    }
  }
  return { text, costUsd };
}

export async function runCritic(queryFn: QueryFn, input: CriticInput, model: string, budgetUsd: number | null, env?: Record<string, string | undefined>): Promise<CriticResult> {
  const stream = queryFn({ prompt: criticPrompt(input), options: criticOptions(model, budgetUsd, env) });
  let drained: CriticStream = { text: '', costUsd: 0 };
  try {
    drained = await drain(stream);
    return { issues: parseCriticReply(drained.text), costUsd: drained.costUsd, raw: drained.text, error: null };
  } catch (error) {
    return { issues: [], costUsd: drained.costUsd, raw: drained.text, error: error instanceof Error ? error.message : String(error) };
  } finally {
    stream.close();
  }
}

export async function criticImages(preview: PreviewService, url: string, outPrefix: string): Promise<CriticInput['images']> {
  const images: CriticInput['images'] = [];
  for (const [name, plan] of Object.entries(CRITIC_TILES)) {
    const tiles = await preview.screenshotTiles(url, { viewport: { width: plan.width, height: plan.height }, tileHeight: plan.tileHeight, maxTiles: plan.maxTiles, from: 0, outPrefix: `${outPrefix}-${name}` });
    for (const [index, file] of tiles.paths.entries()) images.push({ label: `${name} image ${index + 1} of ${tiles.paths.length} (page height ${tiles.pageHeight}px)`, data: (await readFile(file)).toString('base64') });
  }
  return images;
}

export function describeCriticResult(result: CriticResult, state: Pick<RunToolState, 'criticCalls' | 'config'>): string {
  if (result.error) return `design_review could not parse the critic reply (${result.error}). Continue with your own checks.`;
  const high = result.issues.filter((issue) => issue.severity === 'high').length;
  const medium = result.issues.filter((issue) => issue.severity === 'medium').length;
  const left = state.config.preset.criticMaxCalls - state.criticCalls;
  return `${JSON.stringify(result.issues, null, 2)}\n\n${high} high, ${medium} medium. Fix every high issue and most medium issues with Edit, then run render_check again. design_review calls left: ${left}.`;
}

export function criticOutPrefix(runsDir: string, runId: string, call: number): string {
  return path.join(runsDir, `${runId}-critic-${call}`);
}

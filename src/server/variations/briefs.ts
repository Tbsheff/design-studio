import os from 'node:os';
import type { Options, SDKMessage, query } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import {
  VARIATION_BRIEF_MAX,
  VARIATION_MAX,
  VARIATION_MAX_REACT,
  VARIATION_MIN,
  type ProjectKind,
  type VariationBrief,
  type VariationBriefsResult,
} from '../../shared/contracts.js';
import { WIREFRAME_MODEL } from '../../shared/run-levels.js';
import { extractJson } from '../agent/critic.js';
import { buildEnv } from '../agent/sdk-driver.js';

type QueryFn = typeof query;

export const BRIEF_MODEL = WIREFRAME_MODEL;
const BRIEF_BUDGET_USD = 0.05;
const VARIATION_LABELS = ['A', 'B', 'C', 'D'] as const;
const SIMILARITY_LIMIT = 0.5;
const TITLE_MAX = 40;

export interface BriefInput {
  prompt: string;
  count: number;
  kind: ProjectKind;
  hasDesign: boolean;
  hasDesignSystem: boolean;
}

export interface BriefGenerator {
  generate(input: BriefInput): Promise<VariationBriefsResult>;
}

function maxVariations(kind: ProjectKind): number {
  return kind === 'react' ? VARIATION_MAX_REACT : VARIATION_MAX;
}

export function countProblem(count: unknown, kind: ProjectKind): string | null {
  const max = maxVariations(kind);
  if (typeof count !== 'number' || !Number.isInteger(count) || count < VARIATION_MIN || count > max) {
    return `count must be an integer from ${VARIATION_MIN} to ${max}${kind === 'react' ? ' for React projects' : ''}`;
  }
  return null;
}

function labelAt(index: number): string {
  return VARIATION_LABELS[index] ?? String(index + 1);
}

const STOP_WORDS = new Set(['the', 'and', 'with', 'for', 'into', 'that', 'this', 'from', 'one', 'each', 'its', 'are', 'all', 'but', 'not', 'use', 'per', 'over', 'out', 'any', 'has', 'more', 'less', 'very', 'than', 'then']);

function wordsOf(text: string): Set<string> {
  const words = text.toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? [];
  return new Set(words.filter((word) => !STOP_WORDS.has(word)));
}

export function similarity(a: string, b: string): number {
  const left = wordsOf(a);
  const right = wordsOf(b);
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / (left.size + right.size - shared);
}

const BriefItemSchema = z.object({
  title: z.string().trim().min(1).max(TITLE_MAX),
  brief: z.string().trim().min(12).max(VARIATION_BRIEF_MAX),
});

const BriefReplySchema = z.union([z.array(BriefItemSchema), z.object({ briefs: z.array(BriefItemSchema) }).transform((value) => value.briefs)]);

function normalizeBriefText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function briefProblems(briefs: readonly Pick<VariationBrief, 'title' | 'brief'>[], count: number): string[] {
  const problems: string[] = [];
  if (briefs.length !== count) problems.push(`expected ${count} briefs, got ${briefs.length}`);
  briefs.forEach((item, index) => {
    const label = labelAt(index);
    const brief = normalizeBriefText(item.brief);
    if (!item.title.trim()) problems.push(`${label}: title is empty`);
    if (item.title.trim().length > TITLE_MAX) problems.push(`${label}: title is longer than ${TITLE_MAX} characters`);
    if (brief.length < 12) problems.push(`${label}: brief is too short`);
    if (brief.length > VARIATION_BRIEF_MAX) problems.push(`${label}: brief is longer than ${VARIATION_BRIEF_MAX} characters`);
    if (item.brief.split(/\n/).filter((line) => line.trim()).length > 2) problems.push(`${label}: brief has more than 2 lines`);
  });
  for (let i = 0; i < briefs.length; i += 1) {
    for (let j = i + 1; j < briefs.length; j += 1) {
      const a = briefs[i];
      const b = briefs[j];
      if (!a || !b) continue;
      if (a.title.trim().toLowerCase() === b.title.trim().toLowerCase()) problems.push(`${labelAt(i)} and ${labelAt(j)} have the same title`);
      else if (similarity(`${a.title} ${a.brief}`, `${b.title} ${b.brief}`) > SIMILARITY_LIMIT) problems.push(`${labelAt(i)} and ${labelAt(j)} are too similar`);
    }
  }
  return problems;
}

function labelBriefs(items: readonly Pick<VariationBrief, 'title' | 'brief'>[]): VariationBrief[] {
  return items.map((item, index) => ({ label: labelAt(index), title: item.title.trim(), brief: normalizeBriefText(item.brief) }));
}

export function parseBriefReply(text: string, count: number): VariationBrief[] {
  const items = BriefReplySchema.parse(extractJson(text));
  const problems = briefProblems(items, count);
  if (problems.length) throw new Error(problems.join('; '));
  return labelBriefs(items);
}

export function validateUserBriefs(raw: unknown, kind: ProjectKind): VariationBrief[] {
  if (!Array.isArray(raw)) throw new Error('briefs must be an array');
  const problem = countProblem(raw.length, kind);
  if (problem) throw new Error(problem.replace('count', 'briefs'));
  const items = raw.map((item, index) => {
    const parsed = BriefItemSchema.safeParse(item);
    if (!parsed.success) throw new Error(`brief ${labelAt(index)}: title 1..${TITLE_MAX} and brief 12..${VARIATION_BRIEF_MAX} characters`);
    return parsed.data;
  });
  return labelBriefs(items);
}

const ARCHETYPES: { title: string; brief: string }[] = [
  { title: 'Editorial serif', brief: 'Magazine layout: oversized serif headline, asymmetric two-column story, warm off-white paper, ink black with one rust accent, generous whitespace.' },
  { title: 'Bold color blocks', brief: 'Full-bleed color bands that change per section, heavy geometric sans, big numbers, tight grid of tiles, high contrast and energetic density.' },
  { title: 'Quiet utility', brief: 'Compact, list-first layout with a sticky side index, small neutral sans, gray scale with one cool blue for actions, dense but calm rows.' },
  { title: 'Photo-led dark', brief: 'Dark charcoal canvas, large framed image panels with captions, condensed uppercase headings, neon lime accent, slow vertical rhythm.' },
];

export function fallbackBriefs(count: number): VariationBrief[] {
  return labelBriefs(ARCHETYPES.slice(0, count));
}

const BRIEF_SYSTEM = `You are an art director. For one design request you propose several design directions that a designer will build in parallel, so the user can compare them side by side.
- Each direction must be clearly different from the others in at least three of: layout idea, type, color, density.
- Each direction fits the request and its content. No direction drops content the request asks for.
- Each brief is one or two short sentences, at most 220 characters, concrete enough to build: name the layout structure, the type style, the palette and the density.
- No generic purple or indigo gradients. No emoji.
- Answer with JSON only: an array of objects {"title": "2 to 4 words", "brief": "..."}.`;

function briefUserText(input: BriefInput): string {
  const context = [
    `Project kind: ${input.kind}.`,
    input.hasDesign ? 'There is already a design; each direction reworks it.' : 'The page starts empty.',
    input.hasDesignSystem ? 'The project has a design system with tokens; directions may vary layout and density more than color.' : '',
  ].filter(Boolean);
  return `<request>\n${input.prompt.trim()}\n</request>\n\n${context.join(' ')}\n\nPropose exactly ${input.count} directions. Reply with the JSON array only.`;
}

export function briefOptions(env: Record<string, string | undefined>, claudeExecutable?: string): Options {
  return {
    env,
    model: BRIEF_MODEL,
    maxBudgetUsd: BRIEF_BUDGET_USD,
    maxTurns: 1,
    tools: [],
    settingSources: [],
    strictMcpConfig: true,
    mcpServers: {},
    persistSession: false,
    permissionMode: 'default',
    cwd: os.tmpdir(),
    systemPrompt: BRIEF_SYSTEM,
    settings: { disableBundledSkills: true, syncClaudeAiSkills: false, syncClaudeAiPlugins: false },
    skills: [],
    ...(claudeExecutable ? { pathToClaudeCodeExecutable: claudeExecutable } : {}),
  };
}

async function drain(stream: AsyncIterable<SDKMessage>): Promise<{ text: string; costUsd: number }> {
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

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface SdkBriefOptions {
  queryFn?: QueryFn;
  claudeExecutable?: string;
}

let sdkQuery: Promise<QueryFn> | null = null;

function loadQuery(): Promise<QueryFn> {
  sdkQuery ??= import('@anthropic-ai/claude-agent-sdk').then((sdk) => sdk.query);
  return sdkQuery;
}

export function createSdkBriefGenerator(options: SdkBriefOptions = {}): BriefGenerator {
  return {
    async generate(input) {
      let costUsd = 0;
      try {
        const queryFn = options.queryFn ?? (await loadQuery());
        const stream = queryFn({ prompt: briefUserText(input), options: briefOptions(buildEnv(process.env, false), options.claudeExecutable) });
        try {
          const drained = await drain(stream);
          costUsd = drained.costUsd;
          return { briefs: parseBriefReply(drained.text, input.count), source: 'model', model: BRIEF_MODEL, costUsd, error: null };
        } finally {
          stream.close();
        }
      } catch (error) {
        return { briefs: fallbackBriefs(input.count), source: 'fallback', model: BRIEF_MODEL, costUsd, error: `Brief call failed, using built-in directions: ${describe(error)}` };
      }
    },
  };
}

export function createMockBriefGenerator(): BriefGenerator {
  return {
    async generate(input) {
      return { briefs: fallbackBriefs(input.count), source: 'mock', model: null, costUsd: 0, error: null };
    },
  };
}

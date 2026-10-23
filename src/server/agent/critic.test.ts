import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Options, SDKMessage, query } from '@anthropic-ai/claude-agent-sdk';
import { afterEach, describe, expect, it } from 'vitest';
import type { RunLevel } from '../../shared/contracts.js';
import { resolveRunConfig } from '../../shared/run-levels.js';
import type { RunToolState } from './check-tool.js';
import { criticText, parseCriticReply } from './critic.js';
import { createFakePreview, createTempProject } from './test-fakes.js';
import { runDesignReview, type StudioToolDeps } from './tools.js';

const roots: string[] = [];
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

afterEach(async () => {
  while (roots.length) await rm(roots.pop() as string, { recursive: true, force: true });
});

const ISSUES = [
  { severity: 'high', area: 'mobile', where: 'comparison table', problem: 'Only one plan shows at 390 px.', fix: 'Restack the rows per plan.' },
  { severity: 'medium', area: 'copy', where: 'hero', problem: 'Generic headline.', fix: 'Name the product outcome.' },
];

function fakeQuery(reply: string, costUsd: number, seen: Options[]): typeof query {
  const fn = ({ options }: { options?: Options }) => {
    if (options) seen.push(options);
    async function* run(): AsyncGenerator<SDKMessage> {
      yield { type: 'result', subtype: 'success', is_error: false, result: reply, total_cost_usd: costUsd } as unknown as SDKMessage;
    }
    return Object.assign(run(), { close: () => undefined });
  };
  return fn as unknown as typeof query;
}

async function deps(level: RunLevel, reply: string, seen: Options[], maxBudgetUsd: number | null = null): Promise<StudioToolDeps & { run: RunToolState }> {
  const temp = await createTempProject('html', { maxBudgetUsd });
  roots.push(temp.root);
  const preview = createFakePreview();
  preview.screenshotTiles = async (_url, request) => {
    const file = `${request.outPrefix}-1.png`;
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, PNG);
    return { paths: [file], pageHeight: 800, from: 0, to: 800 };
  };
  const config = resolveRunConfig(temp.project.settings, level);
  const run: RunToolState = { config, spentUsd: () => 0.3, criticCostUsd: 0, criticCalls: 0, lastFindings: [{ check: 'a11y', severity: 'high', viewport: 'mobile', selector: 'p', source: null, message: 'color-contrast: low' }], lastChecks: [], baseline: null };
  return {
    preview,
    ctx: { project: temp.project, direction: temp.direction, request: { prompt: 'A pricing page', mode: 'edit', level }, attachments: [], designMd: null, previewUrl: 'http://preview.test/' },
    runsDir: path.join(temp.root, 'runs'),
    runId: 'r1',
    run,
    tasteRules: [{ kind: 'avoid', area: 'feel', rule: 'The generic SaaS template look' }],
    queryFn: fakeQuery(reply, 0.04, seen),
  };
}

describe('critic reply parsing', () => {
  it('reads a bare array, a fenced block and an {issues} object', () => {
    expect(parseCriticReply(JSON.stringify(ISSUES))).toHaveLength(2);
    expect(parseCriticReply(`Here:\n\`\`\`json\n${JSON.stringify(ISSUES)}\n\`\`\``)[0]?.severity).toBe('high');
    expect(parseCriticReply(JSON.stringify({ issues: ISSUES }))).toHaveLength(2);
  });

  it('rejects replies that are not issue JSON', () => {
    expect(() => parseCriticReply('Looks great!')).toThrow();
    expect(() => parseCriticReply(JSON.stringify([{ severity: 'urgent', area: 'x', where: 'y', problem: 'z', fix: 'w' }]))).toThrow();
  });

  it('gives the critic the request, the check findings and the taste rules', () => {
    const text = criticText({ request: 'A pricing page', findings: [{ check: 'tap-target', severity: 'medium', viewport: 'mobile', selector: 'a', source: null, message: 'small' }], tasteRules: [{ kind: 'prefer', area: 'layout', rule: 'Hierarchy over boxes' }] });
    expect(text).toContain('<request>\nA pricing page');
    expect(text).toContain('[medium] tap-target @mobile: small');
    expect(text).toContain('prefer (layout): Hierarchy over boxes');
    const diffOnly = criticText({ request: 'x', findings: [{ check: 'visual-diff', severity: 'low', viewport: 'desktop', selector: null, source: null, message: '0% of pixels changed' }], tasteRules: [] });
    expect(diffOnly).not.toContain('0% of pixels changed');
  });
});

describe('design_review tool', () => {
  it('runs a fresh, tool-less, non-resumed query with screenshots and counts its cost into the run', async () => {
    const seen: Options[] = [];
    const d = await deps('polish', JSON.stringify(ISSUES), seen);
    const result = await runDesignReview(d);
    const text = (result.content[0] as { text: string }).text;
    expect(result).not.toHaveProperty('isError');
    expect(text).toContain('Only one plan shows at 390 px.');
    expect(text).toContain('1 high, 1 medium');
    expect(text).toContain('design_review calls left: 1');
    expect(text).not.toMatch(/Budget|null/);
    expect(d.run.criticCostUsd).toBeCloseTo(0.04, 9);
    expect(seen[0]).toMatchObject({ model: 'claude-sonnet-5-5', maxTurns: 1, tools: [], settingSources: [], persistSession: false, mcpServers: {} });
    expect(seen[0]).not.toHaveProperty('maxBudgetUsd');
    expect(seen[0]).not.toHaveProperty('resume');
    await runDesignReview(d);
    expect(d.run.criticCostUsd).toBeCloseTo(0.08, 9);
    const third = await runDesignReview(d);
    expect(third).toMatchObject({ isError: true });
    expect(seen).toHaveLength(2);
  });

  it('caps the critic call and reports the budget only when the project sets a spending limit', async () => {
    const seen: Options[] = [];
    const d = await deps('polish', JSON.stringify(ISSUES), seen, 1.5);
    const text = ((await runDesignReview(d)).content[0] as { text: string }).text;
    expect(text).toMatch(/Budget: about \$0\.34 of \$1\.50 used/);
    expect(seen[0]).toMatchObject({ maxBudgetUsd: 0.15, maxTurns: 1 });
  });

  it('is not available below polish', async () => {
    const seen: Options[] = [];
    const d = await deps('prototype', '[]', seen);
    expect(await runDesignReview(d)).toMatchObject({ isError: true });
    expect(seen).toHaveLength(0);
  });

  it('still counts the cost when the critic reply cannot be parsed', async () => {
    const seen: Options[] = [];
    const d = await deps('polish', 'no json here', seen);
    const result = await runDesignReview(d);
    expect((result.content[0] as { text: string }).text).toContain('could not parse');
    expect(d.run.criticCostUsd).toBeCloseTo(0.04, 9);
  });
});

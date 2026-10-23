import { describe, expect, it } from 'vitest';
import type { SDKMessage, query } from '@anthropic-ai/claude-agent-sdk';
import { buildUserText } from '../agent/user-message.js';
import {
  BRIEF_MODEL,
  briefOptions,
  briefProblems,
  countProblem,
  createSdkBriefGenerator,
  fallbackBriefs,
  parseBriefReply,
  similarity,
  validateUserBriefs,
} from './briefs.js';
import { referenceBlock, variationBlock } from './message.js';

const THREE = [
  { title: 'Workshop ledger', brief: 'Left rail of services with prices, big serif headline, cream paper and oxblood accent, roomy spacing.' },
  { title: 'Street poster', brief: 'Full-bleed yellow and black bands, condensed caps, oversized hours and address, loud and dense.' },
  { title: 'Calm booking', brief: 'Booking form first in a white card, small grotesk type, slate gray with one teal action color, compact rows.' },
];

describe('brief parsing and validation', () => {
  it('parses a JSON array, fenced or bare, and labels it A, B, C', () => {
    const fenced = `Here you go:\n\`\`\`json\n${JSON.stringify(THREE)}\n\`\`\``;
    const briefs = parseBriefReply(fenced, 3);
    expect(briefs.map((brief) => brief.label)).toEqual(['A', 'B', 'C']);
    expect(briefs[1]).toMatchObject({ title: 'Street poster' });
    expect(parseBriefReply(JSON.stringify({ briefs: THREE }), 3)).toHaveLength(3);
  });

  it('rejects a wrong count, long briefs, more than 2 lines and near duplicates', () => {
    expect(() => parseBriefReply(JSON.stringify(THREE.slice(0, 2)), 3)).toThrow(/expected 3 briefs/);
    expect(briefProblems([{ title: 'A', brief: 'x'.repeat(400) }, THREE[1]!], 2).join()).toMatch(/longer than/);
    expect(briefProblems([{ title: 'Lines', brief: 'one line here\nsecond line\nthird line' }, THREE[1]!], 2).join()).toMatch(/more than 2 lines/);
    const copy = { title: 'Workshop ledger two', brief: THREE[0]!.brief };
    expect(briefProblems([THREE[0]!, copy], 2).join()).toMatch(/too similar/);
    expect(briefProblems([THREE[0]!, { ...THREE[1]!, title: 'workshop LEDGER' }], 2).join()).toMatch(/same title/);
    expect(briefProblems(THREE, 3)).toEqual([]);
  });

  it('scores similarity on shared content words', () => {
    expect(similarity('serif cream editorial', 'serif cream editorial')).toBe(1);
    expect(similarity(THREE[0]!.brief, THREE[1]!.brief)).toBeLessThan(0.2);
  });

  it('caps the count at 4, and at 3 for React', () => {
    expect(countProblem(3, 'html')).toBeNull();
    expect(countProblem(4, 'html')).toBeNull();
    expect(countProblem(4, 'react')).toMatch(/2 to 3 for React/);
    expect(countProblem(1, 'html')).toMatch(/2 to 4/);
    expect(countProblem(2.5, 'html')).not.toBeNull();
  });

  it('validates user-edited briefs and relabels after a removal', () => {
    const briefs = validateUserBriefs([THREE[0], THREE[2]], 'html');
    expect(briefs.map((brief) => [brief.label, brief.title])).toEqual([['A', 'Workshop ledger'], ['B', 'Calm booking']]);
    expect(() => validateUserBriefs([THREE[0]], 'html')).toThrow(/briefs must be an integer from 2/);
    expect(() => validateUserBriefs([THREE[0], { title: '', brief: 'short' }], 'html')).toThrow(/brief B/);
  });

  it('has distinct built-in fallback briefs', () => {
    expect(briefProblems(fallbackBriefs(4), 4)).toEqual([]);
  });
});

function fakeQuery(text: string, cost = 0.004): { fn: typeof query; options: unknown[] } {
  const options: unknown[] = [];
  const fn = ((params: { options?: unknown }) => {
    options.push(params.options);
    const messages = [
      { type: 'assistant', message: { content: [{ type: 'text', text }] } },
      { type: 'result', subtype: 'success', result: text, total_cost_usd: cost },
    ] as unknown as SDKMessage[];
    const iterator = (async function* stream() {
      for (const message of messages) yield message;
    })();
    return Object.assign(iterator, { close: () => undefined });
  }) as unknown as typeof query;
  return { fn, options };
}

describe('sdk brief generator', () => {
  it('makes one Haiku call with no tools and returns the cost', async () => {
    const fake = fakeQuery(JSON.stringify(THREE));
    const result = await createSdkBriefGenerator({ queryFn: fake.fn }).generate({ prompt: 'bike shop', count: 3, kind: 'html', hasDesign: false, hasDesignSystem: false });
    expect(result).toMatchObject({ source: 'model', model: BRIEF_MODEL, costUsd: 0.004, error: null });
    expect(result.briefs).toHaveLength(3);
    expect(fake.options[0]).toMatchObject({ model: BRIEF_MODEL, tools: [], mcpServers: {}, maxTurns: 1, persistSession: false });
  });

  it('falls back to built-in briefs when the reply is not valid', async () => {
    const fake = fakeQuery('[{"title":"Only one","brief":"a single brief that is long enough"}]');
    const result = await createSdkBriefGenerator({ queryFn: fake.fn }).generate({ prompt: 'bike shop', count: 3, kind: 'html', hasDesign: false, hasDesignSystem: false });
    expect(result.source).toBe('fallback');
    expect(result.error).toMatch(/expected 3 briefs/);
    expect(result.costUsd).toBe(0.004);
    expect(result.briefs).toHaveLength(3);
  });

  it('keeps tools and MCP servers off in the options', () => {
    expect(briefOptions({})).toMatchObject({ tools: [], strictMcpConfig: true, settingSources: [] });
  });
});

describe('variation and reference blocks in the user message', () => {
  it('puts the brief in a <variation> block after the request', () => {
    const text = buildUserText({ request: { prompt: 'bike shop', mode: 'edit', variation: { label: 'B', title: 'Street poster', brief: THREE[1]!.brief, index: 1, count: 3 } }, designMd: null, designSystem: null });
    expect(text.startsWith('bike shop\n\n<variation label="B" index="1" of="3">')).toBe(true);
    expect(text).toContain('Street poster: Full-bleed yellow');
    expect(variationBlock(undefined)).toBeNull();
  });

  it('puts a mixed element in a <reference-element> block with styles and snippet', () => {
    const block = referenceBlock({ fromDirectionId: 'd2', fromLabel: 'Variation B', selector: 'header', tag: 'header', outerHTML: '<header class="x">Hi</header>', styles: { color: 'red' }, source: { file: 'index.html', line: 3, col: 1 }, snippet: '<header class="x">' });
    expect(block).toContain('<reference-element from="Variation B">');
    expect(block).toContain('computed styles: color: red');
    expect(block).toContain('source snippet:\n<header class="x">');
    expect(block).toContain("keep this design's tokens");
  });
});

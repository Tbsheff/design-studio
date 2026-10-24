import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('./inspector.css', import.meta.url)), 'utf8');

function declarations(source: string): { prop: string; value: string; line: number }[] {
  const out: { prop: string; value: string; line: number }[] = [];
  source.split('\n').forEach((text, index) => {
    const match = /^\s*([a-z-]+)\s*:\s*([^;]+);/.exec(text);
    if (match?.[1] && match[2]) out.push({ prop: match[1], value: match[2], line: index + 1 });
  });
  return out;
}

describe('inspector.css spacing', () => {
  it('uses --s-* tokens for every padding, margin and gap', () => {
    const spacing = declarations(css).filter((d) => /^(padding|margin|gap|row-gap|column-gap)(-|$)/.test(d.prop));
    expect(spacing.length).toBeGreaterThan(20);
    const raw = spacing.filter((d) => /\d(\.\d+)?px\b/.test(d.value)).map((d) => `${d.line}: ${d.prop}: ${d.value}`);
    expect(raw).toEqual([]);
  });

  it('keeps inspector fields at 28px', () => {
    const field = /\.ins-field \{[^}]*\}/.exec(css)?.[0] ?? '';
    expect(field).toContain('height: 28px');
  });
});

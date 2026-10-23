import { describe, expect, it } from 'vitest';
import type { CompiledTokenEntry } from '../../shared/contracts.js';
import { scanTokenUse } from './token-scan.js';

const entries: CompiledTokenEntry[] = [
  { path: 'color.ink', cssVar: '--ink', type: 'color', value: '#1c1f23', darkValue: null },
  { path: 'color.accent', cssVar: '--accent', type: 'color', value: '#0f6b5c', darkValue: null },
  { path: 'text.lg', cssVar: '--text-lg', type: 'dimension', value: '20px', darkValue: null },
  { path: 'space.4', cssVar: '--space-4', type: 'dimension', value: '16px', darkValue: null },
];

describe('token scan', () => {
  it('flags raw colors and sizes where a token exists, with file and line', () => {
    const css = ['.a { color: var(--ink); }', '.b { color: #1c1f23; }', '.c { font-size: 20px; padding: 16px 13px; }', '.d { background: #ff00ff; }'].join('\n');
    const findings = scanTokenUse([{ path: 'index.html', text: css }], entries);
    expect(findings.map((finding) => finding.source)).toEqual(['index.html:2', 'index.html:3', 'index.html:3']);
    expect(findings[0]).toMatchObject({ check: 'tokens', severity: 'medium', fix: 'Use var(--ink).' });
    expect(findings[1]?.message).toContain('--text-lg');
    expect(findings[2]?.message).toContain('--space-4');
  });

  it('reports nothing without tokens', () => {
    expect(scanTokenUse([{ path: 'index.html', text: '.b { color: #1c1f23; }' }], [])).toEqual([]);
  });
});

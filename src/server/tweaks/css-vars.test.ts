import { describe, expect, it } from 'vitest';
import { applyEdits, lastDeclarationOf, rootDeclarations, usesVar } from './css-vars.js';
import { htmlStyleRegions } from './sources.js';

describe('rootDeclarations', () => {
  it('finds custom properties in top-level :root rules with exact value spans', () => {
    const css = ':root { --gap: 24px; --accent:#0f6b5c ; color: red; }\n.card { --gap: 2px; }';
    const decls = rootDeclarations(css);
    expect(decls.map((d) => [d.name, d.value])).toEqual([
      ['--gap', '24px'],
      ['--accent', '#0f6b5c'],
    ]);
    for (const decl of decls) expect(css.slice(decl.start, decl.end)).toBe(decl.value);
  });

  it('skips @media, @supports, comments and strings, and drops !important from the span', () => {
    const css = [
      '/* :root { --gap: 1px; } */',
      '@media (min-width: 600px) { :root { --gap: 40px; } }',
      '@supports (color: oklch(0% 0 0)) { :root { --accent: oklch(50% 0.1 200); } }',
      '.x::before { content: ":root { --gap: 9px; }"; }',
      ':root, .dark { --gap: 16px !important; --font: "A; B", sans-serif; }',
    ].join('\n');
    const decls = rootDeclarations(css);
    expect(decls.map((d) => [d.name, d.value])).toEqual([
      ['--gap', '16px'],
      ['--font', '"A; B", sans-serif'],
    ]);
  });

  it('ignores selectors that only contain :root and handles nested blocks', () => {
    const css = 'html:root { --a: 1; }\n:root:has(.x) { --b: 2; }\n:root { --c: 3; & .y { --d: 4; } --e: 5; }';
    expect(rootDeclarations(css).map((d) => d.name)).toEqual(['--c', '--e']);
  });

  it('picks the last declaration, which wins the cascade', () => {
    const css = ':root { --gap: 8px; }\n:root { --gap: 12px; }';
    const last = lastDeclarationOf(rootDeclarations(css), '--gap');
    expect(last?.value).toBe('12px');
  });
});

describe('usesVar and applyEdits', () => {
  it('detects var() uses by exact name', () => {
    expect(usesVar('.a { gap: var(--gap); }', '--gap')).toBe(true);
    expect(usesVar('.a { gap: var( --gap , 4px); }', '--gap')).toBe(true);
    expect(usesVar('.a { gap: var(--gap-lg); }', '--gap')).toBe(false);
  });

  it('replaces only the edited spans and keeps every other byte', () => {
    const css = ':root {\n  --gap:   24px  ;\n  --r: 4px; }\n';
    const decls = rootDeclarations(css);
    const out = applyEdits(
      css,
      decls.map((d) => ({ start: d.start, end: d.end, text: d.name === '--gap' ? '32px' : '6px' })),
    );
    expect(out).toBe(':root {\n  --gap:   32px  ;\n  --r: 6px; }\n');
  });
});

describe('htmlStyleRegions', () => {
  it('returns the text of each style element, not comments or scripts', () => {
    const html = '<html><head><!-- <style>:root{--x:1}</style> --><style>:root { --y: 2px; }</style><script>const s = "<style>";</script></head><body><template><style>:root{--z:3}</style></template></body></html>';
    const regions = htmlStyleRegions(html);
    const texts = regions.map((r) => html.slice(r.start, r.end));
    expect(texts).toEqual([':root { --y: 2px; }', ':root{--z:3}']);
  });
});

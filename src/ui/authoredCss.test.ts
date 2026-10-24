import { describe, expect, it } from 'vitest';
import { collapseCrumbs, formatCopyCss, isCoveredDeclaration, otherStyles, parseAuthoredReply, parseDeclarations, parseSelectionPath } from './authoredCss';

describe('parseDeclarations', () => {
  it('keeps semicolons inside url() and quotes, and keeps !important', () => {
    expect(parseDeclarations('background: url(data:image/png;base64,AAA); content: "a;b"; color: red !important;')).toEqual([
      { prop: 'background', value: 'url(data:image/png;base64,AAA)' },
      { prop: 'content', value: '"a;b"' },
      { prop: 'color', value: 'red !important' },
    ]);
  });

  it('drops empty and broken declarations and keeps custom property case', () => {
    expect(parseDeclarations(' ; nope; --Brand: #fff; /* c: d */ ')).toEqual([{ prop: '--Brand', value: '#fff' }]);
  });
});

describe('isCoveredDeclaration', () => {
  it('covers panel properties, their shorthands and longhands', () => {
    for (const prop of ['color', 'filter', 'box-shadow', 'padding', 'margin-inline', 'border', 'border-top', 'border-top-left-radius', 'font', 'row-gap', 'column-gap', 'flex-grow', 'flex-basis', 'flex-flow']) {
      expect(isCoveredDeclaration(prop, '1px'), prop).toBe(true);
    }
  });

  it('treats background as covered only when it is a color', () => {
    expect(isCoveredDeclaration('background', '#fff')).toBe(true);
    expect(isCoveredDeclaration('background', 'var(--bg) !important')).toBe(true);
    expect(isCoveredDeclaration('background', 'url(a.png) no-repeat')).toBe(false);
    expect(isCoveredDeclaration('background', 'linear-gradient(red, blue)')).toBe(false);
  });

  it('leaves other properties uncovered', () => {
    for (const prop of ['transform', 'mix-blend-mode', 'inset', 'position', 'border-collapse', 'transition', '--x']) {
      expect(isCoveredDeclaration(prop, '1px'), prop).toBe(false);
    }
  });
});

describe('otherStyles', () => {
  it('lists uncovered declarations once, the last one winning, with the source', () => {
    const rows = otherStyles({
      rules: [
        { selector: '.card', css: 'color: red; transform: rotate(1deg); filter: blur(2px);', source: 'site.css' },
        { selector: '.card.big', css: 'transform: rotate(2deg); position: relative;', source: null },
      ],
      inline: 'mix-blend-mode: multiply; padding: 4px',
    });
    expect(rows).toEqual([
      { prop: 'transform', value: 'rotate(2deg)', source: '.card.big' },
      { prop: 'position', value: 'relative', source: '.card.big' },
      { prop: 'mix-blend-mode', value: 'multiply', source: 'inline' },
    ]);
  });
});

describe('formatCopyCss', () => {
  it('writes rules in order and then the inline style', () => {
    const text = formatCopyCss({ rules: [{ selector: '.a', css: 'color: red; margin: 0px;', source: 'a.css' }], inline: 'opacity: 0.5' });
    expect(text).toBe('.a {\n  color: red;\n  margin: 0px;\n}\n\n/* inline */ {\n  opacity: 0.5;\n}');
  });

  it('skips an empty inline style', () => {
    expect(formatCopyCss({ rules: [{ selector: 'p', css: 'color: red;', source: null }], inline: ' ' })).toBe('p {\n  color: red;\n}');
  });
});

describe('parseAuthoredReply', () => {
  it('keeps only well-formed rules and caps them', () => {
    const big = 'x'.repeat(19_990);
    const parsed = parseAuthoredReply({
      rules: [{ selector: 'p', css: 'color: red;', source: 'a.css' }, { selector: 1, css: '' }, { selector: 'q', css: 'a: b', source: 5 }, { selector: 'big', css: big, source: null }],
      inline: 'color: blue',
    });
    expect(parsed).toEqual({ rules: [{ selector: 'p', css: 'color: red;', source: 'a.css' }], inline: 'color: blue' });
    expect(parseAuthoredReply({ rules: Array.from({ length: 80 }, () => ({ selector: 'p', css: 'a: b', source: null })), inline: '' })?.rules).toHaveLength(60);
  });

  it('refuses a reply without rules or inline text', () => {
    expect(parseAuthoredReply({ rules: 'x', inline: '' })).toBeNull();
    expect(parseAuthoredReply({ rules: [], inline: 3 })).toBeNull();
  });
});

describe('breadcrumb path', () => {
  const path = [1, 2, 3, 4, 5, 6].map((node) => ({ node, label: `div.n${node}` }));

  it('parses a valid path and refuses bad entries', () => {
    expect(parseSelectionPath(path.slice(0, 2))).toEqual(path.slice(0, 2));
    expect(parseSelectionPath([{ node: 1.5, label: 'a' }])).toEqual([]);
    expect(parseSelectionPath([{ node: 1, label: '' }])).toEqual([]);
    expect(parseSelectionPath('x')).toEqual([]);
  });

  it('collapses the middle of a long path', () => {
    expect(collapseCrumbs(path.slice(0, 4))).toHaveLength(4);
    const crumbs = collapseCrumbs(path);
    expect(crumbs.map((crumb) => (crumb.kind === 'node' ? crumb.entry.node : `gap:${crumb.hidden.map((entry) => entry.node).join(',')}`))).toEqual([1, 'gap:2,3', 4, 5, 6]);
  });
});

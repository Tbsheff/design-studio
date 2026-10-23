import { describe, expect, it } from 'vitest';
import { tagJsxSource } from '../preview/source-tags.js';
import { DirectEditError } from './errors.js';
import { patchJsx } from './jsx.js';

function locOf(source: string, tag: string, nth = 0, file = 'App.tsx'): { line: number; col: number } {
  const tagged = tagJsxSource(source, file, file);
  if (!tagged) throw new Error('no tags');
  const pattern = new RegExp(`<${tag} data-studio-loc="${file.replace('.', '\\.')}:(\\d+):(\\d+)"`, 'g');
  const matches = [...tagged.code.matchAll(pattern)];
  const match = matches[nth];
  if (!match) throw new Error(`no loc for ${tag}`);
  return { line: Number(match[1]), col: Number(match[2]) };
}

function errorCode(run: () => unknown): string | null {
  try {
    run();
  } catch (error) {
    if (error instanceof DirectEditError) return error.code;
    throw error;
  }
  return null;
}

const APP = `import { useState } from 'react';
import { Card } from './Card';

function pick<T extends object>(items: T[]): T | undefined {
  return items[0];
}

const styles = { box: { color: 'red' } };

export default function App(): JSX.Element {
  const [count] = useState<number>(0);
  return (
    <>
      <main className="page">
        <h1>Hello world</h1>
        <p style={{ color: "red", padding: 8, marginTop: '4px' }}>Intro</p>
        <section style={styles.box}>Boxed</section>
        <Card title="x">
          <span>{'Literal'}</span>
        </Card>
        <div>
          Count <b>{count}</b>
        </div>
        <img src="a.png" />
        <em style={{ ...styles.box, color }}>e</em>
      </main>
    </>
  );
}
`;

describe('patchJsx style', () => {
  it('writes a token reference as a string literal', () => {
    const result = patchJsx(APP, locOf(APP, 'h1'), { style: { color: 'var(--primary)', 'padding-top': 'var(--space-4, 16px)' } });
    expect(result.code).toContain(`<h1 style={{ color: 'var(--primary)', paddingTop: 'var(--space-4, 16px)' }}>Hello world</h1>`);
  });

  it('inserts a style prop after the tag name', () => {
    const result = patchJsx(APP, locOf(APP, 'h1'), { style: { 'font-size': '20px', color: '#fff' } });
    expect(result.code).toContain(`<h1 style={{ fontSize: '20px', color: '#fff' }}>Hello world</h1>`);
    expect(result.tag).toBe('h1');
    const at = APP.indexOf('<h1') + 3;
    expect(result.code).toBe(`${APP.slice(0, at)} style={{ fontSize: '20px', color: '#fff' }}${APP.slice(at)}`);
  });

  it('updates an existing object style keeping untouched numbers and quote style', () => {
    const result = patchJsx(APP, locOf(APP, 'p'), { style: { color: 'blue', 'padding-top': '2px' } });
    expect(result.code).toContain(`<p style={{ color: "blue", padding: 8, marginTop: '4px', paddingTop: "2px" }}>Intro</p>`);
  });

  it('replaces a numeric value with a string', () => {
    const source = `const a = <div style={{ opacity: 1, width: 10 }}>x</div>;`;
    const result = patchJsx(source, { line: 1, col: 11 }, { style: { width: '50%' } });
    expect(result.code).toBe(`const a = <div style={{ opacity: 1, width: '50%' }}>x</div>;`);
  });

  it('removes properties with null', () => {
    const middle = patchJsx(APP, locOf(APP, 'p'), { style: { padding: null } as Record<string, string | null> });
    expect(middle.code).toContain(`<p style={{ color: "red", marginTop: '4px' }}>`);
    const last = patchJsx(APP, locOf(APP, 'p'), { style: { 'margin-top': null } });
    expect(last.code).toContain(`<p style={{ color: "red", padding: 8 }}>`);
    const tail = patchJsx(APP, locOf(APP, 'p'), { style: { 'margin-top': null, color: 'blue' } });
    expect(tail.code).toContain(`<p style={{ color: "blue", padding: 8 }}>`);
  });

  it('removes the style prop when nothing is left', () => {
    const source = `const a = <div id="a" style={{ color: 'red' }}>x</div>;`;
    const result = patchJsx(source, { line: 1, col: 11 }, { style: { color: null } });
    expect(result.code).toBe(`const a = <div id="a">x</div>;`);
  });

  it('replaces the content when every property is removed and one is added', () => {
    const source = `const a = <div style={{ color: 'red' }}>x</div>;`;
    const result = patchJsx(source, { line: 1, col: 11 }, { style: { color: null, width: '1px' } });
    expect(result.code).toBe(`const a = <div style={{ width: '1px' }}>x</div>;`);
  });

  it('matches string keys written in kebab case', () => {
    const source = `const a = <div style={{ 'font-size': 12 }}>x</div>;`;
    const result = patchJsx(source, { line: 1, col: 11 }, { style: { 'font-size': '14px' } });
    expect(result.code).toBe(`const a = <div style={{ 'font-size': '14px' }}>x</div>;`);
  });

  it('expands shorthand properties and appends after spreads', () => {
    const result = patchJsx(APP, locOf(APP, 'em'), { style: { color: 'red', width: '1px' } });
    expect(result.code).toContain(`<em style={{ ...styles.box, color: 'red', width: '1px' }}>e</em>`);
  });

  it('refuses a style that is not an object literal', () => {
    expect(errorCode(() => patchJsx(APP, locOf(APP, 'section'), { style: { color: 'red' } }))).toBe('style_not_literal');
  });

  it('styles self-closing elements', () => {
    const result = patchJsx(APP, locOf(APP, 'img'), { style: { width: '10px' } });
    expect(result.code).toContain(`<img style={{ width: '10px' }} src="a.png" />`);
  });
});

describe('patchJsx text', () => {
  it('replaces a JSXText leaf and escapes JSX characters', () => {
    const result = patchJsx(APP, locOf(APP, 'h1'), { text: 'a {b} <c> & d' });
    expect(result.code).toContain('<h1>a &#123;b&#125; &lt;c&gt; &amp; d</h1>');
    const at = APP.indexOf('Hello world');
    expect(result.code).toBe(`${APP.slice(0, at)}a &#123;b&#125; &lt;c&gt; &amp; d${APP.slice(at + 'Hello world'.length)}`);
  });

  it('replaces a single string literal child', () => {
    const result = patchJsx(APP, locOf(APP, 'span'), { text: "It's" });
    expect(result.code).toContain(`<span>{'It\\'s'}</span>`);
  });

  it('keeps whitespace and newlines around multi-line text', () => {
    const source = `const a = (\n  <p>\n    Old\n  </p>\n);`;
    const result = patchJsx(source, { line: 2, col: 3 }, { text: 'New' });
    expect(result.code).toBe(`const a = (\n  <p>\n    New\n  </p>\n);`);
  });

  it('refuses text when the element has children', () => {
    let caught: unknown;
    try {
      patchJsx(APP, locOf(APP, 'div'), { text: 'x' });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(DirectEditError);
    expect((caught as DirectEditError).code).toBe('text_not_editable');
    expect((caught as DirectEditError).message).toBe('This element has child elements; edit a leaf element or ask the agent');
    expect(errorCode(() => patchJsx(APP, locOf(APP, 'img'), { text: 'x' }))).toBe('text_not_editable');
    expect(errorCode(() => patchJsx(APP, locOf(APP, 'b'), { text: 'x' }))).toBe('text_not_editable');
  });
});

describe('patchJsx scope', () => {
  it('parses TSX with generics and leaves them untouched', () => {
    const result = patchJsx(APP, locOf(APP, 'main'), { style: { gap: '8px' } });
    const at = APP.indexOf('<main') + 5;
    expect(result.code).toBe(`${APP.slice(0, at)} style={{ gap: '8px' }}${APP.slice(at)}`);
    expect(result.code).toContain('function pick<T extends object>(items: T[]): T | undefined');
    expect(result.code).toContain('useState<number>(0)');
  });

  it('never edits fragments or components', () => {
    expect(errorCode(() => patchJsx(APP, { line: 18, col: 9 }, { style: { color: 'red' } }))).toBe('not_host_element');
    expect(errorCode(() => patchJsx(APP, { line: 13, col: 5 }, { style: { color: 'red' } }))).toBe('element_not_found');
    const result = patchJsx(APP, locOf(APP, 'span'), { style: { color: 'red' } });
    expect(result.code).toContain('<Card title="x">');
    expect(result.code).toContain('    <>\n');
    expect(result.code).toContain(`<span style={{ color: 'red' }}>{'Literal'}</span>`);
  });

  it('parses plain JSX without the typescript plugin', () => {
    const source = `export const A = () => <div>hi</div>;\n`;
    const result = patchJsx(source, locOf(source, 'div', 0, 'A.jsx'), { text: 'yo' }, { typescript: false });
    expect(result.code).toBe(`export const A = () => <div>yo</div>;\n`);
  });

  it('reports parse failures', () => {
    expect(errorCode(() => patchJsx('const = <div', { line: 1, col: 1 }, { text: 'x' }))).toBe('parse_failed');
  });
});

describe('patchJsx stale selection', () => {
  it('refuses when the element at the loc has a different tag', () => {
    const before = APP;
    expect(errorCode(() => patchJsx(APP, locOf(APP, 'h1'), { tag: 'p', style: { color: 'blue' } }))).toBe('stale_selection');
    expect(APP).toBe(before);
  });

  it('applies the edit when the tag matches', () => {
    const result = patchJsx(APP, locOf(APP, 'h1'), { tag: 'h1', style: { color: 'blue' } });
    expect(result.code).toContain(`<h1 style={{ color: 'blue' }}>Hello world</h1>`);
  });
});

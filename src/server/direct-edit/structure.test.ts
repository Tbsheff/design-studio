import { describe, expect, it } from 'vitest';
import { annotateHtml } from '../preview/annotate.js';
import { tagJsxSource } from '../preview/source-tags.js';
import { DirectEditError } from './errors.js';
import { patchHtml } from './html.js';
import { patchJsx } from './jsx.js';
import { parseDirectEditRequest } from './validate.js';

function locAt(source: string, needle: string): { line: number; col: number } {
  const index = source.indexOf(`<${needle}`);
  if (index < 0) throw new Error(`no ${needle}`);
  const before = source.slice(0, index);
  return { line: before.split('\n').length, col: index - before.lastIndexOf('\n') };
}

function taggedLoc(code: string, file: string, tag: string): { line: number; col: number } {
  const match = new RegExp(`<${tag} data-studio-loc="${file.replace('.', '\\.')}:(\\d+):(\\d+)"`).exec(code);
  if (!match) throw new Error(`no loc for ${tag}`);
  return { line: Number(match[1]), col: Number(match[2]) };
}

const htmlLoc = locAt;
const jsxLoc = locAt;

function failure(run: () => unknown): { code: string; message: string } | null {
  try {
    run();
  } catch (error) {
    if (error instanceof DirectEditError) return { code: error.code, message: error.message };
    throw error;
  }
  return null;
}

function sortedChars(text: string): string {
  return [...text].sort().join('');
}

const PAGE = `<!doctype html>
<html>
  <body>
    <main>
      <article class="card" id="one"><h3>One</h3></article>
      <!-- note -->
      <article class="card" id="two"><h3>Two</h3>
      </article>
      <section id="three">Three</section>
    </main>
    <p id="lead">Lead <b>bold</b></p>
    <div id="styled" style="padding:8px">Styled</div>
    <ul><li id="open">Open item
    </ul>
  </body>
</html>
`;

describe('source positions', () => {
  it('match the preview tags', () => {
    expect(locAt(PAGE, 'section')).toEqual(taggedLoc(annotateHtml(PAGE, 'index.html', { injectBridge: false }), 'index.html', 'section'));
    const tagged = tagJsxSource(APP, 'App.tsx', 'App.tsx');
    expect(locAt(APP, 'footer')).toEqual(taggedLoc(tagged?.code ?? '', 'App.tsx', 'footer'));
  });
});

describe('patchHtml move', () => {
  it('swaps the full source ranges and keeps the bytes between them', () => {
    const result = patchHtml(PAGE, htmlLoc(PAGE, 'article class="card" id="one"'), { move: 'down', tag: 'article' });
    const one = '<article class="card" id="one"><h3>One</h3></article>';
    const two = '<article class="card" id="two"><h3>Two</h3>\n      </article>';
    const between = '\n      <!-- note -->\n      ';
    const start = PAGE.indexOf(one);
    expect(result.code.slice(0, start)).toBe(PAGE.slice(0, start));
    expect(result.code.slice(start, start + two.length + between.length + one.length)).toBe(two + between + one);
    expect(result.code.slice(start + two.length + between.length + one.length)).toBe(PAGE.slice(PAGE.indexOf(two) + two.length));
    expect(result.code.length).toBe(PAGE.length);
    expect(sortedChars(result.code)).toBe(sortedChars(PAGE));
    expect(result.moved).toEqual(htmlLoc(result.code, 'article class="card" id="one"'));
  });

  it('moves up and reports the new start of the moved element', () => {
    const result = patchHtml(PAGE, htmlLoc(PAGE, 'section'), { move: 'up' });
    expect(result.code.indexOf('id="three"')).toBeLessThan(result.code.indexOf('id="two"'));
    expect(result.moved).toEqual(htmlLoc(result.code, 'section'));
    const back = patchHtml(result.code, htmlLoc(result.code, 'section'), { move: 'down' });
    expect(back.code).toBe(PAGE);
  });

  it('refuses at the first and last place, next to text, and without a closing tag', () => {
    expect(failure(() => patchHtml(PAGE, htmlLoc(PAGE, 'article class="card" id="one"'), { move: 'up' }))).toEqual({
      code: 'cannot_move',
      message: 'This element is already first among its siblings',
    });
    expect(failure(() => patchHtml(PAGE, htmlLoc(PAGE, 'section'), { move: 'down' }))?.message).toBe('This element is already last among its siblings');
    expect(failure(() => patchHtml(PAGE, htmlLoc(PAGE, 'b'), { move: 'up' }))?.code).toBe('cannot_move');
    expect(failure(() => patchHtml(PAGE, htmlLoc(PAGE, 'li'), { move: 'up' }))?.code).toBe('cannot_move');
    expect(failure(() => patchHtml(PAGE, htmlLoc(PAGE, 'main'), { move: 'down' }))).toBeNull();
  });
});

describe('patchHtml rename and visibility', () => {
  it('adds, replaces and removes data-name', () => {
    const named = patchHtml(PAGE, htmlLoc(PAGE, 'section'), { name: 'Hero title' });
    expect(named.code).toBe(PAGE.replace('<section id="three">', '<section data-name="Hero title" id="three">'));
    const renamed = patchHtml(named.code, htmlLoc(named.code, 'section'), { name: 'Hero' });
    expect(renamed.code).toBe(PAGE.replace('<section id="three">', '<section data-name="Hero" id="three">'));
    expect(patchHtml(renamed.code, htmlLoc(renamed.code, 'section'), { name: null }).code).toBe(PAGE);
  });

  it('hide then show restores the original bytes, with and without a style attribute', () => {
    for (const marker of ['section', 'div id="styled"', 'p']) {
      const hidden = patchHtml(PAGE, htmlLoc(PAGE, marker), { style: { display: 'none' } });
      expect(hidden.code).toContain('display: none');
      const shown = patchHtml(hidden.code, htmlLoc(hidden.code, marker), { style: { display: null } });
      expect(shown.code).toBe(PAGE);
    }
  });
});

const APP = `import { Card } from './Card';

const items = ['a', 'b'];

export default function App(): JSX.Element {
  return (
    <main>
      <article className="card" id="one">
        <h3>One</h3>
      </article>
      <article className="card" id="two"><h3>Two</h3></article>
      <Card title="three" />
      {items.map((item) => (
        <section key={item}>
          <span>{item}</span>
          <b>tail</b>
        </section>
      ))}
      <footer data-name={label}>Foot</footer>
    </main>
  );
}
`;

describe('patchJsx move', () => {
  it('swaps sibling elements and keeps whitespace in place', () => {
    const result = patchJsx(APP, jsxLoc(APP, 'article className="card" id="one"'), { move: 'down' });
    const one = '<article className="card" id="one">\n        <h3>One</h3>\n      </article>';
    const two = '<article className="card" id="two"><h3>Two</h3></article>';
    expect(result.code).toBe(APP.replace(`${one}\n      ${two}`, `${two}\n      ${one}`));
    expect(result.moved).toEqual(jsxLoc(result.code, 'article className="card" id="one"'));
    const back = patchJsx(result.code, jsxLoc(result.code, 'article className="card" id="one"'), { move: 'up' });
    expect(back.code).toBe(APP);
  });

  it('swaps with a component sibling', () => {
    const result = patchJsx(APP, jsxLoc(APP, 'article className="card" id="two"'), { move: 'down' });
    expect(result.code.indexOf('<Card')).toBeLessThan(result.code.indexOf('id="two"'));
  });

  it('refuses next to an expression container, inside a .map(), at the edges and at the root', () => {
    expect(failure(() => patchJsx(APP, jsxLoc(APP, 'footer'), { move: 'up' }))?.message).toMatch(/code or text/);
    expect(failure(() => patchJsx(APP, jsxLoc(APP, 'span'), { move: 'down' }))?.message).toMatch(/\.map\(\)/);
    expect(failure(() => patchJsx(APP, jsxLoc(APP, 'section'), { move: 'up' }))?.message).toMatch(/\.map\(\)/);
    expect(failure(() => patchJsx(APP, jsxLoc(APP, 'article className="card" id="one"'), { move: 'up' }))?.message).toMatch(/already first/);
    expect(failure(() => patchJsx(APP, jsxLoc(APP, 'footer'), { move: 'down' }))?.message).toMatch(/already last/);
    expect(failure(() => patchJsx(APP, jsxLoc(APP, 'main'), { move: 'down' }))?.code).toBe('cannot_move');
  });
});

describe('patchJsx rename and visibility', () => {
  it('adds, replaces and removes data-name; refuses an expression', () => {
    const named = patchJsx(APP, jsxLoc(APP, 'h3'), { name: 'Hero title' });
    expect(named.code).toBe(APP.replace('<h3>One', '<h3 data-name="Hero title">One'));
    const renamed = patchJsx(named.code, jsxLoc(named.code, 'h3'), { name: 'Hero' });
    expect(renamed.code).toBe(APP.replace('<h3>One', '<h3 data-name="Hero">One'));
    expect(patchJsx(renamed.code, jsxLoc(renamed.code, 'h3'), { name: null }).code).toBe(APP);
    expect(failure(() => patchJsx(APP, jsxLoc(APP, 'footer'), { name: 'Foot' }))?.code).toBe('attribute_not_literal');
  });

  it('hide then show restores the original bytes', () => {
    const hidden = patchJsx(APP, jsxLoc(APP, 'h3'), { style: { display: 'none' } });
    expect(hidden.code).toContain(`<h3 style={{ display: 'none' }}>`);
    expect(patchJsx(hidden.code, jsxLoc(hidden.code, 'h3'), { style: { display: null } }).code).toBe(APP);
  });
});

describe('parseDirectEditRequest name and move', () => {
  const base = { source: { file: 'index.html', line: 1, col: 1 }, selector: 'h1' };

  it('accepts a name, a null name and a move', () => {
    expect(parseDirectEditRequest({ ...base, name: 'Hero title' }).name).toBe('Hero title');
    expect(parseDirectEditRequest({ ...base, name: null }).name).toBeNull();
    expect(parseDirectEditRequest({ ...base, move: 'down' }).move).toBe('down');
  });

  it('refuses unsafe names, a move with other changes and an empty request', () => {
    for (const name of ['', ' padded', 'a"b', 'a<b', 'a{b}', 'a&b', 'x'.repeat(61)]) {
      expect(failure(() => parseDirectEditRequest({ ...base, name }))?.code).toBe('invalid_request');
    }
    expect(failure(() => parseDirectEditRequest({ ...base, move: 'left' }))?.code).toBe('invalid_request');
    expect(failure(() => parseDirectEditRequest({ ...base, move: 'up', name: 'x' }))?.code).toBe('invalid_request');
    expect(failure(() => parseDirectEditRequest({ ...base, move: 'up', style: { color: 'red' } }))?.code).toBe('invalid_request');
    expect(failure(() => parseDirectEditRequest(base))?.code).toBe('invalid_request');
  });
});

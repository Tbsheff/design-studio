import { describe, expect, it } from 'vitest';
import { annotateHtml } from '../preview/annotate.js';
import { DirectEditError } from './errors.js';
import { patchHtml } from './html.js';

function locOf(source: string, marker: string): { line: number; col: number } {
  const annotated = annotateHtml(source, 'index.html', { injectBridge: false });
  const pattern = new RegExp(`<${marker} data-studio-loc="index\\.html:(\\d+):(\\d+)"`);
  const match = pattern.exec(annotated);
  if (!match) throw new Error(`no loc for ${marker}`);
  return { line: Number(match[1]), col: Number(match[2]) };
}

function expectOnlyChanged(before: string, after: string, start: number, removedLength: number): void {
  const insertedLength = after.length - before.length + removedLength;
  expect(after.slice(0, start)).toBe(before.slice(0, start));
  expect(after.slice(start + insertedLength)).toBe(before.slice(start + removedLength));
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

const PAGE = `<!doctype html>
<html>
  <head><title>T</title></head>
  <body>
    <h1 class="title">Hello</h1>
    <p id="intro" style="color: red; margin: 0 auto; font-family: 'A;B', serif">Intro <b>bold</b></p>
    <img src="a.png" alt="x > y">
    <br/>
  </body>
</html>
`;

describe('patchHtml style', () => {
  it('writes a token reference into the style attribute', () => {
    const result = patchHtml(PAGE, locOf(PAGE, 'h1'), { style: { color: 'var(--primary)', 'margin-top': 'var(--space-4, 16px)' } });
    expect(result.code).toContain('<h1 style="color: var(--primary); margin-top: var(--space-4, 16px);" class="title">Hello</h1>');
  });

  it('adds a style attribute to a tag without one', () => {
    const result = patchHtml(PAGE, locOf(PAGE, 'h1'), { style: { color: '#123456', 'font-size': '20px' } });
    expect(result.code).toContain('<h1 style="color: #123456; font-size: 20px;" class="title">Hello</h1>');
    expect(result.tag).toBe('h1');
    expect(result.applied).toEqual({ style: ['color', 'font-size'], text: false });
    const at = PAGE.indexOf('<h1') + 3;
    expectOnlyChanged(PAGE, result.code, at, 0);
  });

  it('merges into an existing style and keeps other declarations in order', () => {
    const result = patchHtml(PAGE, locOf(PAGE, 'p'), { style: { color: 'blue', 'font-size': '14px' } });
    expect(result.code).toContain(
      `<p id="intro" style="color: blue; margin: 0 auto; font-family: 'A;B', serif; font-size: 14px;">Intro <b>bold</b></p>`,
    );
    const start = PAGE.indexOf('style="color: red');
    const end = PAGE.indexOf('serif"') + 'serif"'.length;
    expectOnlyChanged(PAGE, result.code, start, end - start);
  });

  it('removes a property with null', () => {
    const result = patchHtml(PAGE, locOf(PAGE, 'p'), { style: { color: null } });
    expect(result.code).toContain(`<p id="intro" style="margin: 0 auto; font-family: 'A;B', serif;">`);
  });

  it('removes the whole attribute when no declaration is left', () => {
    const source = '<body><div class="a" style="color: red">x</div></body>';
    const result = patchHtml(source, { line: 1, col: 7 }, { style: { color: null } });
    expect(result.code).toBe('<body><div class="a">x</div></body>');
  });

  it('leaves the source alone when removing from a tag without style', () => {
    const result = patchHtml(PAGE, locOf(PAGE, 'h1'), { style: { color: null } });
    expect(result.code).toBe(PAGE);
  });

  it('handles attributes with > inside quotes', () => {
    const result = patchHtml(PAGE, locOf(PAGE, 'img'), { style: { width: '50%' } });
    expect(result.code).toContain('<img style="width: 50%;" src="a.png" alt="x > y">');
  });

  it('styles void and self-closing elements', () => {
    const result = patchHtml(PAGE, locOf(PAGE, 'br'), { style: { height: '2px' } });
    expect(result.code).toContain('<br style="height: 2px;"/>');
  });

  it('escapes quotes and ampersands in the attribute', () => {
    const result = patchHtml(PAGE, locOf(PAGE, 'h1'), { style: { 'font-family': '"Inter" & co' } });
    expect(result.code).toContain('style="font-family: &quot;Inter&quot; &amp; co;"');
  });

  it('decodes an entity-encoded style before merging', () => {
    const source = '<body><p style="font-family: &quot;X&quot;; color: red">t</p></body>';
    const result = patchHtml(source, { line: 1, col: 7 }, { style: { color: 'blue' } });
    expect(result.code).toBe('<body><p style="font-family: &quot;X&quot;; color: blue;">t</p></body>');
  });

  it('keeps url() values with semicolons intact', () => {
    const source = '<body><div style="background-image: url(data:image/png;base64,AAAA); color: red">t</div></body>';
    const result = patchHtml(source, { line: 1, col: 7 }, { style: { color: 'blue' } });
    expect(result.code).toContain('style="background-image: url(data:image/png;base64,AAAA); color: blue;"');
  });

  it('finds elements inside template content', () => {
    const source = '<body><template><span>a</span></template></body>';
    const result = patchHtml(source, { line: 1, col: 17 }, { style: { color: 'red' } });
    expect(result.code).toBe('<body><template><span style="color: red;">a</span></template></body>');
  });

  it('throws element_not_found for a loc that does not start a tag', () => {
    expect(errorCode(() => patchHtml(PAGE, { line: 5, col: 6 }, { style: { color: 'red' } }))).toBe('element_not_found');
  });
});

describe('patchHtml text', () => {
  it('edits the text of a leaf element', () => {
    const result = patchHtml(PAGE, locOf(PAGE, 'h1'), { text: 'Bye <now> & then' });
    expect(result.code).toContain('<h1 class="title">Bye &lt;now&gt; &amp; then</h1>');
    expect(result.applied).toEqual({ style: [], text: true });
    expectOnlyChanged(PAGE, result.code, PAGE.indexOf('Hello'), 'Hello'.length);
  });

  it('keeps whitespace around the text', () => {
    const source = '<body>\n  <p>\n    Old text\n  </p>\n</body>';
    const result = patchHtml(source, { line: 2, col: 3 }, { text: 'New' });
    expect(result.code).toBe('<body>\n  <p>\n    New\n  </p>\n</body>');
  });

  it('fills an empty element', () => {
    const source = '<body><p></p></body>';
    expect(patchHtml(source, { line: 1, col: 7 }, { text: 'x' }).code).toBe('<body><p>x</p></body>');
  });

  it('refuses an element with child elements', () => {
    let caught: unknown;
    try {
      patchHtml(PAGE, locOf(PAGE, 'p'), { text: 'x' });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(DirectEditError);
    expect((caught as DirectEditError).code).toBe('text_not_editable');
    expect((caught as DirectEditError).message).toBe('This element has child elements; edit a leaf element or ask the agent');
  });

  it('refuses void and script elements', () => {
    expect(errorCode(() => patchHtml(PAGE, locOf(PAGE, 'img'), { text: 'x' }))).toBe('text_not_editable');
    const source = '<body><script>let a = 1;</script></body>';
    expect(errorCode(() => patchHtml(source, { line: 1, col: 7 }, { text: 'x' }))).toBe('text_not_editable');
  });

  it('writes unicode text and keeps unicode elsewhere', () => {
    const source = '<body>\n<p>café \u{1F600}</p><h2>日本</h2>\n</body>';
    const result = patchHtml(source, locOf(source, 'h2'), { text: '\u{1F680} naïve 中文' });
    expect(result.code).toBe('<body>\n<p>café \u{1F600}</p><h2>\u{1F680} naïve 中文</h2>\n</body>');
  });

  it('applies style and text together', () => {
    const result = patchHtml(PAGE, locOf(PAGE, 'h1'), { style: { color: 'red' }, text: 'Both' });
    expect(result.code).toContain('<h1 style="color: red;" class="title">Both</h1>');
    expect(result.applied).toEqual({ style: ['color'], text: true });
  });
});

describe('patchHtml byte fidelity', () => {
  it('keeps every byte outside the edit with CRLF line ends and a BOM', () => {
    const source = '﻿<!doctype html>\r\n<html>\r\n<body>\r\n  <!-- note -->\r\n  <h1   data-x=\'1\'>Hi</h1>\r\n  <p>Téxt</p>\r\n</body>\r\n</html>\r\n';
    const h1 = locOf(source, 'h1');
    const styled = patchHtml(source, h1, { style: { color: 'red' } });
    const at = source.indexOf('<h1') + 3;
    expect(styled.code).toBe(`${source.slice(0, at)} style="color: red;"${source.slice(at)}`);
    const texted = patchHtml(source, locOf(source, 'p'), { text: 'New' });
    const textAt = source.indexOf('Téxt');
    expect(texted.code).toBe(`${source.slice(0, textAt)}New${source.slice(textAt + 4)}`);
  });

  it('matches the loc that the preview annotation produces for every element', () => {
    const tags = ['h1', 'img', 'br', 'b'];
    for (const tag of tags) {
      const result = patchHtml(PAGE, locOf(PAGE, tag), { style: { opacity: '0.5' } });
      expect(result.tag).toBe(tag);
      expect(result.code).toContain(`<${tag} style="opacity: 0.5;"`);
    }
  });
});

describe('patchHtml stale selection', () => {
  it('refuses when the element at the loc has a different tag', () => {
    const before = PAGE;
    expect(errorCode(() => patchHtml(PAGE, locOf(PAGE, 'h1'), { tag: 'p', text: 'Changed' }))).toBe('stale_selection');
    expect(PAGE).toBe(before);
  });

  it('applies the edit when the tag matches', () => {
    const result = patchHtml(PAGE, locOf(PAGE, 'h1'), { tag: 'h1', text: 'Changed' });
    expect(result.code).toContain('<h1 class="title">Changed</h1>');
  });
});

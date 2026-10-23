import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { annotateHtml, BRIDGE_SCRIPT_TAG } from './annotate.js';

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../e2e/fixtures');

function generatedPage(groups: number): string {
  const parts: string[] = [];
  for (let i = 0; i < groups; i += 1) {
    parts.push(`<section id="s${i}" title="a > ${i}">`, `<h2 class="t">Title ${i}</h2>`, `<p>text <b>bold <i>it</i></b> é</p>`, `<ul><li>${i}</li><li><a href="#${i}">x</a></li></ul>`, `<img src="i${i}.png"><br/>`, `</section>`);
  }
  return `<!doctype html>\n<html><head><meta charset="utf-8"><title>gen</title></head>\n<body>\n${parts.join('\n')}\n</body></html>`;
}

const GOLDEN: { name: string; source: () => string; sha256: string; locCount: number }[] = [
  { name: 'layout-clipping.html', source: () => readFileSync(path.join(FIXTURES, 'layout-clipping.html'), 'utf8'), sha256: '0862c64accbd840e39c811b526b401e2623a22cb5eabe8944b25ed1f2b647a4b', locCount: 27 },
  { name: 'pricing-doubled.html', source: () => readFileSync(path.join(FIXTURES, 'pricing-doubled.html'), 'utf8'), sha256: 'a933bf3d3ca18ac4e37f402383e01f66cab07bd9ef29e68c5bb5771f3a9fcbab', locCount: 207 },
  { name: 'pricing-generic.html', source: () => readFileSync(path.join(FIXTURES, 'pricing-generic.html'), 'utf8'), sha256: 'e6f9abb12a2a761f0d5b117854ea16cef3bf3e1430c3e1c0647bb406e6dd0d96', locCount: 31 },
  { name: 'pricing-responsive.html', source: () => readFileSync(path.join(FIXTURES, 'pricing-responsive.html'), 'utf8'), sha256: '75a1d1296e3b5bbdf2e47ba054e31ce82c72a843a1504ee0e661ae8cba72d0f0', locCount: 31 },
  { name: 'pricing-table-first.html', source: () => readFileSync(path.join(FIXTURES, 'pricing-table-first.html'), 'utf8'), sha256: 'bb287c54c4cb5e334cfd4acd66930aecc3d839dc6e20050baff0beba13ec74f4', locCount: 19 },
  { name: 'pricing-table-then-cards.html', source: () => readFileSync(path.join(FIXTURES, 'pricing-table-then-cards.html'), 'utf8'), sha256: '06bd34c1922a863b0413628bad00ed643e1946bf561ad2509e8ece4c7cc2d254', locCount: 31 },
  { name: 'quality-checks.html', source: () => readFileSync(path.join(FIXTURES, 'quality-checks.html'), 'utf8'), sha256: 'e68266d39a416dc635481647e596d29283d87d117e86d5747a1a250c35f8dd01', locCount: 19 },
  { name: 'generated', source: () => generatedPage(455), sha256: '25fe8dc9517f2aec57540863e2dae0acc6ec4a136cb336d419d7f76747151127', locCount: 5005 },
  { name: 'misnested', source: () => '<html><head></head><body><b>1<p>2</b>3</p><i><div>x</i>y</div></body></html>', sha256: '1129f477456c4c6267fc8cabc516df8cd320e0f14c064d5853898939c8dfabd3', locCount: 4 },
  { name: 'foster', source: () => '<body><table>stray<tr><td>a</td>text<td><span>b</span></td></tr></table><template><div>t</div></template></body>', sha256: '2cdcdae1d94d913b34be4c2c0f29ca034f9d9d6dcd7a66e39a4190a60c848a80', locCount: 7 },
];

const LOC_PATTERN = / data-studio-loc="[^"]*"/g;

function stripAnnotations(html: string): string {
  return html.replace(LOC_PATTERN, '').replace(BRIDGE_SCRIPT_TAG, '');
}

function locs(html: string): string[] {
  return [...html.matchAll(/data-studio-loc="([^"]*)"/g)].map((match) => match[1] ?? '');
}

describe('annotateHtml', () => {
  it('adds line:col for each element in body and keeps all other bytes', () => {
    const source = [
      '<!doctype html>',
      '<html>',
      '  <head><title>T</title></head>',
      '  <body class="x">',
      '    <main>',
      '      <h1 id="a">Hi</h1>',
      '  <p>text <b>bold</b></p>',
      '    </main>',
      '  </body>',
      '</html>',
    ].join('\n');
    const output = annotateHtml(source, 'index.html');
    expect(stripAnnotations(output)).toBe(source);
    expect(locs(output)).toEqual(['index.html:5:5', 'index.html:6:7', 'index.html:7:3', 'index.html:7:11']);
    expect(output).toContain('<h1 data-studio-loc="index.html:6:7" id="a">');
    expect(output).toContain('<body class="x">');
    expect(output).not.toContain('<title data-studio-loc');
  });

  it('injects the bridge right after the head start tag', () => {
    const source = '<!doctype html><html><head lang="en"><meta charset="utf-8"></head><body><div></div></body></html>';
    const output = annotateHtml(source, 'a.html');
    expect(output.startsWith(`<!doctype html><html><head lang="en">${BRIDGE_SCRIPT_TAG}<meta charset="utf-8">`)).toBe(true);
  });

  it('handles documents with no head', () => {
    const source = '<div>one</div>\n<span>two</span>';
    const output = annotateHtml(source, 'frag.html');
    expect(output.startsWith(BRIDGE_SCRIPT_TAG)).toBe(true);
    expect(stripAnnotations(output)).toBe(source);
    expect(locs(output)).toEqual(['frag.html:1:1', 'frag.html:2:1']);
  });

  it('puts the bridge after the doctype when head and html tags are missing', () => {
    const source = '<!DOCTYPE html>\n<p>x</p>';
    const output = annotateHtml(source, 'x.html');
    expect(output).toBe(`<!DOCTYPE html>${BRIDGE_SCRIPT_TAG}\n<p data-studio-loc="x.html:2:1">x</p>`);
  });

  it('handles void and self-closed elements', () => {
    const source = '<html><head></head><body><img src="a.png"><br/><input type="text" /><hr></body></html>';
    const output = annotateHtml(source, 'v.html');
    expect(stripAnnotations(output)).toBe(source);
    expect(output).toContain('<img data-studio-loc="v.html:1:26" src="a.png">');
    expect(output).toContain('<br data-studio-loc="v.html:1:43"/>');
    expect(output).toContain('<input data-studio-loc="v.html:1:48" type="text" />');
    expect(output).toContain('<hr data-studio-loc="v.html:1:69">');
  });

  it('handles attributes with > inside quotes', () => {
    const source = '<body><a title="a > b" href=\'x>y\'>link</a><div data-x="<p>">z</div></body>';
    const output = annotateHtml(source, 'q.html');
    expect(stripAnnotations(output)).toBe(source);
    expect(output).toContain('<a data-studio-loc="q.html:1:7" title="a > b" href=\'x>y\'>link</a>');
    expect(output).toContain('<div data-studio-loc="q.html:1:43" data-x="<p>">z</div>');
    expect(locs(output)).toHaveLength(2);
  });

  it('keeps an existing data-studio-loc and escapes file names', () => {
    const source = '<body><div data-studio-loc="keep:1:1"></div><p></p></body>';
    const output = annotateHtml(source, 'a"b.html');
    expect(output).toBe(`${BRIDGE_SCRIPT_TAG}<body><div data-studio-loc="keep:1:1"></div><p data-studio-loc="a&quot;b.html:1:45"></p></body>`);
  });

  it('keeps non-ascii text and line positions stable', () => {
    const source = '<html><head></head><body>\n<p>héllo — ✓</p>\n<em>after</em></body></html>';
    const output = annotateHtml(source, 'u.html');
    expect(stripAnnotations(output)).toBe(source);
    expect(locs(output)).toEqual(['u.html:2:1', 'u.html:3:1']);
  });

  it.each(GOLDEN)('keeps the exact output bytes for $name', ({ source, sha256, locCount }) => {
    const output = annotateHtml(source(), 'index.html');
    expect(locs(output)).toHaveLength(locCount);
    expect(createHash('sha256').update(output).digest('hex')).toBe(sha256);
  });
});

import { describe, expect, it } from 'vitest';
import { annotateHtml, BRIDGE_SCRIPT_TAG } from './annotate.js';

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
});

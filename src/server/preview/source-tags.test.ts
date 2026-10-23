import { describe, expect, it } from 'vitest';
import { tagJsxSource } from './source-tags.js';

function locs(code: string): string[] {
  return [...code.matchAll(/data-studio-loc="([^"]*)"/g)].map((match) => match[1] ?? '');
}

describe('tagJsxSource', () => {
  it('tags lowercase host elements with line and 1-based col', () => {
    const source = [
      'export function App() {',
      '  return (',
      '    <main className="a">',
      '      <h1>Hi</h1>',
      '      <img src="x.png" />',
      '    </main>',
      '  );',
      '}',
    ].join('\n');
    const result = tagJsxSource(source, '/root/src/App.tsx', 'src/App.tsx');
    expect(result).not.toBeNull();
    const code = result?.code ?? '';
    expect(locs(code)).toEqual(['src/App.tsx:3:5', 'src/App.tsx:4:7', 'src/App.tsx:5:7']);
    expect(code).toContain('<main data-studio-loc="src/App.tsx:3:5" className="a">');
    expect(code).toContain('<img data-studio-loc="src/App.tsx:5:7" src="x.png" />');
    expect(code).toContain('</main>');
    expect(result?.map.mappings.length).toBeGreaterThan(0);
  });

  it('skips components, member expressions, namespaced names and fragments', () => {
    const source = [
      'const C = () => (',
      '  <>',
      '    <Card><span>a</span></Card>',
      '    <motion.div />',
      '    <svg:rect />',
      '    <React.Fragment><b>b</b></React.Fragment>',
      '  </>',
      ');',
    ].join('\n');
    const code = tagJsxSource(source, '/r/C.jsx', 'C.jsx')?.code ?? '';
    expect(locs(code)).toEqual(['C.jsx:3:11', 'C.jsx:6:21']);
    expect(code).toContain('<Card><span data-studio-loc="C.jsx:3:11">');
    expect(code).toContain('<motion.div />');
    expect(code).toContain('<>');
  });

  it('does not tag elements that already carry the attribute', () => {
    const source = 'export default () => <div data-studio-loc="keep:1:1"><p /></div>;';
    const code = tagJsxSource(source, '/r/a.tsx', 'a.tsx')?.code ?? '';
    expect(locs(code)).toEqual(['keep:1:1', 'a.tsx:1:54']);
  });

  it('parses TypeScript syntax in tsx files', () => {
    const source = [
      'type P = { label: string };',
      'export function B<T,>({ label }: P): JSX.Element {',
      '  const x = label as unknown as T;',
      '  return <button type="button">{String(x)}</button>;',
      '}',
    ].join('\n');
    const code = tagJsxSource(source, '/r/B.tsx', 'B.tsx')?.code ?? '';
    expect(locs(code)).toEqual(['B.tsx:4:10']);
  });

  it('returns null for files with no host elements or with syntax errors', () => {
    expect(tagJsxSource('export const C = () => <Card />;', '/r/c.tsx', 'c.tsx')).toBeNull();
    expect(tagJsxSource('export const C = () => <div', '/r/c.tsx', 'c.tsx')).toBeNull();
  });
});

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { tagJsxSource } from '../preview/source-tags.js';
import { listComponents } from './inventory.js';

const dirs: string[] = [];

function tree(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'inventory-'));
  dirs.push(root);
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), text);
  }
  return root;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const BUTTON = `import type { ReactNode } from 'react';
export function Button({ children }: { children: ReactNode }) {
  return <button className="btn">{children}</button>;
}
`;

const CARD = `import { memo } from 'react';
import { Button } from './Button';
export const Card = memo(function Card({ title }: { title: string }) {
  return (
    <article className="card">
      <h3>{title}</h3>
      <Button>Open</Button>
    </article>
  );
});
`;

const APP = `import { Button } from './components/Button';
import { Card } from './components/Card';
export default function App() {
  return <main><Card title="A" /><Card title="B" /><Button>Go</Button></main>;
}
const helper = () => 1;
`;

describe('listComponents', () => {
  it('finds React components, counts uses and points at the root host element by source loc', async () => {
    const root = tree({ 'src/components/Button.tsx': BUTTON, 'src/components/Card.tsx': CARD, 'src/App.tsx': APP, 'node_modules/x/Bad.tsx': BUTTON });
    const found = await listComponents(root, 'react');
    expect(found.map((item) => [item.name, item.uses, item.file])).toEqual([
      ['Button', 2, 'src/components/Button.tsx'],
      ['Card', 2, 'src/components/Card.tsx'],
    ]);
    const tagged = tagJsxSource(BUTTON, path.join(root, 'src/components/Button.tsx'), 'src/components/Button.tsx');
    const loc = /data-studio-loc="([^"]+)"/.exec(tagged?.code ?? '')?.[1];
    expect(found[0]?.selector).toBe(`[data-studio-loc="${loc}"]`);
  });

  it('finds repeated HTML classes and named layers, and skips layout classes, scripts and source/', async () => {
    const html = `<!doctype html><body>
<div class="container"><div class="container">x</div></div>
<article class="card featured"><h3>A</h3></article>
<article class="card"><h3>B</h3></article>
<nav data-name="Top nav"><a class="link">x</a></nav>
<script>const t = '<div class="ghost"></div><div class="ghost"></div>';</script>
</body>`;
    const root = tree({ 'index.html': html, 'source/url-1/page.html': '<i class="evil"></i><i class="evil"></i>' });
    const found = await listComponents(root, 'html');
    expect(found.map((item) => [item.name, item.selector, item.uses])).toEqual([
      ['Card', '.card', 2],
      ['TopNav', '[data-name="Top nav"]', 1],
    ]);
  });
});

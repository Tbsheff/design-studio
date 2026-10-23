import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ProjectKind, ReferenceElement, RunRequest } from '../../shared/contracts.js';

type MockVariation = NonNullable<RunRequest['variation']>;

interface Look {
  font: string;
  paper: string;
  ink: string;
  accent: string;
  layout: string;
}

const LOOKS: Look[] = [
  { font: 'Georgia, "Times New Roman", serif', paper: '#f7f2e8', ink: '#1d1a16', accent: '#a4471c', layout: 'editorial' },
  { font: '"Arial Black", "Helvetica Neue", Arial, sans-serif', paper: '#ffd23f', ink: '#101010', accent: '#e4002b', layout: 'blocks' },
  { font: 'ui-sans-serif, system-ui, sans-serif', paper: '#ffffff', ink: '#2b2f36', accent: '#1f5fbf', layout: 'list' },
  { font: '"Arial Narrow", "Roboto Condensed", sans-serif', paper: '#17191c', ink: '#f2f2f2', accent: '#b5f23d', layout: 'dark' },
];

function escape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function lookFor(index: number): Look {
  return LOOKS[((index % LOOKS.length) + LOOKS.length) % LOOKS.length] as Look;
}

const LAYOUT_CSS: Record<string, string> = {
  editorial: `main { display: grid; grid-template-columns: 2fr 1fr; gap: 48px; max-width: 1080px; margin: 0 auto; padding: 72px 24px; }
    h1 { font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; font-style: italic; margin: 0 0 24px; grid-column: 1 / -1; }
    aside { border-left: 2px solid var(--accent); padding-left: 24px; }`,
  blocks: `main { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0; }
    main > * { padding: 48px 32px; margin: 0; }
    h1 { grid-column: 1 / -1; font-size: clamp(2.5rem, 8vw, 6rem); text-transform: uppercase; background: var(--ink); color: var(--paper); }
    aside { background: var(--accent); color: #fff; }`,
  list: `main { display: grid; grid-template-columns: 200px 1fr; gap: 32px; max-width: 1100px; margin: 0 auto; padding: 32px 24px; font-size: 14px; }
    h1 { font-size: 1.5rem; margin: 0 0 8px; grid-column: 2; }
    aside { grid-row: 1 / span 3; position: sticky; top: 16px; align-self: start; border-right: 1px solid #d7dbe0; }`,
  dark: `main { max-width: 960px; margin: 0 auto; padding: 96px 24px; }
    h1 { font-size: clamp(2.5rem, 7vw, 5rem); text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 4px solid var(--accent); padding-bottom: 16px; }
    aside { margin-top: 48px; padding: 32px; border: 1px solid var(--accent); }`,
};

function variationPage(title: string, variation: MockVariation): string {
  const look = lookFor(variation.index);
  const heading = escape(title);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${heading} (${escape(variation.label)})</title>
  <style>
    :root { --paper: ${look.paper}; --ink: ${look.ink}; --accent: ${look.accent}; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ${look.font}; background: var(--paper); color: var(--ink); line-height: 1.5; }
    ${LAYOUT_CSS[look.layout]}
    .cta { display: inline-block; padding: 12px 24px; background: var(--accent); color: #fff; border: 0; font: inherit; cursor: pointer; }
    .cta:focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; }
  </style>
</head>
<body data-variation="${escape(variation.label)}" class="variation-${look.layout}">
  <main>
    <h1>${heading}</h1>
    <p class="variation-brief"><strong>${escape(variation.title)}.</strong> ${escape(variation.brief)}</p>
    <aside aria-label="Details"><h2>Option ${escape(variation.label)}</h2><p>Layout: ${look.layout}.</p><button class="cta" type="button">Book a visit</button></aside>
  </main>
</body>
</html>
`;
}

function variationApp(title: string, variation: MockVariation): string {
  const look = lookFor(variation.index);
  const text = (value: string) => escape(value).replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
  return `export default function App() {
  return (
    <main data-variation="${escape(variation.label)}" className="variation-${look.layout}" style={{ fontFamily: ${JSON.stringify(look.font)}, background: '${look.paper}', color: '${look.ink}', minHeight: '100vh', padding: 48 }}>
      <h1 style={{ color: '${look.accent}' }}>${text(title)}</h1>
      <p className="variation-brief">${text(variation.title)}. ${text(variation.brief)}</p>
    </main>
  );
}
`;
}

function referenceSection(reference: ReferenceElement): string {
  return `  <section class="mock-mix" data-from="${escape(reference.fromLabel)}"><p>Adapted ${escape(reference.tag)} from ${escape(reference.fromLabel)}.</p></section>\n`;
}

function withReferenceSection(source: string, reference: ReferenceElement): string {
  const section = referenceSection(reference);
  const closeBody = source.lastIndexOf('</body>');
  return closeBody === -1 ? `${source}${section}` : `${source.slice(0, closeBody)}${section}${source.slice(closeBody)}`;
}

interface MockWriter {
  say(text: string): Promise<void>;
  writeFileAsTool(toolName: 'Write' | 'Edit', relativePath: string, content: string): Promise<void>;
}

async function readOptional(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch {
    return null;
  }
}

export async function runVariationMock(writer: MockWriter, request: RunRequest, kind: ProjectKind, workTree: string, title: string): Promise<string> {
  const variation = request.variation;
  const reference = request.reference;
  if (variation) {
    await writer.say(`Building option ${variation.label}: ${variation.title}.`);
    if (kind === 'html') await writer.writeFileAsTool('Write', 'index.html', variationPage(title, variation));
    else await writer.writeFileAsTool('Write', 'src/App.tsx', variationApp(title, variation));
    const finalText = `Wrote option ${variation.label} (${variation.title}).`;
    await writer.say(finalText);
    return finalText;
  }
  if (!reference) throw new Error('runVariationMock needs a variation or a reference');
  await writer.say(`Adapting the ${reference.tag} from ${reference.fromLabel}.`);
  if (kind === 'html') {
    const current = (await readOptional(path.join(workTree, 'index.html'))) ?? '';
    await writer.writeFileAsTool('Edit', 'index.html', withReferenceSection(current, reference));
  } else {
    const current = (await readOptional(path.join(workTree, 'src', 'App.tsx'))) ?? '';
    const marker = `<p className="mock-mix" data-from="${escape(reference.fromLabel)}">Adapted ${escape(reference.tag)} from ${escape(reference.fromLabel)}.</p>`;
    await writer.writeFileAsTool('Edit', 'src/App.tsx', current.replace(/(<\/main>)/, `  ${marker}\n    $1`));
  }
  const finalText = `Adapted the ${reference.tag} from ${reference.fromLabel}.`;
  await writer.say(finalText);
  return finalText;
}

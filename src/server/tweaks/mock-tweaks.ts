import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ProjectKind } from '../../shared/contracts.js';
import { TWEAKS_TOOL, type TweakControl } from '../../shared/tweaks.js';
import { defineTweaks } from './store.js';

export const MOCK_TWEAKS_TAG = '[tweaks]';

interface MockTweaksWriter {
  say(text: string): Promise<void>;
  writeFileAsTool(toolName: 'Write' | 'Edit', relativePath: string, content: string): Promise<void>;
  readonly sink: {
    toolStarted(toolUseId: string, name: string, input: unknown): void;
    toolFinished(toolUseId: string, isError: boolean, summary: string): void;
  };
}

export const MOCK_TWEAK_CONTROLS: TweakControl[] = [
  { id: 'accent', label: 'Accent', group: 'Color', type: 'color', cssVar: '--tw-accent', default: '#0f6b5c' },
  { id: 'radius', label: 'Corner radius', group: 'Shape', type: 'range', cssVar: '--tw-radius', min: 0, max: 32, step: 1, unit: 'px', default: 12 },
  { id: 'gap', label: 'Card gap', group: 'Layout', type: 'range', cssVar: '--tw-gap', min: 8, max: 64, step: 4, unit: 'px', default: 24 },
];

const ROOT_RULE = ':root { --tw-accent: #0f6b5c; --tw-radius: 12px; --tw-gap: 24px; }';
const HTML_RULES = `${ROOT_RULE}
    h1 { color: var(--tw-accent); }
    .cta { background: var(--tw-accent); border-radius: var(--tw-radius); }
    .card { border-radius: var(--tw-radius); }
    .cards { gap: var(--tw-gap); }`;
const REACT_RULES = `
${ROOT_RULE}

h1 {
  color: var(--tw-accent);
  border-radius: var(--tw-radius);
  margin-bottom: var(--tw-gap);
}
`;

let mockToolCount = 0;

async function readOptional(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch {
    return null;
  }
}

export function withMockTweakStyles(html: string): string {
  if (html.includes('data-mock-tweaks')) return html;
  const block = `  <style data-mock-tweaks>\n    ${HTML_RULES}\n  </style>\n`;
  const close = html.search(/<\/head>/i);
  return close === -1 ? `${block}${html}` : `${html.slice(0, close)}${block}${html.slice(close)}`;
}

async function addVars(writer: MockTweaksWriter, kind: ProjectKind, workTree: string): Promise<void> {
  if (kind === 'html') {
    const html = await readOptional(path.join(workTree, 'index.html'));
    if (html !== null && !html.includes('data-mock-tweaks')) await writer.writeFileAsTool('Edit', 'index.html', withMockTweakStyles(html));
    return;
  }
  const css = (await readOptional(path.join(workTree, 'src', 'App.css'))) ?? '';
  if (!css.includes('--tw-accent:')) await writer.writeFileAsTool('Edit', 'src/App.css', `${css}${REACT_RULES}`);
}

export async function runMockTweaks(writer: MockTweaksWriter, kind: ProjectKind, workTree: string): Promise<string> {
  await writer.say('Adding live tweak controls for accent, corner radius and card gap.');
  await addVars(writer, kind, workTree);
  mockToolCount += 1;
  const toolUseId = `mock_tweaks_${mockToolCount}`;
  const input = { controls: MOCK_TWEAK_CONTROLS };
  writer.sink.toolStarted(toolUseId, TWEAKS_TOOL, input);
  const result = await defineTweaks(workTree, MOCK_TWEAK_CONTROLS);
  writer.sink.toolFinished(toolUseId, !result.ok, result.text);
  return 'Defined 3 tweaks: Accent, Corner radius, Card gap.';
}

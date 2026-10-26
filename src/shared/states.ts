import { cleanFramePath, isFrameId } from './canvas-file';

export interface StatesRequest {
  path: string;
  frame: string;
  width: number;
  height: number;
}

export const SUGGESTED_STATES = ['empty', 'loading', 'error', 'validation error', 'open menu', 'success'] as const;

export function pageLabel(path: string): string {
  return path || 'the entry page';
}

export function statePrefix(path: string): string {
  const file = path.split('/').pop() ?? '';
  const stem = file.replace(/\.[a-z0-9]+$/i, '');
  return stem === '' || stem === 'index' ? '' : `${stem.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-`;
}

export function statesPrompt(path: string): string {
  return `Make the UI states of ${pageLabel(path)} as frames.`;
}

export function parseStatesRequest(raw: unknown): StatesRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const path = typeof r.path === 'string' ? cleanFramePath(r.path) : null;
  const side = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 200 && v <= 4000 ? v : null);
  const width = side(r.width);
  const height = side(r.height);
  if (path === null || !isFrameId(r.frame) || width === null || height === null) return null;
  return { path, frame: r.frame, width, height };
}

export function statesTaskBlock(states: StatesRequest, kind: 'html' | 'react'): string {
  const prefix = statePrefix(states.path);
  const page = pageLabel(states.path);
  const files =
    kind === 'html'
      ? `Write one page per state: \`states/${prefix}<state>.html\` (lowercase, dashes, for example \`states/${prefix}validation-error.html\`). Start from the markup, styles, fonts and token links of ${page}; fix relative links with \`../\`. Change only what the state changes. Keep the real copy and tokens.`
      : `Add one route per state. In the root component, switch on \`window.location.pathname\` and render the page in that state for \`/states/${prefix}<state>\`, with the same components and tokens. Do not add a router or any package. The frame path is \`states/${prefix}<state>\`.`;
  return [
    `<states-task page="${page}" frame="${states.frame}" width="${states.width}" height="${states.height}">`,
    `Make the UI states of ${page}. Each state is its own page and its own canvas frame.`,
    `1. Read the page. Pick the 3 to 6 states that fit it, from ${SUGGESTED_STATES.join(', ')}, or another state the page needs. Skip states the page cannot have.`,
    `2. ${files}`,
    `3. Place all state frames with one mcp__studio__canvas_place call: a row under frame ${states.frame}. The first item has \`below: "${states.frame}"\`, each next item \`rightOf\` the \`@Label\` before it. Each frame: width ${states.width}, height ${states.height}, label = the state name in Title Case (for example "Validation error"), path = its state page.`,
    '4. Run the checks the <run-level> block asks for, then mcp__studio__canvas_point at the first state frame. Reply with the list of states and one line on each.',
    '</states-task>',
  ].join('\n');
}

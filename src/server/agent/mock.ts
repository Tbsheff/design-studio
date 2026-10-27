import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { RunComment, RunLevel, SelectionContext } from '../../shared/contracts.js';
import { levelOf } from '../../shared/run-levels.js';
import type { DriverInput, DriverOutcome, DriverSink, RunDriver } from './lifecycle.js';
import { checkPathInside, evaluateToolUse, type ToolPolicy } from './permissions.js';
import { createBashGate } from './ask-gate.js';
import { queuedText } from './lifecycle.js';
import { MOCK_TWEAKS_TAG, runMockTweaks } from '../tweaks/mock-tweaks.js';
import { buildUserMessageParts, buildUserText } from './user-message.js';
import { runVariationMock } from '../variations/mock-pages.js';
import { enforceDesignSystemCheck, wantsDesignSystemCheck } from './design-system-run.js';
import { runMockDesignSystem, runMockDesignSystemFix } from './mock-design-system.js';
import type { CanvasService } from '../canvas/service.js';
import { mockCanvasContext, runMockCanvas, runMockStates, wantsMockCanvas, wantsMockStates } from './mock-canvas.js';

const MOCK_USAGE = { inputTokens: 120, outputTokens: 80, cacheReadTokens: 0, cacheWriteTokens: 0 };
const DELTA_DELAY_MS = 20;
const SLOW_STEP_MS = 1500;
const STEP_TOOL_MS = 900;
export const MOCK_BASH_OUTPUT = 'mock-bash-output.txt';
const LONG_SECTIONS = 24;

const MOCK_TODO_STEPS = ['Read the page', 'Plan the layout', 'Write the hero', 'Write the cards', 'Check mobile'];
export const MOCK_CONTEXT_TOKENS = 24_000;

function mockTodos(current: number) {
  return MOCK_TODO_STEPS.map((content, index) => ({ content, activeForm: `${content}…`, status: index < current ? 'completed' : index === current ? 'in_progress' : 'pending' }));
}

export function longReply(): string {
  const sections: string[] = [];
  for (let n = 1; n <= LONG_SECTIONS; n += 1) {
    const code = Array.from({ length: 18 }, (_, line) => `  .card-${n}-${line} { padding: ${line * 2}px; border-radius: 8px; color: var(--ink); }`).join('\n');
    sections.push(
      `## Section ${n}: layout notes\n\nThe hero keeps one clear action and the cards keep a steady rhythm. This paragraph explains why the spacing scale matters for section ${n}, how the type sizes relate, and which tokens the page uses so that the reader can follow the change without opening the code.\n\n- Keep the heading short and specific.\n- Use one accent color for actions.\n- Check the mobile layout at 390 px.\n\n\`\`\`css\n${code}\n\`\`\`\n\nAfter the code, a short summary closes section ${n} and leads into the next one.`,
    );
  }
  return sections.join('\n\n');
}

class MockAbortError extends Error {
  constructor() {
    super('Run canceled.');
    this.name = 'AbortError';
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new MockAbortError());
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new MockAbortError());
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new MockAbortError();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsxText(value: string): string {
  return escapeHtml(value).replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
}

const SKILL_TAG = /\[skill:([^\]\s]+)\]/g;
const MOCK_TAGS = /\[(slow|fail|tweaks|ds-fail-once|ds-fail-always|think|steps|bash|todo|edit1|long|retry|canvas|states)\]/g;
const SKILL_LINE = /^Use the (\S+) skill\.$/gm;

export function mockSkillRequests(prompt: string): string[] {
  const ids = [...prompt.matchAll(SKILL_TAG), ...prompt.matchAll(SKILL_LINE)].map((match) => match[1] ?? '');
  return [...new Set(ids.filter(Boolean))];
}

export function cleanPrompt(prompt: string): string {
  return prompt.replace(MOCK_TAGS, '').replace(SKILL_TAG, '').replace(SKILL_LINE, '').replace(/\s+/g, ' ').trim();
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

function landingPage(title: string): string {
  const heading = escapeHtml(title);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${heading}</title>
  <style>
    :root { --ink: #1c1f23; --muted: #5a6270; --paper: #fbfaf7; --accent: #0f6b5c; --line: #e4e1da; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--ink); background: var(--paper); line-height: 1.5; }
    main { max-width: 1080px; margin: 0 auto; padding: 64px 24px; }
    h1 { font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.1; margin: 0 0 16px; }
    .lede { font-size: 1.125rem; color: var(--muted); max-width: 40rem; margin: 0 0 32px; }
    .cta { display: inline-block; padding: 12px 24px; border: 0; border-radius: 8px; background: var(--accent); color: #fff; font-size: 1rem; cursor: pointer; }
    .cta:focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-top: 64px; }
    .card { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 24px; }
    .card h2 { font-size: 1.125rem; margin: 0 0 8px; }
    .card p { margin: 0; color: var(--muted); }
  </style>
</head>
<body>
  <main>
    <h1>${heading}</h1>
    <p class="lede">A clear starting point. Replace this copy with the real story of the product.</p>
    <button class="cta" type="button">Get started</button>
    <section class="cards" aria-label="Highlights">
      <article class="card"><h2>First idea</h2><p>Describe the first thing people should know.</p></article>
      <article class="card"><h2>Second idea</h2><p>Explain how it works in one or two lines.</p></article>
      <article class="card"><h2>Third idea</h2><p>Say what happens next and why it matters.</p></article>
    </section>
  </main>
</body>
</html>
`;
}

function reactApp(title: string): string {
  return `export default function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 48 }}>
      <h1>${escapeJsxText(title)}</h1>
    </main>
  );
}
`;
}

interface MockFlags {
  slow: boolean;
  fail: boolean;
}

class MockSession {
  private toolCounter = 0;
  private writes = 0;

  constructor(
    private readonly input: DriverInput,
    private readonly flags: MockFlags,
  ) {}

  get sink(): DriverSink {
    return this.input.sink;
  }

  get signal(): AbortSignal {
    return this.input.signal;
  }

  get workTree(): string {
    return this.input.ctx.direction.workTree;
  }

  async say(text: string): Promise<void> {
    const words = text.split(' ');
    const chunkSize = Math.max(1, Math.ceil(words.length / 5));
    for (let index = 0; index < words.length; index += chunkSize) {
      throwIfAborted(this.signal);
      const chunk = words.slice(index, index + chunkSize).join(' ');
      this.sink.textDelta(index + chunkSize < words.length ? `${chunk} ` : chunk);
      await sleep(DELTA_DELAY_MS, this.signal);
    }
    this.sink.text(text);
  }

  async stream(text: string, chunkSize: number, delayMs: number): Promise<void> {
    for (let index = 0; index < text.length; index += chunkSize) {
      throwIfAborted(this.signal);
      this.sink.textDelta(text.slice(index, index + chunkSize));
      await sleep(delayMs, this.signal);
    }
    this.sink.text(text);
  }

  toolCounterNext(): void {
    this.toolCounter += 1;
  }

  lastToolId(): string {
    return `mock_tool_${this.toolCounter}`;
  }

  async think(text: string): Promise<void> {
    for (const word of text.split(' ')) {
      throwIfAborted(this.signal);
      this.sink.thinkingDelta(`${word} `);
      await sleep(DELTA_DELAY_MS / 2, this.signal);
    }
    this.sink.thinking(text);
  }

  async fakeTool(name: string, input: Record<string, unknown>, summary: string, ms = DELTA_DELAY_MS): Promise<void> {
    this.toolCounter += 1;
    const toolUseId = `mock_tool_${this.toolCounter}`;
    this.sink.toolStarted(toolUseId, name, input);
    await sleep(ms, this.signal);
    this.sink.toolFinished(toolUseId, false, summary);
    await this.deliverQueued();
  }

  async deliverQueued(): Promise<void> {
    const taken = this.input.inbox?.take() ?? [];
    if (taken.length > 0) await this.say(`Noted: ${queuedText(taken)}`);
  }

  async bash(command: string): Promise<void> {
    this.toolCounter += 1;
    const toolUseId = `mock_tool_${this.toolCounter}`;
    const input = { command };
    this.sink.toolStarted(toolUseId, 'Bash', input);
    const gate = this.input.ask && !this.input.ctx.project.settings.autoApprove ? createBashGate(this.input.ask, undefined, this.input.commandRules) : null;
    const decision = gate ? await gate(toolUseId, input) : { behavior: 'allow' as const };
    throwIfAborted(this.signal);
    if (decision.behavior === 'deny') {
      this.sink.toolFinished(toolUseId, true, decision.message);
      this.sink.sent({ text: decision.message, imageCount: 0, updatedInstructions: false, recommendedSkills: [], promptHash: 'mock', resume: null });
      await this.say(`Okay, I will not run \`${command}\`. ${decision.message}`);
      return;
    }
    await writeFile(path.join(this.workTree, MOCK_BASH_OUTPUT), `ran: ${command}\n`);
    this.sink.toolFinished(toolUseId, false, `Bash ${command}`);
    await this.deliverQueued();
  }

  async useSkill(skill: string): Promise<void> {
    this.toolCounter += 1;
    const toolUseId = `mock_tool_${this.toolCounter}`;
    this.sink.toolStarted(toolUseId, 'Skill', { skill });
    await sleep(DELTA_DELAY_MS, this.signal);
    this.sink.toolFinished(toolUseId, false, `Skill ${skill}`);
    await this.deliverQueued();
  }

  async writeFileAsTool(toolName: 'Write' | 'Edit', relativePath: string, content: string): Promise<void> {
    const absolute = path.resolve(this.workTree, relativePath);
    const problem = checkPathInside(this.workTree, absolute);
    if (problem) throw new Error(problem);
    this.toolCounter += 1;
    const toolUseId = `mock_tool_${this.toolCounter}`;
    this.sink.toolStarted(toolUseId, toolName, { file_path: absolute });
    this.sink.beforeWrite(toolUseId, toolName, { file_path: absolute });
    try {
      await mkdir(path.dirname(absolute), { recursive: true });
      if (this.flags.slow) {
        const step = Math.ceil(content.length / 3);
        for (let part = 1; part <= 3; part += 1) {
          throwIfAborted(this.signal);
          await writeFile(absolute, content.slice(0, Math.min(content.length, step * part)));
          if (part < 3) await sleep(SLOW_STEP_MS, this.signal);
        }
      } else {
        throwIfAborted(this.signal);
        await writeFile(absolute, content);
      }
      this.sink.toolFinished(toolUseId, false, `${toolName} ${relativePath}`);
      await this.deliverQueued();
    } catch (error) {
      this.sink.toolFinished(toolUseId, true, `${toolName} ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
    this.writes += 1;
    if (this.flags.fail && this.writes === 1) throw new Error('Mock failure after first write.');
  }
}

function lineColToOffset(source: string, line: number, col: number): number {
  let offset = 0;
  for (let current = 1; current < line; current += 1) {
    const next = source.indexOf('\n', offset);
    if (next === -1) return -1;
    offset = next + 1;
  }
  return offset + col - 1;
}

function findOpenTagEnd(source: string, start: number): number {
  let quote: string | null = null;
  let braceDepth = 0;
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '{') braceDepth += 1;
    else if (char === '}') braceDepth -= 1;
    else if (char === '>' && braceDepth === 0) return index;
  }
  return -1;
}

function parseColorRequest(prompt: string): string | null {
  const match = /\bcolou?r\s+(#[0-9a-fA-F]{3,8}\b|(?:rgb|rgba|hsl|hsla|oklch)\([^)]*\)|[a-zA-Z]+)/i.exec(prompt);
  return match?.[1] ?? null;
}

function setInlineColor(openTag: string, color: string, jsx: boolean): string {
  const selfClosing = openTag.endsWith('/>');
  const body = openTag.slice(0, selfClosing ? -2 : -1);
  const close = selfClosing ? '/>' : '>';
  if (jsx) {
    const jsxStyle = /style=\{\{([\s\S]*?)\}\}/.exec(body);
    if (jsxStyle) {
      const inner = (jsxStyle[1] ?? '').replace(/,?\s*color\s*:\s*(['"]).*?\1/, '').trim().replace(/^,\s*/, '');
      const next = inner ? `color: '${color}', ${inner}` : `color: '${color}'`;
      return `${body.replace(jsxStyle[0], `style={{ ${next} }}`)}${close}`;
    }
    return `${body.trimEnd()} style={{ color: '${color}' }}${selfClosing ? ' ' : ''}${close}`;
  }
  const htmlStyle = /style=(["'])([\s\S]*?)\1/.exec(body);
  if (htmlStyle) {
    const quote = htmlStyle[1] ?? '"';
    const rules = (htmlStyle[2] ?? '')
      .split(';')
      .map((rule) => rule.trim())
      .filter((rule) => rule && !/^color\s*:/i.test(rule));
    rules.push(`color: ${color}`);
    return `${body.replace(htmlStyle[0], `style=${quote}${rules.join('; ')}${quote}`)}${close}`;
  }
  return `${body.trimEnd()} style="color: ${color}"${selfClosing ? ' ' : ''}${close}`;
}

function replaceFirstText(source: string, from: number, text: string): string | null {
  let cursor = from;
  for (let guard = 0; guard < 200 && cursor < source.length; guard += 1) {
    const nextTag = source.indexOf('<', cursor);
    const segmentEnd = nextTag === -1 ? source.length : nextTag;
    const segment = source.slice(cursor, segmentEnd);
    if (segment.trim() && !/^\s*\{/.test(segment)) {
      const leading = segment.length - segment.trimStart().length;
      const trailing = segment.length - segment.trimEnd().length;
      return source.slice(0, cursor + leading) + text + source.slice(segmentEnd - trailing);
    }
    if (nextTag === -1 || source.startsWith('</', nextTag)) return null;
    const tagEnd = findOpenTagEnd(source, nextTag);
    if (tagEnd === -1) return null;
    cursor = tagEnd + 1;
  }
  return null;
}

function applySelectionEdit(source: string, selection: SelectionContext, prompt: string, jsx: boolean): string | null {
  if (!selection.source) return null;
  const start = lineColToOffset(source, selection.source.line, selection.source.col);
  if (start < 0 || source[start] !== '<') return null;
  const openEnd = findOpenTagEnd(source, start);
  if (openEnd === -1) return null;
  const color = parseColorRequest(prompt);
  if (color) {
    const openTag = source.slice(start, openEnd + 1);
    return source.slice(0, start) + setInlineColor(openTag, color, jsx) + source.slice(openEnd + 1);
  }
  const text = jsx ? escapeJsxText(cleanPrompt(prompt)) : escapeHtml(cleanPrompt(prompt));
  return replaceFirstText(source, openEnd + 1, text);
}

function resolveSelectionFile(workTree: string, file: string): string {
  if (path.isAbsolute(file) && checkPathInside(workTree, file) === null) return file;
  return path.resolve(workTree, file.replace(/^\/+/, ''));
}

function groupSelectionsByFile(selections: SelectionContext[]): Map<string, SelectionContext[]> {
  const byFile = new Map<string, SelectionContext[]>();
  for (const selection of selections) {
    if (!selection.source) continue;
    const list = byFile.get(selection.source.file) ?? [];
    list.push(selection);
    byFile.set(selection.source.file, list);
  }
  return byFile;
}

function compareSelectionsBottomUp(a: SelectionContext, b: SelectionContext): number {
  return (b.source?.line ?? 0) - (a.source?.line ?? 0) || (b.source?.col ?? 0) - (a.source?.col ?? 0);
}

async function runCritique(session: MockSession): Promise<string> {
  const finalText = `Critique: tighten the hierarchy, check contrast on secondary text, and test the layout at 375px.`;
  await session.say(finalText);
  return finalText;
}

async function editSelectionFile(session: MockSession, workTree: string, file: string, selections: SelectionContext[], prompt: string): Promise<void> {
  const absolute = resolveSelectionFile(workTree, file);
  let source = await readFile(absolute, 'utf8');
  const ordered = [...selections].sort(compareSelectionsBottomUp);
  for (const selection of ordered) {
    const next = applySelectionEdit(source, selection, prompt, /\.(jsx|tsx)$/.test(file));
    if (next !== null) source = next;
  }
  await session.writeFileAsTool('Edit', path.relative(workTree, absolute), source);
}

async function runSelectionEdit(session: MockSession, workTree: string, selections: SelectionContext[], prompt: string): Promise<string> {
  await session.say(`Updating ${selections.length} selected element(s).`);
  for (const [file, fileSelections] of groupSelectionsByFile(selections)) {
    await editSelectionFile(session, workTree, file, fileSelections, prompt);
  }
  const finalText = 'Updated the selected element(s).';
  await session.say(finalText);
  return finalText;
}

type PlacedComment = RunComment & { element: SelectionContext & { source: NonNullable<SelectionContext['source']> } };

function isPlaced(comment: RunComment): comment is PlacedComment {
  return comment.element !== null && comment.element.source !== null;
}

async function runCommentEdit(session: MockSession, workTree: string, comments: RunComment[]): Promise<string> {
  await session.say(`Addressing ${comments.length} comment(s).`);
  const placed = comments.filter(isPlaced);
  const byFile = new Map<string, PlacedComment[]>();
  for (const comment of placed) byFile.set(comment.element.source.file, [...(byFile.get(comment.element.source.file) ?? []), comment]);
  const done: number[] = [];
  for (const [file, fileComments] of byFile) {
    const absolute = resolveSelectionFile(workTree, file);
    let source = await readFile(absolute, 'utf8');
    const ordered = [...fileComments].sort((a, b) => compareSelectionsBottomUp(a.element, b.element));
    for (const comment of ordered) {
      const next = applySelectionEdit(source, comment.element, comment.text, /\.(jsx|tsx)$/.test(file));
      if (next === null) continue;
      source = next;
      done.push(comment.n);
    }
    await session.writeFileAsTool('Edit', path.relative(workTree, absolute), source);
  }
  const finalText = `Done: ${done.sort((a, b) => a - b).map((n) => `#${n}`).join(', ') || 'none'}.`;
  await session.say(finalText);
  return finalText;
}

function appendParagraph(source: string, text: string): string {
  const paragraph = `  <p class="mock-edit">${escapeHtml(text)}</p>\n`;
  const closeBody = source.lastIndexOf('</body>');
  return closeBody === -1 ? `${source}${paragraph}` : `${source.slice(0, closeBody)}${paragraph}${source.slice(closeBody)}`;
}

async function writeHtmlChange(session: MockSession, indexPath: string, text: string): Promise<string> {
  if (!(await exists(indexPath))) {
    await session.say(`Creating a landing page for "${text}" with a hero, a call to action, and three cards.`);
    await session.writeFileAsTool('Write', 'index.html', landingPage(text));
    return 'Created `index.html`.';
  }
  await session.say(`Adding a note for "${text}".`);
  const source = await readFile(indexPath, 'utf8');
  await session.writeFileAsTool('Edit', 'index.html', appendParagraph(source, text));
  return 'Added a paragraph to `index.html`.';
}

async function runHeadingEdit(session: MockSession, workTree: string, text: string): Promise<string> {
  const indexPath = path.join(workTree, 'index.html');
  const source = await readFile(indexPath, 'utf8');
  await session.say(`Changing the heading to "${text}".`);
  const next = source.replace(/(<h1\b[^>]*>)[^<\n]*(<\/h1>)/, `$1${escapeHtml(text)}$2`);
  await session.writeFileAsTool('Edit', 'index.html', next);
  const finalText = 'Changed the heading in `index.html`.';
  await session.say(finalText);
  return finalText;
}

async function runHtmlEdit(session: MockSession, workTree: string, text: string): Promise<string> {
  const finalText = await writeHtmlChange(session, path.join(workTree, 'index.html'), text);
  await session.say(finalText);
  return finalText;
}

async function runReactEdit(session: MockSession, workTree: string, text: string): Promise<string> {
  const appPath = path.join(workTree, 'src', 'App.tsx');
  const current = (await exists(appPath)) ? await readFile(appPath, 'utf8') : '';
  const heading = /(<h1\b[^>]*>)([\s\S]*?)(<\/h1>)/.exec(current);
  await session.say(`Setting the heading to "${text}".`);
  if (heading) {
    const next = current.replace(heading[0], `${heading[1]}${escapeJsxText(text)}${heading[3]}`);
    await session.writeFileAsTool('Edit', 'src/App.tsx', next);
  } else {
    await session.writeFileAsTool('Edit', 'src/App.tsx', reactApp(text));
  }
  const finalText = 'Updated `src/App.tsx`.';
  await session.say(finalText);
  return finalText;
}

const RENDER_CHECK = 'mcp__studio__render_check';
const SCREENSHOT = 'mcp__studio__screenshot';

type MockStep = [name: string, input: Record<string, unknown>];

const MOCK_LEVEL_STEPS: Record<RunLevel, MockStep[]> = {
  wireframe: [[RENDER_CHECK, {}]],
  prototype: [
    [RENDER_CHECK, {}],
    [SCREENSHOT, { viewport: 'mobile', from: 0 }],
    [SCREENSHOT, { viewport: 'desktop', from: 0 }],
    [RENDER_CHECK, {}],
  ],
  polish: [
    [RENDER_CHECK, {}],
    [SCREENSHOT, { viewport: 'mobile', from: 0 }],
    [SCREENSHOT, { viewport: 'tablet', from: 0 }],
    [SCREENSHOT, { viewport: 'desktop', from: 0 }],
    ['mcp__studio__design_review', {}],
    [RENDER_CHECK, {}],
  ],
};

async function runLevelChecks(session: MockSession, level: RunLevel): Promise<void> {
  for (const [name, input] of MOCK_LEVEL_STEPS[level]) {
    const viewport = typeof input['viewport'] === 'string' ? ` ${input['viewport']}` : '';
    await session.fakeTool(name, input, `${name}${viewport}`);
  }
}

function wantsLevelChecks(input: DriverInput): boolean {
  const request = input.ctx.request;
  return request.mode === 'edit' && !request.plan && !request.selection?.length && !request.comments?.length;
}

function wantsTweaks(input: DriverInput): boolean {
  const request = input.ctx.request;
  return request.mode === 'edit' && (request.task === 'tweaks' || request.prompt.includes(MOCK_TWEAKS_TAG));
}

async function runMockScenario(input: DriverInput, session: MockSession, canvas: CanvasService | undefined): Promise<string> {
  if (wantsDesignSystemCheck(input.ctx)) return runMockDesignSystem(session, input.ctx.direction.workTree, input.ctx.request.prompt, (await buildUserMessageParts(input.ctx)).images.length);
  if (wantsMockCanvas(input)) return runMockCanvas(session, mockCanvasContext(input, canvas));
  if (wantsMockStates(input)) return runMockStates(session, input, mockCanvasContext(input, canvas));
  const tweaksOnly = input.ctx.request.task === 'tweaks';
  let finalText = tweaksOnly ? '' : await runMockEdit(input, session);
  if (wantsTweaks(input)) finalText = `${finalText} ${await runMockTweaks(session, input.ctx.project.kind, input.ctx.direction.workTree)}`.trim();
  if (wantsLevelChecks(input) && !tweaksOnly) await runLevelChecks(session, levelOf(input.ctx.request, input.ctx.project.settings));
  return finalText;
}

async function runPlan(session: MockSession, workTree: string, text: string): Promise<string> {
  await session.say(`Planning "${text}" before any change.`);
  const policy: ToolPolicy = { workTree, mode: 'edit', allowBash: false, allowInstall: false, plan: true };
  const target = { file_path: path.join(workTree, 'index.html') };
  session.toolCounterNext();
  const toolUseId = session.lastToolId();
  session.sink.toolStarted(toolUseId, 'Write', target);
  const decision = evaluateToolUse(policy, 'Write', target);
  session.sink.toolFinished(toolUseId, decision.behavior === 'deny', decision.behavior === 'deny' ? decision.message : 'Write index.html');
  const plan = `Plan:\n\n1. Keep the hero and make "${text}" the heading.\n2. Tighten the card copy.\n3. Check mobile at 390 px.`;
  await session.say(plan);
  return plan;
}

function runMockEdit(input: DriverInput, session: MockSession): Promise<string> {
  const { ctx } = input;
  const prompt = ctx.request.prompt;
  const workTree = ctx.direction.workTree;
  const text = cleanPrompt(prompt) || 'Untitled';
  if (ctx.request.mode === 'critique') return runCritique(session);
  if (ctx.request.plan) return runPlan(session, workTree, text);
  if (ctx.request.variation || ctx.request.reference) return runVariationMock(session, ctx.request, ctx.project.kind, workTree, text);
  if (ctx.request.comments?.length) return runCommentEdit(session, workTree, ctx.request.comments);
  const selection = ctx.request.selection;
  if (selection?.length) return runSelectionEdit(session, workTree, selection, prompt);
  if (ctx.project.kind === 'html' && prompt.includes('[edit1]')) return runHeadingEdit(session, workTree, text);
  if (ctx.project.kind === 'html') return runHtmlEdit(session, workTree, text);
  return runReactEdit(session, workTree, text);
}

async function runMock(input: DriverInput, canvas: CanvasService | undefined): Promise<DriverOutcome> {
  const startedAt = Date.now();
  const prompt = input.ctx.request.prompt;
  const flags: MockFlags = { slow: prompt.includes('[slow]'), fail: prompt.includes('[fail]') };
  const session = new MockSession(input, flags);
  await input.sink.sessionStarted(input.ctx.direction.sessionId ?? `mock-${input.ctx.direction.id}-${input.runId}`);
  input.sink.usage(MOCK_CONTEXT_TOKENS);
  input.sink.sent({ text: buildUserText(input.ctx), imageCount: input.ctx.attachments.length, updatedInstructions: false, recommendedSkills: [], promptHash: 'mock', resume: input.ctx.direction.sessionId });
  for (const skill of mockSkillRequests(prompt)) await session.useSkill(skill);
  if (prompt.includes('[steps]')) {
    await session.fakeTool('Read', { file_path: path.join(session.workTree, 'index.html') }, 'Read index.html', STEP_TOOL_MS);
    await session.fakeTool('Grep', { pattern: 'h1' }, 'Grep h1', STEP_TOOL_MS);
    await session.fakeTool('Glob', { pattern: '*.css' }, 'Glob *.css', STEP_TOOL_MS);
  }
  if (prompt.includes('[bash]')) await session.bash('npm test');
  if (prompt.includes('[retry]')) {
    input.sink.retry(1, 5, 2000, 'Overloaded (529)');
    await sleep(2000, input.signal);
  }
  if (prompt.includes('[long]')) await session.stream(longReply(), 96, 8);
  if (prompt.includes('[slowlong]')) await session.stream(longReply(), 64, 60);
  if (prompt.includes('[todo]')) {
    await session.fakeTool('TodoWrite', { todos: mockTodos(0) }, 'Todo list', STEP_TOOL_MS);
    await session.fakeTool('Read', { file_path: path.join(session.workTree, 'index.html') }, 'Read index.html', STEP_TOOL_MS);
    await session.fakeTool('TodoWrite', { todos: mockTodos(1) }, 'Todo list', STEP_TOOL_MS);
  }
  if (prompt.includes('[think]')) {
    await session.think('Thinking A: the page needs a clear heading first.');
    await session.fakeTool('Read', { file_path: path.join(session.workTree, 'index.html') }, 'Read index.html');
    await session.think('Thinking B: keep the cards, then write the change.');
  }
  const finalText = await runMockScenario(input, session, canvas);
  const outcome: DriverOutcome = {
    status: prompt.includes('[budget]') ? 'budget_exceeded' : 'completed',
    usage: { ...MOCK_USAGE },
    costUsd: 0,
    durationMs: Date.now() - startedAt,
    modelMs: 0,
    finalText,
    error: null,
  };
  if (!wantsDesignSystemCheck(input.ctx)) return outcome;
  return enforceDesignSystemCheck({
    workTree: input.ctx.direction.workTree,
    first: outcome,
    signal: input.signal,
    continueWith: async (text, round, total) => {
      input.sink.sent({ text, imageCount: 0, updatedInstructions: false, recommendedSkills: [], promptHash: 'mock', resume: input.ctx.direction.sessionId, continuation: round });
      const fixed = await runMockDesignSystemFix(session, input.ctx.direction.workTree, prompt);
      return { ...total, finalText: fixed, durationMs: Date.now() - startedAt };
    },
  });
}

export const MOCK_SLOW_STOP_MS = 2000;

export function createMockDriver(options: { canvas?: CanvasService } = {}): RunDriver {
  return async (input) => {
    try {
      return await runMock(input, options.canvas);
    } catch (error) {
      if (input.signal.aborted && input.ctx.request.prompt.includes('[slowstop]')) await new Promise((resolve) => setTimeout(resolve, MOCK_SLOW_STOP_MS));
      throw error;
    }
  };
}

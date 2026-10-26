import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { statePrefix } from '../../shared/states.js';
import type { CanvasService } from '../canvas/service.js';
import { canvasList, canvasPlace, canvasPoint, type CanvasToolContext, type PlaceSpec, type ToolText } from '../canvas/tools.js';
import type { DriverInput, DriverSink } from './lifecycle.js';
import { CANVAS_LIST_TOOL, CANVAS_PLACE_TOOL, CANVAS_POINT_TOOL } from './permissions.js';

export const MOCK_CANVAS_TAG = '[canvas]';

export interface MockToolSession {
  readonly sink: DriverSink;
  toolCounterNext(): void;
  lastToolId(): string;
}

export function mockCanvasContext(input: DriverInput, canvas: CanvasService | undefined): CanvasToolContext | null {
  if (!canvas) return null;
  const { ctx } = input;
  return { canvas, project: ctx.project, direction: ctx.direction, mode: ctx.request.mode, plan: ctx.request.plan === true };
}

function firstLine(result: ToolText): string {
  const body = result.content.map((part) => part.text).join('\n');
  return body.length > 400 ? `${body.slice(0, 400)}…` : body;
}

export async function mockCanvasTool(session: MockToolSession, name: string, input: Record<string, unknown>, run: () => Promise<ToolText>): Promise<ToolText> {
  session.toolCounterNext();
  const toolUseId = session.lastToolId();
  session.sink.toolStarted(toolUseId, name, input);
  const result = await run();
  session.sink.toolFinished(toolUseId, result.isError === true, firstLine(result));
  return result;
}

export function mockList(session: MockToolSession, ctx: CanvasToolContext): Promise<ToolText> {
  return mockCanvasTool(session, CANVAS_LIST_TOOL, {}, () => canvasList(ctx));
}

export function mockPlace(session: MockToolSession, ctx: CanvasToolContext, frames: PlaceSpec[]): Promise<ToolText> {
  return mockCanvasTool(session, CANVAS_PLACE_TOOL, { frames }, () => canvasPlace(ctx, frames));
}

export function mockPoint(session: MockToolSession, ctx: CanvasToolContext, frame: string, selector?: string): Promise<ToolText> {
  const args = selector ? { frame, selector } : { frame };
  return mockCanvasTool(session, CANVAS_POINT_TOOL, args, () => canvasPoint(ctx, args));
}

export function wantsMockCanvas(input: DriverInput): boolean {
  return input.ctx.request.prompt.includes(MOCK_CANVAS_TAG);
}

export async function runMockCanvas(session: MockToolSession, ctx: CanvasToolContext | null): Promise<string> {
  if (!ctx) return 'The canvas is not available in this run.';
  await mockList(session, ctx);
  const placed = await mockPlace(session, ctx, [
    { frame: 'f1', label: 'Desktop' },
    { label: 'Mobile', viewport: 'mobile', rightOf: '@Desktop' },
    { label: 'Tablet', viewport: 'tablet', x: 0, y: 0 },
  ]);
  const warned = /overlap/.test(placed.content.map((part) => part.text).join(' '));
  if (warned) await mockPlace(session, ctx, [{ frame: '@Tablet', rightOf: '@Mobile' }]);
  await mockPoint(session, ctx, '@Mobile', 'h1');
  return warned ? 'Placed Desktop, Mobile and Tablet frames in a row; the Tablet frame overlapped Desktop, so I moved it right of Mobile. Showing the Mobile frame.' : 'Placed Desktop, Mobile and Tablet frames. Showing the Mobile frame.';
}

export const MOCK_STATES_TAG = '[states]';
const MOCK_STATES = ['empty', 'loading', 'error', 'success'] as const;
const STATE_TEXT: Record<string, string> = {
  empty: 'Nothing here yet. Add your first item to get started.',
  loading: 'Loading your items…',
  error: 'We could not load this page. Try again in a moment.',
  success: 'Saved. Your changes are live.',
};

export interface MockWriteSession extends MockToolSession {
  writeFileAsTool(toolName: 'Write' | 'Edit', relativePath: string, content: string): Promise<void>;
}

export function wantsMockStates(input: DriverInput): boolean {
  const request = input.ctx.request;
  return request.mode === 'edit' && (request.states !== undefined || request.prompt.includes(MOCK_STATES_TAG));
}

function titleOf(state: string): string {
  return state.charAt(0).toUpperCase() + state.slice(1);
}

function stateBanner(state: string): string {
  return `<div class="studio-mock-state" data-state="${state}" role="status" style="margin:24px;padding:16px 20px;border:2px dashed currentColor;border-radius:12px;font:600 18px/1.4 system-ui">${titleOf(state)} state: ${STATE_TEXT[state] ?? ''}</div>`;
}

export function mockStatePage(page: string, state: string): string {
  const withBase = /<head[^>]*>/i.test(page) ? page.replace(/<head[^>]*>/i, (tag) => `${tag}\n<base href="../">`) : `<base href="../">\n${page}`;
  return /<body[^>]*>/i.test(withBase) ? withBase.replace(/<body[^>]*>/i, (tag) => `${tag}\n${stateBanner(state)}`) : `${withBase}\n${stateBanner(state)}`;
}

const REACT_STATE_PAGE = '<!doctype html><html><head><meta charset="utf-8"><title>State</title></head><body><h1>App</h1></body></html>';
const EMPTY_PAGE = '<!doctype html><html><head></head><body></body></html>';

async function statesSource(input: DriverInput): Promise<string> {
  if (input.ctx.project.kind === 'react') return REACT_STATE_PAGE;
  const pagePath = input.ctx.request.states?.path || input.ctx.project.entry || 'index.html';
  return readFile(path.join(input.ctx.direction.workTree, pagePath), 'utf8').catch(() => EMPTY_PAGE);
}

export async function runMockStates(session: MockWriteSession, input: DriverInput, ctx: CanvasToolContext | null): Promise<string> {
  const source = input.ctx.request.states ?? { path: '', frame: 'f1', width: 1440, height: 900 };
  const react = input.ctx.project.kind === 'react';
  const page = await statesSource(input);
  const prefix = statePrefix(source.path);
  const files = MOCK_STATES.map((state) => ({ state, file: `states/${prefix}${state}.html` }));
  for (const { state, file } of files) await session.writeFileAsTool('Write', react ? `public/${file}` : file, mockStatePage(page, state));
  if (!ctx) return `Wrote ${files.length} state pages. The canvas is not available in this run.`;
  const specs: PlaceSpec[] = files.map(({ state, file }, index) => ({
    label: titleOf(state),
    path: file,
    width: source.width,
    height: source.height,
    ...(index === 0 ? { below: source.frame } : { rightOf: `@${titleOf(files[index - 1]?.state ?? '')}` }),
  }));
  await mockPlace(session, ctx, specs);
  await mockPoint(session, ctx, `@${titleOf(MOCK_STATES[0])}`);
  return `Made ${files.length} states of ${source.path || 'the entry page'}: ${MOCK_STATES.map(titleOf).join(', ')}. Each has its own frame under the page.`;
}

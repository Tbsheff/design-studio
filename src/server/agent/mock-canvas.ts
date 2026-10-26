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
  const warned = /overlap/.test(firstLine(placed));
  if (warned) await mockPlace(session, ctx, [{ frame: '@Tablet', rightOf: '@Mobile' }]);
  await mockPoint(session, ctx, '@Mobile', 'h1');
  return warned ? 'Placed Desktop, Mobile and Tablet frames in a row; the Tablet frame overlapped Desktop, so I moved it right of Mobile. Showing the Mobile frame.' : 'Placed Desktop, Mobile and Tablet frames. Showing the Mobile frame.';
}

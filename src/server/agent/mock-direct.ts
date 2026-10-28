import type { PreviewService } from '../types.js';
import { runEditElement, runSetToken } from './direct-tools.js';
import type { DriverInput } from './lifecycle.js';
import { mockCanvasTool, type MockToolSession } from './mock-canvas.js';
import { EDIT_ELEMENT_TOOL, SET_TOKEN_TOOL } from './permissions.js';

export const MOCK_DIRECT_TAG = '[direct]';
const HEADING_COLOR = '#0f766e';

export function wantsMockDirect(input: DriverInput): boolean {
  return input.ctx.request.prompt.includes(MOCK_DIRECT_TAG);
}

export async function runMockDirect(session: MockToolSession, input: DriverInput, preview: PreviewService | undefined): Promise<string> {
  if (!preview) return 'Direct edits need the preview, which this run does not have.';
  const deps = { preview, ctx: input.ctx };
  const heading = { selector: 'h1', style: { color: HEADING_COLOR } };
  const edited = await mockCanvasTool(session, EDIT_ELEMENT_TOOL, heading, () => runEditElement(deps, heading));
  const token = { name: '--primary', value: HEADING_COLOR, theme: 'light' as const };
  const set = await mockCanvasTool(session, SET_TOKEN_TOOL, token, () => runSetToken(deps, token));
  const headingLine = edited.isError ? `The heading edit failed: ${edited.content[0]?.text ?? ''}` : `Made the heading ${HEADING_COLOR}.`;
  const tokenLine = set.isError ? `The token edit failed: ${set.content[0]?.text ?? ''}` : `Set --primary to ${HEADING_COLOR}.`;
  return `${headingLine} ${tokenLine}`;
}

import type { AgentRunContext } from '../types.js';
import { loadRepoContext } from './repo-context.js';

export const getRunContextShape = {};

export async function runGetRunContext(deps: { ctx: Pick<AgentRunContext, 'project' | 'direction'> }) {
  const state = await loadRepoContext(deps.ctx.project, deps.ctx.direction.workTree);
  const files = state.files.map((file) => `- ${file.path} (${file.scope}, ${file.use}, ${file.sentBytes}/${file.bytes} bytes)`).join('\n');
  const text = state.text ? `${files}\n\n${state.text}` : 'This project has no repo context: no AGENTS.md, CLAUDE.md, DESIGN.md or PRODUCT.md in the app folder or the workspace root, or the project is not an attached app.';
  return { content: [{ type: 'text' as const, text }] };
}

import { z } from 'zod';
import { FRAME_STATES_NOTE, describeFrameStates } from '../app/frame-state-service.js';
import type { FrameStateDef, FrameStatesView } from '../../shared/frame-state.js';
import { frameRef } from '../canvas/tools.js';
import { loadTarget, studioCall } from './edit-deps.js';
import { defineTool, projectId } from './edit-kit.js';

const mockRule = z
  .object({
    path: z.string().trim().min(1).max(300).describe('Request path such as /api/trpc/patients.list or /api/public/*. A trailing * matches the prefix.'),
    method: z.string().regex(/^[A-Za-z]{3,7}$/).optional(),
    status: z.number().int().min(100).max(599).optional(),
    body: z.unknown().optional().describe('JSON body of the answer.'),
    delayMs: z.number().int().min(0).max(30_000).optional(),
  })
  .strict();

const stateId = z.string().regex(/^[a-z][a-z0-9-]{0,23}$/).describe('default, session, empty, loading, error, an existing mock state id from list_frame_states, or mock to make a new mock state.');

const listTool = defineTool(
  'list_frame_states',
  z.object({ projectId }).strict(),
  { title: 'List frame states', description: `List the preview states of an attached app (signed in, empty, loading, error and mock states), which frame shows which state, and the session in use. ${FRAME_STATES_NOTE}`, readOnly: true, idempotent: true },
  async (deps, input) => {
    const { project } = await loadTarget(deps, input.projectId);
    const view = await studioCall<FrameStatesView>(deps, 'GET', `/api/projects/${encodeURIComponent(project.id)}/frame-states`);
    return { result: { content: [{ type: 'text', text: describeFrameStates(project, view) }] } };
  },
);

const setTool = defineTool(
  'set_frame_state',
  z
    .object({
      projectId,
      frame: frameRef.describe('Frame id or @label from canvas_list.'),
      state: stateId,
      mock: z
        .object({ name: z.string().trim().min(1).max(40).optional(), rules: z.array(mockRule).max(40).optional(), signedIn: z.boolean().optional() })
        .strict()
        .optional()
        .describe('For state mock (new) or a mock state id (update): a name and answer rules. signedIn defaults to true.'),
    })
    .strict(),
  { title: 'Set frame state', description: `Show one app frame in a preview state, with the same code as the frame state menu on the canvas. The frame reloads in the studio. Use get_screenshot with frameId to see it. ${FRAME_STATES_NOTE}`, idempotent: true },
  async (deps, input) => {
    const { project, direction } = await loadTarget(deps, input.projectId);
    const done = await studioCall<{ view: FrameStatesView; state: FrameStateDef; frameId: string }>(deps, 'PUT', `/api/projects/${encodeURIComponent(project.id)}/frame-states/frames/${encodeURIComponent(input.frame)}`, { state: input.state, ...(input.mock ? { mock: input.mock } : {}) });
    const text = `Frame ${done.frameId} now shows ${done.state.name} (${done.state.id}).\n${describeFrameStates(project, done.view)}`;
    return { result: { content: [{ type: 'text', text }] }, activity: { projectId: project.id, directionId: direction.id, summary: `Set ${done.frameId} to ${done.state.name}`, frameId: done.frameId } };
  },
);

const sessionTool = defineTool(
  'set_frame_session',
  z
    .object({
      projectId,
      user: z.object({ name: z.string().trim().min(1).max(80), email: z.string().trim().min(3).max(120) }).strict().optional().describe('Mock user that signed-in states send while no real sign-in was kept.'),
      forgetCookies: z.boolean().optional().describe('Forget the cookies the app set in signed-in frames (a kept real sign-in).'),
    })
    .strict(),
  { title: 'Set frame session', description: `Change the session that signed-in frame states use, with the same code as the frame state menu: the mock user, or forget the kept cookies. ${FRAME_STATES_NOTE}`, idempotent: true },
  async (deps, input) => {
    const { project, direction } = await loadTarget(deps, input.projectId);
    const view = await studioCall<FrameStatesView>(deps, 'PATCH', `/api/projects/${encodeURIComponent(project.id)}/frame-states/session`, { ...(input.user ? { user: input.user } : {}), ...(input.forgetCookies ? { forget: true } : {}) });
    return { result: { content: [{ type: 'text', text: describeFrameStates(project, view) }] }, activity: { projectId: project.id, directionId: direction.id, summary: input.forgetCookies ? 'Forgot the kept frame cookies' : 'Changed the frame mock user' } };
  },
);

export const FRAME_STATE_TOOLS = [listTool, setTool, sessionTool];

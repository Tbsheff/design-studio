import { z } from 'zod';
import type { ComponentUsage } from '../../shared/usage-scope.js';
import { studioCall } from './edit-deps.js';
import { PATH_MAX, defineTool, directionId, ok, projectId, type ToolSpec } from './edit-kit.js';

const schema = z
  .object({
    projectId,
    directionId,
    file: z.string().trim().min(1).max(PATH_MAX).describe('Source file of a component or layout, relative to the app folder or the project folder, for example "components/auth/auth-background-panel.tsx". The file part of a data-studio-loc or a get_layers file:line:col works.'),
  })
  .strict();

export const GET_COMPONENT_USAGE_TEXT =
  'List the app routes that render one source file, directly from the page or through a layout or any import chain, the same count the studio inline prompt (Mod+I) shows as "All uses (N)". Returns file, component (its exported name) and routes ({route, file}). Use it before an edit to a shared component: with more than one route, change the call site (a prop or className) for one use, or change the file for all uses and name the routes. Prototype (HTML) projects return no routes. Read only.';

const getComponentUsage = defineTool('get_component_usage', schema, { title: 'List the routes that use a file', description: GET_COMPONENT_USAGE_TEXT, readOnly: true, idempotent: true }, async (deps, input) => {
  const query = new URLSearchParams({ file: input.file });
  if (input.directionId) query.set('directionId', input.directionId);
  const usage = await studioCall<ComponentUsage>(deps, 'GET', `/api/projects/${encodeURIComponent(input.projectId)}/usage?${query.toString()}`);
  return { result: ok(usage) };
});

export const USAGE_TOOLS: ToolSpec[] = [getComponentUsage];

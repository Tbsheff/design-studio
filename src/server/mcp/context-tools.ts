import { z } from 'zod';
import type { RepoContextState } from '../../shared/repo-context.js';
import { loadTarget, studioCall } from './edit-deps.js';
import { base, defineTool, directionId, ok, projectId, type Done } from './edit-kit.js';

const schema = z.object({ projectId, directionId }).strict();

const getRunContext = defineTool(
  'get_run_context',
  schema,
  {
    title: 'Read the run context',
    description:
      'Read the repo context that every studio run of this direction gets: the AGENTS.md, CLAUDE.md, DESIGN.md and PRODUCT.md of the app folder and the workspace root, cut to about 8 KB in total, with lines that look like secrets left out. Returns workspaceRoot, appDir, files (path, scope app or workspace, bytes, sentBytes, use: full, cut, design_md (the project DESIGN.md, sent as its own block), duplicate, import_only or too_large) and text, the exact <repo_context> block of the run message. Only attached apps have repo context. Read only; it does not start a run.',
    readOnly: true,
    idempotent: true,
  },
  async (deps, input): Promise<Done> => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    return { result: ok(await studioCall<RepoContextState>(deps, 'GET', `${base(project, direction.id)}/run-context`)) };
  },
);

export const CONTEXT_TOOLS = [getRunContext];

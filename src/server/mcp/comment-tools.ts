import { z } from 'zod';
import type { DesignComment } from '../../shared/contracts.js';
import { filterComments } from '../../shared/comments.js';
import { COMMENT_STATUSES, describeCommentList } from '../agent/comment-tools.js';
import { loadTarget, studioCall } from './edit-deps.js';
import { canvasFrameOf } from '../comments/frame.js';
import { defineTool, directionId, projectId } from './edit-kit.js';

const listTool = defineTool(
  'list_comments',
  z
    .object({
      projectId,
      directionId,
      status: z.enum(COMMENT_STATUSES).optional().describe('open (default: every status but resolved), all, or one status.'),
      frame: z.string().trim().max(300).optional().describe('Frame id, @label or page path such as / or /settings.'),
    })
    .strict(),
  { title: 'List comments', description: 'List the comments pinned on a direction, from you, other outside agents and the user, with the same server code as the studio Comments pane: number, author, text, replies, element (selector, source file:line, component), frame, id and status. Read only. Use reply_comment and resolve_comment with the id. Listing comments never sends them to the studio agent.', readOnly: true, idempotent: true },
  async (deps, input) => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    const all = await studioCall<DesignComment[]>(deps, 'GET', `/api/projects/${encodeURIComponent(project.id)}/d/${encodeURIComponent(direction.id)}/comments`);
    const status = input.status ?? 'open';
    const canvasFrame = await canvasFrameOf(project, (id) => deps.projects.projectDir(id), input.frame);
    const text = describeCommentList(filterComments(all, status, input.frame, canvasFrame), status, input.frame);
    return { result: { content: [{ type: 'text', text }] } };
  },
);

export const COMMENT_TOOLS = [listTool];

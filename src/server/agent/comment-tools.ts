import { z } from 'zod';
import type { CommentStatus, DesignComment } from '../../shared/contracts.js';
import { describeComment, filterComments, frameText, type CommentFilter } from '../../shared/comments.js';
import type { CommentStore } from '../store/comments.js';
import type { AgentRunContext } from '../types.js';

export const COMMENT_STATUSES = ['open', 'all', 'draft', 'queued', 'sent', 'resolved', 'orphaned'] as const satisfies readonly (CommentFilter | CommentStatus)[];

export const listCommentsShape = {
  status: z.enum(COMMENT_STATUSES).optional().describe('open (default: every status but resolved), all, or one status.'),
  frame: z.string().trim().max(300).optional().describe('Frame id, @label or page path such as / or /settings. Comments made before frames were recorded count as the entry page.'),
};

export const resolveCommentShape = {
  comment: z.union([z.string().regex(/^[A-Za-z0-9_-]{1,64}$/), z.number().int().min(1)]).describe('Comment id, or its number (#3 is 3).'),
};

interface CommentToolDeps {
  ctx: AgentRunContext;
  comments?: CommentStore;
}

type Text = { content: { type: 'text'; text: string }[]; isError?: boolean };

function text(value: string, isError = false): Text {
  return { content: [{ type: 'text', text: value }], ...(isError ? { isError } : {}) };
}

export function describeCommentList(list: DesignComment[], status: string, frame: string | undefined): string {
  const scope = `${status}${frame ? ` on ${frame}` : ''}`;
  if (list.length === 0) return `No ${scope} comments.`;
  const rows = list.map((comment) => `${describeComment(comment)}\n   id ${comment.id} · status ${comment.status}${comment.frame ? '' : ` · ${frameText(undefined)}`}`);
  return [`${list.length} ${scope} comment${list.length === 1 ? '' : 's'}:`, ...rows].join('\n');
}

export async function runListComments(deps: CommentToolDeps, args: { status?: CommentFilter; frame?: string }): Promise<Text> {
  if (!deps.comments) return text('Comments are not available in this run.', true);
  const { project, direction } = deps.ctx;
  const status = args.status ?? 'open';
  const list = filterComments(await deps.comments.list(project.id, direction.id), status, args.frame);
  return text(describeCommentList(list, status, args.frame));
}

function findComment(list: DesignComment[], ref: string | number): DesignComment | undefined {
  return typeof ref === 'number' ? list.find((comment) => comment.n === ref) : list.find((comment) => comment.id === ref || `#${comment.n}` === ref);
}

export async function runResolveComment(deps: CommentToolDeps, args: { comment: string | number }): Promise<Text> {
  if (!deps.comments) return text('Comments are not available in this run.', true);
  const { project, direction, request } = deps.ctx;
  if (request.plan || request.mode === 'critique') return text('resolve_comment is off in plan and critique runs.', true);
  const comment = findComment(await deps.comments.list(project.id, direction.id), args.comment);
  if (!comment) return text(`No comment ${String(args.comment)}. Call list_comments.`, true);
  if (comment.status === 'resolved') return text(`Comment #${comment.n} is already resolved.`);
  try {
    const done = await deps.comments.update(project.id, direction.id, comment.id, { status: 'resolved' }, 'user');
    return text(`Resolved comment #${done.n}.`);
  } catch (error) {
    return text(`Could not resolve #${comment.n}: ${error instanceof Error ? error.message : String(error)}`, true);
  }
}

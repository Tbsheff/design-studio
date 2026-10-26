import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Context, Hono } from 'hono';
import { z } from 'zod';
import { RUN_LEVELS } from '../../shared/contracts.js';
import type { DesignComment, Direction, Project, RunComment, RunLevel, RunMention, RunRequest, RunSummary, SelectionContext } from '../../shared/contracts.js';
import { COMMENT_TEXT_MAX, DRAW_POINTS_MAX, DRAW_STROKES_MAX, agentText, commentPrompt, isSendable } from '../../shared/comments.js';
import type { CommentStore } from '../store/comments.js';
import { BadRequestError, ConflictError, NotFoundError } from '../store/errors.js';
import type { AgentRunner, RunHandle } from '../types.js';
import { MENTION_MAX, parseMentions } from './mentions.js';

const rectSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite(),
  height: z.number().finite(),
});

const sourceLocSchema = z.object({
  file: z.string().min(1).max(1000),
  line: z.number().int().min(0),
  col: z.number().int().min(0),
});

const selectionSchema = z.object({
  selector: z.string().min(1).max(2000),
  tag: z.string().min(1).max(64),
  text: z.string().max(2000),
  outerHTML: z.string().max(10_000),
  styles: z.record(z.string().max(100), z.string().max(500)),
  rect: rectSchema,
  source: sourceLocSchema.nullable(),
  ancestors: z.array(z.string().max(200)).max(20),
});

const targetSchema = z.object({
  selector: z.string().min(1).max(2000),
  sourceLoc: sourceLocSchema.nullable().optional(),
  tag: z.string().min(1).max(64),
  textSnippet: z.string().max(200),
  rectHint: rectSchema,
});

const textSchema = z.string().trim().min(1, 'text is required').max(COMMENT_TEXT_MAX);

const authorSchema = z.string().trim().min(1).max(60);

const coordinate = z.number().finite().min(-10_000).max(100_000);

const drawingSchema = z
  .object({
    frame: z.object({ width: z.number().int().min(1).max(10_000), height: z.number().int().min(1).max(100_000) }),
    box: rectSchema,
    strokes: z
      .array(
        z.object({
          color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
          width: z.number().min(1).max(64),
          points: z.array(coordinate).min(2).max(DRAW_POINTS_MAX),
        }),
      )
      .min(1)
      .max(DRAW_STROKES_MAX),
  })
  .refine((drawing) => drawing.strokes.reduce((sum, stroke) => sum + stroke.points.length, 0) <= DRAW_POINTS_MAX, 'drawing has too many points');

const attachmentIdsSchema = z.array(z.string().regex(/^[A-Za-z0-9_-]{1,64}$/)).min(1).max(4);

const createSchema = z
  .object({
    text: textSchema,
    target: targetSchema,
    context: selectionSchema.optional(),
    status: z.enum(['draft', 'queued']).optional(),
    attachmentIds: attachmentIdsSchema.optional(),
    mentions: z.array(z.unknown()).max(MENTION_MAX).optional(),
    drawing: drawingSchema.optional(),
    author: authorSchema.optional(),
  })
  .refine((input) => !input.drawing || (input.attachmentIds?.length ?? 0) > 0, 'a drawing needs its image in attachmentIds');

const replySchema = z.object({ text: textSchema, author: authorSchema.optional() }).strict();

const updateSchema = z
  .object({
    text: textSchema.optional(),
    status: z.enum(['draft', 'queued', 'sent', 'resolved', 'orphaned']).optional(),
    target: targetSchema.optional(),
    context: selectionSchema.optional(),
  })
  .strict();

const reorderSchema = z.object({ ids: z.array(z.string().min(1).max(64)).min(1).max(500) });

const sendSchema = z.object({
  ids: z.array(z.string().min(1).max(64)).min(1).max(100).optional(),
  contexts: z.record(z.string().max(64), selectionSchema).optional(),
  level: z.enum(RUN_LEVELS as unknown as [RunLevel, ...RunLevel[]]).optional(),
});

interface CommentRouteDeps {
  comments: CommentStore;
  runner: AgentRunner;
  runsDir: (projectId: string) => string;
  loadDirection: (pid: string, did: string) => Promise<{ project: Project; direction: Direction }>;
  withDirection: <T>(pid: string, did: string, task: (project: Project, direction: Direction) => Promise<T>) => Promise<T>;
  startRun: (project: Project, direction: Direction, request: RunRequest) => Promise<string>;
  hasAttachment?: (projectId: string, attachmentId: string) => Promise<boolean>;
}

async function parseBody<T>(c: Context, schema: z.ZodType<T>): Promise<T> {
  const raw = (await c.req.text()).trim();
  let json: unknown = {};
  if (raw !== '') {
    try {
      json = JSON.parse(raw);
    } catch {
      throw new BadRequestError('body must be JSON');
    }
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new BadRequestError(issue ? `${issue.path.join('.') || 'body'}: ${issue.message}` : 'invalid body');
  }
  return parsed.data;
}

async function readSummary(file: string): Promise<RunSummary | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as RunSummary;
  } catch {
    return null;
  }
}

function mentionId(mention: RunMention): string {
  return mention.kind === 'file' ? `file:${mention.path}` : `${mention.kind}:${mention.name}`;
}

function mergedMentions(chosen: DesignComment[]): RunMention[] {
  const seen = new Map<string, RunMention>();
  for (const mention of chosen.flatMap((comment) => comment.mentions ?? [])) {
    if (!seen.has(mentionId(mention))) seen.set(mentionId(mention), mention);
  }
  return [...seen.values()].slice(0, MENTION_MAX);
}

function runPayload(chosen: DesignComment[], contexts: Record<string, SelectionContext> | undefined): Pick<RunRequest, 'comments' | 'attachmentIds' | 'mentions'> {
  const attachmentIds: string[] = [];
  const mentions = mergedMentions(chosen);
  const comments = chosen.map((comment): RunComment => {
    const own = (comment.attachmentIds ?? []).filter((id) => !attachmentIds.includes(id));
    attachmentIds.push(...own);
    const base = { id: comment.id, n: comment.n, text: agentText(comment) };
    if (!comment.drawing) return { ...base, element: contexts?.[comment.id] ?? comment.context ?? null };
    const image = attachmentIds.indexOf(comment.attachmentIds?.[0] ?? '') + 1;
    return { ...base, element: null, drawing: { frame: comment.drawing.frame, box: comment.drawing.box, image } };
  });
  return { comments, ...(attachmentIds.length ? { attachmentIds } : {}), ...(mentions.length ? { mentions } : {}) };
}

function chooseComments(all: DesignComment[], ids: string[] | undefined): DesignComment[] {
  if (!ids) return all.filter((comment) => comment.status === 'queued');
  return ids.map((id) => {
    const comment = all.find((item) => item.id === id);
    if (!comment) throw new NotFoundError(`comment ${id} not found`);
    if (!isSendable(comment.status)) throw new ConflictError(`bad_transition: ${comment.status} -> sent`);
    return comment;
  });
}

export function registerCommentRoutes(app: Hono, deps: CommentRouteDeps): void {
  const { comments, runner } = deps;
  const watched = new Set<string>();
  const base = '/api/projects/:pid/d/:did/comments';

  const settle = (pid: string, did: string, runId: string, status: string, versionId: string | null): Promise<unknown> =>
    comments.finishRun(pid, did, { runId, status, versionId }).catch((error: unknown) => {
      console.error('[comments] finish failed', error);
    });

  const watch = (pid: string, did: string, handle: RunHandle): void => {
    if (watched.has(handle.runId)) return;
    watched.add(handle.runId);
    handle.done.then(
      (summary) => settle(pid, did, handle.runId, summary.status, summary.versionId),
      () => settle(pid, did, handle.runId, 'failed', null),
    );
  };

  const reconcile = async (pid: string, did: string, list: DesignComment[]): Promise<void> => {
    const runIds = new Set(list.filter((comment) => comment.status === 'sent' && comment.runId).map((comment) => comment.runId as string));
    for (const runId of runIds) {
      const handle = runner.get(runId);
      if (handle) {
        watch(pid, did, handle);
        continue;
      }
      const summary = await readSummary(path.join(deps.runsDir(pid), `${runId}.json`));
      const status = summary && summary.status !== 'running' ? summary.status : 'failed';
      await settle(pid, did, runId, status, summary?.versionId ?? null);
    }
  };

  app.get(base, async (c) => {
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    const list = await comments.list(project.id, direction.id);
    if (list.some((comment) => comment.status === 'sent')) {
      await reconcile(project.id, direction.id, list);
      return c.json(await comments.list(project.id, direction.id));
    }
    return c.json(list);
  });

  app.post(base, async (c) => {
    const { mentions: rawMentions, ...input } = await parseBody(c, createSchema);
    const mentions = parseMentions(rawMentions);
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    for (const id of input.attachmentIds ?? []) {
      if (deps.hasAttachment && !(await deps.hasAttachment(project.id, id))) throw new NotFoundError(`attachment ${id} not found`);
    }
    return c.json(await comments.create(project.id, direction.id, { ...input, ...(mentions?.length ? { mentions } : {}) }));
  });

  app.post(`${base}/:cid/replies`, async (c) => {
    const { text, author } = await parseBody(c, replySchema);
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    return c.json(await comments.addReply(project.id, direction.id, c.req.param('cid'), text, author));
  });

  app.delete(`${base}/:cid/replies/:rid`, async (c) => {
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    return c.json(await comments.removeReply(project.id, direction.id, c.req.param('cid'), c.req.param('rid')));
  });

  app.post(`${base}/reorder`, async (c) => {
    const { ids } = await parseBody(c, reorderSchema);
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    return c.json(await comments.reorder(project.id, direction.id, ids));
  });

  app.post(`${base}/send`, async (c) => {
    const input = await parseBody(c, sendSchema);
    const result = await deps.withDirection(c.req.param('pid'), c.req.param('did'), async (project, direction) => {
      const chosen = chooseComments(await comments.list(project.id, direction.id), input.ids);
      if (chosen.length === 0) throw new BadRequestError('no_comments');
      const ids = chosen.map((comment) => comment.id);
      if (runner.isRunning(project.id, direction.id)) {
        await comments.requeue(project.id, direction.id, ids);
        throw new ConflictError('run_in_progress');
      }
      const request: RunRequest = {
        prompt: commentPrompt(chosen),
        mode: 'edit',
        ...(input.level ? { level: input.level } : {}),
        ...runPayload(chosen, input.contexts),
      };
      const runId = await deps.startRun(project, direction, request);
      const handle = runner.get(runId);
      const sent = comments.markSent(project.id, direction.id, ids, runId);
      if (handle) watch(project.id, direction.id, handle);
      return { runId, comments: await sent };
    });
    return c.json(result);
  });

  app.patch(`${base}/:cid`, async (c) => {
    const input = await parseBody(c, updateSchema);
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    return c.json(await comments.update(project.id, direction.id, c.req.param('cid'), input));
  });

  app.delete(`${base}/:cid`, async (c) => {
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    await comments.remove(project.id, direction.id, c.req.param('cid'));
    return c.json({ ok: true });
  });
}

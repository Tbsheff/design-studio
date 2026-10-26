import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import type { CommentDrawing, CommentStatus, CommentTarget, DesignComment, RunMention, SelectionContext } from '../../shared/contracts.js';
import { COMMENT_REPLIES_MAX, canTransition, isSendable, statusAfterRun, type CommentActor } from '../../shared/comments.js';
import type { EventBus } from '../types.js';
import { BadRequestError, ConflictError, NotFoundError, assertSafeId } from './errors.js';
import { createKeyedMutex } from './mutex.js';

interface CommentFile {
  nextN: number;
  comments: DesignComment[];
}

export interface CreateCommentInput {
  text: string;
  target: CommentTarget;
  context?: SelectionContext;
  status?: 'draft' | 'queued';
  attachmentIds?: string[];
  mentions?: RunMention[];
  drawing?: CommentDrawing;
  author?: string;
}

export interface UpdateCommentInput {
  text?: string;
  status?: CommentStatus;
  target?: CommentTarget;
  context?: SelectionContext;
}

export interface RunOutcome {
  runId: string;
  status: string;
  versionId: string | null;
}

export interface CommentStore {
  list(projectId: string, directionId: string): Promise<DesignComment[]>;
  create(projectId: string, directionId: string, input: CreateCommentInput): Promise<DesignComment>;
  update(projectId: string, directionId: string, commentId: string, input: UpdateCommentInput, actor?: CommentActor): Promise<DesignComment>;
  remove(projectId: string, directionId: string, commentId: string): Promise<void>;
  addReply(projectId: string, directionId: string, commentId: string, text: string, author?: string): Promise<DesignComment>;
  removeReply(projectId: string, directionId: string, commentId: string, replyId: string): Promise<DesignComment>;
  reorder(projectId: string, directionId: string, ids: string[]): Promise<DesignComment[]>;
  markSent(projectId: string, directionId: string, ids: string[], runId: string): Promise<DesignComment[]>;
  requeue(projectId: string, directionId: string, ids: string[]): Promise<DesignComment[]>;
  finishRun(projectId: string, directionId: string, outcome: RunOutcome): Promise<DesignComment[]>;
}

function emptyFile(): CommentFile {
  return { nextN: 1, comments: [] };
}

function isCommentFile(value: unknown): value is CommentFile {
  if (typeof value !== 'object' || value === null) return false;
  const file = value as Partial<CommentFile>;
  return typeof file.nextN === 'number' && Array.isArray(file.comments);
}

export function reorderSubset<T extends { id: string }>(items: T[], ids: string[]): T[] {
  const wanted = new Set(ids);
  if (wanted.size !== ids.length) throw new BadRequestError('ids must be unique');
  const byId = new Map(items.map((item) => [item.id, item]));
  for (const id of ids) if (!byId.has(id)) throw new NotFoundError(`comment ${id} not found`);
  const ordered = ids.map((id) => byId.get(id) as T);
  let cursor = 0;
  return items.map((item) => (wanted.has(item.id) ? (ordered[cursor++] as T) : item));
}

export function createCommentStore(dataDir: string, bus: EventBus): CommentStore {
  const lock = createKeyedMutex();

  const fileOf = (projectId: string, directionId: string): string =>
    path.join(dataDir, 'projects', assertSafeId(projectId, 'projectId'), 'comments', `${assertSafeId(directionId, 'directionId')}.json`);

  const read = async (file: string): Promise<CommentFile> => {
    if (!existsSync(file)) return emptyFile();
    try {
      const parsed: unknown = JSON.parse(await readFile(file, 'utf8'));
      return isCommentFile(parsed) ? parsed : emptyFile();
    } catch (error) {
      console.error('[comments] unreadable file', file, error);
      return emptyFile();
    }
  };

  const write = async (file: string, data: CommentFile): Promise<void> => {
    await mkdir(path.dirname(file), { recursive: true });
    const temp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
    await writeFile(temp, JSON.stringify(data, null, 2));
    await rename(temp, file);
  };

  const mutate = <T>(projectId: string, directionId: string, change: (data: CommentFile) => T): Promise<T> => {
    const file = fileOf(projectId, directionId);
    return lock(file, async () => {
      const data = await read(file);
      const before = JSON.stringify(data);
      const result = change(data);
      if (JSON.stringify(data) !== before) {
        await write(file, data);
        bus.emit({ type: 'comments.changed', projectId, directionId, comments: data.comments });
      }
      return result;
    });
  };

  const find = (data: CommentFile, commentId: string): DesignComment => {
    const comment = data.comments.find((item) => item.id === commentId);
    if (!comment) throw new NotFoundError(`comment ${commentId} not found`);
    return comment;
  };

  const move = (comment: DesignComment, status: CommentStatus, actor: CommentActor): void => {
    if (!canTransition(comment.status, status, actor)) throw new ConflictError(`bad_transition: ${comment.status} -> ${status}`);
    comment.status = status;
    comment.updatedAt = Date.now();
  };

  return {
    async list(projectId, directionId) {
      return (await read(fileOf(projectId, directionId))).comments;
    },

    create(projectId, directionId, input) {
      return mutate(projectId, directionId, (data) => {
        const now = Date.now();
        const comment: DesignComment = {
          id: nanoid(10),
          n: data.nextN,
          createdAt: now,
          updatedAt: now,
          text: input.text,
          target: input.target,
          ...(input.context ? { context: input.context } : {}),
          status: input.status ?? 'queued',
          ...(input.attachmentIds?.length ? { attachmentIds: input.attachmentIds } : {}),
          ...(input.mentions?.length ? { mentions: input.mentions } : {}),
          ...(input.drawing ? { drawing: input.drawing } : {}),
          ...(input.author ? { author: input.author } : {}),
        };
        data.nextN += 1;
        data.comments.push(comment);
        return comment;
      });
    },

    update(projectId, directionId, commentId, input, actor = 'user') {
      return mutate(projectId, directionId, (data) => {
        const comment = find(data, commentId);
        if (input.status !== undefined) move(comment, input.status, actor);
        if (input.text !== undefined) comment.text = input.text;
        if (input.target !== undefined) comment.target = input.target;
        if (input.context !== undefined) comment.context = input.context;
        if (input.status === 'queued') {
          delete comment.runId;
          delete comment.versionId;
        }
        comment.updatedAt = Date.now();
        return comment;
      });
    },

    async remove(projectId, directionId, commentId) {
      await mutate(projectId, directionId, (data) => {
        find(data, commentId);
        data.comments = data.comments.filter((item) => item.id !== commentId);
      });
    },

    addReply(projectId, directionId, commentId, text, author) {
      return mutate(projectId, directionId, (data) => {
        const comment = find(data, commentId);
        const replies = comment.replies ?? [];
        if (replies.length >= COMMENT_REPLIES_MAX) throw new BadRequestError(`a comment can have at most ${COMMENT_REPLIES_MAX} replies`);
        const now = Date.now();
        comment.replies = [...replies, { id: nanoid(10), text, createdAt: now, ...(author ? { author } : {}) }];
        comment.updatedAt = now;
        return comment;
      });
    },

    removeReply(projectId, directionId, commentId, replyId) {
      return mutate(projectId, directionId, (data) => {
        const comment = find(data, commentId);
        const replies = comment.replies ?? [];
        if (!replies.some((reply) => reply.id === replyId)) throw new NotFoundError(`reply ${replyId} not found`);
        comment.replies = replies.filter((reply) => reply.id !== replyId);
        if (comment.replies.length === 0) delete comment.replies;
        comment.updatedAt = Date.now();
        return comment;
      });
    },

    reorder(projectId, directionId, ids) {
      return mutate(projectId, directionId, (data) => {
        data.comments = reorderSubset(data.comments, ids);
        return data.comments;
      });
    },

    markSent(projectId, directionId, ids, runId) {
      return mutate(projectId, directionId, (data) => {
        const sent = ids.map((id) => find(data, id));
        for (const comment of sent) {
          if (!isSendable(comment.status)) throw new ConflictError(`bad_transition: ${comment.status} -> sent`);
          move(comment, 'sent', 'server');
          comment.runId = runId;
          delete comment.versionId;
        }
        return sent;
      });
    },

    requeue(projectId, directionId, ids) {
      return mutate(projectId, directionId, (data) => {
        const moved = ids.map((id) => find(data, id)).filter((comment) => comment.status === 'draft');
        for (const comment of moved) move(comment, 'queued', 'server');
        return moved;
      });
    },

    finishRun(projectId, directionId, outcome) {
      return mutate(projectId, directionId, (data) => {
        const next = statusAfterRun(outcome.status);
        const touched = data.comments.filter((comment) => comment.status === 'sent' && comment.runId === outcome.runId);
        for (const comment of touched) {
          move(comment, next, 'server');
          if (next === 'resolved') comment.versionId = outcome.versionId;
          else {
            delete comment.runId;
            delete comment.versionId;
          }
        }
        return touched;
      });
    },
  };
}

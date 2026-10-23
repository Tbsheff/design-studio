import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { AnchorQuery, CommentStatus, CommentTarget, DesignComment, SelectionContext } from '../shared/contracts';
import { anchorQueryOf, targetFromSelection } from '../shared/comments';
import { ApiError, errorText, json } from './api';
import { useProjectEvents } from './events';

export type DescribeAnchors = (queries: AnchorQuery[]) => Promise<(SelectionContext | null)[]>;

export interface CommentPatch {
  text?: string;
  status?: CommentStatus;
  target?: CommentTarget;
  context?: SelectionContext;
}

export interface CommentsControl {
  directionId: string | null;
  composerActive: boolean;
  comments: DesignComment[];
  queued: DesignComment[];
  notice: string | null;
  sending: boolean;
  openId: string | null;
  repinId: string | null;
  describeRef: MutableRefObject<DescribeAnchors | null>;
  setOpenId: (id: string | null) => void;
  setRepinId: (id: string | null) => void;
  clearNotice: () => void;
  add: (selections: SelectionContext[], text: string, sendNow: boolean) => Promise<boolean>;
  update: (id: string, patch: CommentPatch) => Promise<void>;
  remove: (id: string) => Promise<void>;
  move: (id: string, delta: -1 | 1) => Promise<void>;
  send: (ids?: string[]) => Promise<void>;
  repin: (id: string, selection: SelectionContext) => Promise<void>;
}

const RUNNING_NOTICE = 'Agent is running: queued';
const DESCRIBE_TIMEOUT_MS = 800;

function base(projectId: string, directionId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/d/${encodeURIComponent(directionId)}/comments`;
}

function queuedOf(comments: DesignComment[]): DesignComment[] {
  return comments.filter((comment) => comment.status === 'queued');
}

async function describeWithTimeout(describe: DescribeAnchors | null, comments: DesignComment[]): Promise<Record<string, SelectionContext>> {
  if (!describe || comments.length === 0) return {};
  const timeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), DESCRIBE_TIMEOUT_MS));
  const contexts = await Promise.race([describe(comments.map(anchorQueryOf)).catch(() => null), timeout]);
  const out: Record<string, SelectionContext> = {};
  comments.forEach((comment, index) => {
    const context = contexts?.[index];
    if (context) out[comment.id] = context;
  });
  return out;
}

export function useComments(projectId: string, directionId: string | null, composerActive = false): CommentsControl {
  const [comments, setComments] = useState<DesignComment[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [repinId, setRepinId] = useState<string | null>(null);
  const describeRef = useRef<DescribeAnchors | null>(null);
  const didRef = useRef(directionId);
  didRef.current = directionId;
  const listRef = useRef(comments);
  listRef.current = comments;

  useEffect(() => {
    setComments([]);
    setOpenId(null);
    setRepinId(null);
    setNotice(null);
    if (!directionId) return;
    let alive = true;
    json<DesignComment[]>('GET', base(projectId, directionId))
      .then((list) => alive && setComments(list))
      .catch((err: unknown) => alive && setNotice(errorText(err)));
    return () => {
      alive = false;
    };
  }, [projectId, directionId]);

  useProjectEvents(projectId, (event) => {
    if (event.type === 'comments.changed' && event.directionId === didRef.current) setComments(event.comments);
  });

  const call = useCallback(
    async <T>(method: string, suffix: string, body?: unknown): Promise<T | null> => {
      const did = didRef.current;
      if (!did) return null;
      return json<T>(method, `${base(projectId, did)}${suffix}`, body);
    },
    [projectId],
  );

  const send = useCallback(
    async (ids?: string[]) => {
      const chosen = ids ? listRef.current.filter((comment) => ids.includes(comment.id)) : queuedOf(listRef.current);
      if (chosen.length === 0) return;
      setSending(true);
      try {
        const contexts = await describeWithTimeout(describeRef.current, chosen);
        await call('POST', '/send', { ids: chosen.map((comment) => comment.id), contexts });
        setNotice(null);
      } catch (err) {
        setNotice(err instanceof ApiError && err.status === 409 && err.code === 'run_in_progress' ? RUNNING_NOTICE : errorText(err));
      } finally {
        setSending(false);
      }
    },
    [call],
  );

  const add = useCallback(
    async (selections: SelectionContext[], text: string, sendNow: boolean): Promise<boolean> => {
      const clean = text.trim();
      if (!clean || selections.length === 0) return false;
      try {
        const created: DesignComment[] = [];
        for (const selection of selections) {
          const comment = await call<DesignComment>('POST', '', {
            text: clean,
            target: targetFromSelection(selection),
            context: selection,
            status: sendNow ? 'draft' : 'queued',
          });
          if (comment) created.push(comment);
        }
        setComments((prev) => [...prev.filter((c) => !created.some((n) => n.id === c.id)), ...created]);
        if (sendNow) {
          listRef.current = [...listRef.current.filter((c) => !created.some((n) => n.id === c.id)), ...created];
          await send(created.map((comment) => comment.id));
        }
        return true;
      } catch (err) {
        setNotice(errorText(err));
        return false;
      }
    },
    [call, send],
  );

  const update = useCallback(
    async (id: string, patch: CommentPatch) => {
      try {
        await call('PATCH', `/${encodeURIComponent(id)}`, patch);
      } catch (err) {
        setNotice(errorText(err));
      }
    },
    [call],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await call('DELETE', `/${encodeURIComponent(id)}`);
        setOpenId((current) => (current === id ? null : current));
      } catch (err) {
        setNotice(errorText(err));
      }
    },
    [call],
  );

  const move = useCallback(
    async (id: string, delta: -1 | 1) => {
      const ids = queuedOf(listRef.current).map((comment) => comment.id);
      const at = ids.indexOf(id);
      const to = at + delta;
      if (at < 0 || to < 0 || to >= ids.length) return;
      [ids[at], ids[to]] = [ids[to] as string, ids[at] as string];
      try {
        await call('POST', '/reorder', { ids });
      } catch (err) {
        setNotice(errorText(err));
      }
    },
    [call],
  );

  const repin = useCallback(
    async (id: string, selection: SelectionContext) => {
      const comment = listRef.current.find((item) => item.id === id);
      setRepinId(null);
      if (!comment) return;
      await update(id, {
        target: targetFromSelection(selection),
        context: selection,
        ...(comment.status === 'orphaned' ? { status: 'queued' as const } : {}),
      });
    },
    [update],
  );

  const queued = useMemo(() => queuedOf(comments), [comments]);

  return {
    directionId,
    composerActive,
    comments,
    queued,
    notice,
    sending,
    openId,
    repinId,
    describeRef,
    setOpenId,
    setRepinId,
    clearNotice: () => setNotice(null),
    add,
    update,
    remove,
    move,
    send,
    repin,
  };
}

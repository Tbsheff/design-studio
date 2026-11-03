import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { MutableRefObject } from "react";

import {
  ApiError,
  anchorQueryOf,
  api,
  canPickForChat,
  drawingTarget,
  errorText,
  json,
  readStored,
  targetFromSelection,
  useProjectEvents,
  writeStored,
} from "./deps.js";
import type {
  AnchorQuery,
  CommentDrawing,
  CommentFrame,
  CommentPrefill,
  CommentStatus,
  CommentTarget,
  DesignComment,
  JsonBody,
  RunMention,
  SelectionContext,
} from "./deps.js";

export type DescribeAnchors = (
  queries: AnchorQuery[]
) => Promise<(SelectionContext | null)[]>;

export interface CommentPatch {
  text?: string;
  status?: CommentStatus;
  target?: CommentTarget;
  context?: SelectionContext;
}

export interface CommentExtras {
  mentions?: RunMention[];
  attachmentIds?: string[];
  offset?: CommentTarget["offset"];
}

function targetWith(
  selection: SelectionContext,
  offset: CommentTarget["offset"]
): CommentTarget {
  const target = targetFromSelection(selection);

  return offset ? { ...target, offset } : target;
}

export interface CommentsControl {
  directionId: string | null;
  composerActive: boolean;
  running: boolean;
  comments: DesignComment[];
  queued: DesignComment[];
  inChat: DesignComment[];
  notice: string | null;
  sending: boolean;
  openId: string | null;
  repinId: string | null;
  describeRef: MutableRefObject<DescribeAnchors | null>;
  setOpenId: (id: string | null) => void;
  setRepinId: (id: string | null) => void;
  clearNotice: () => void;
  add: (
    selections: SelectionContext[],
    text: string,
    toClaude: boolean,
    extras?: CommentExtras
  ) => Promise<boolean>;
  update: (id: string, patch: CommentPatch) => Promise<void>;
  remove: (id: string) => Promise<void>;
  move: (id: string, delta: -1 | 1) => Promise<void>;
  send: (ids?: string[]) => Promise<void>;
  repin: (
    id: string,
    selection: SelectionContext,
    offset?: CommentTarget["offset"]
  ) => Promise<void>;
  addDrawing: (input: {
    text: string;
    drawing: CommentDrawing;
    image: Blob;
    toClaude: boolean;
    extras?: CommentExtras;
  }) => Promise<boolean>;
  reply: (id: string, text: string) => Promise<boolean>;
  removeReply: (id: string, replyId: string) => Promise<void>;
  showResolved: boolean;
  setShowResolved: (on: boolean) => void;
  frameRef: MutableRefObject<CommentFrame | null>;
  picked: string[];
  togglePick: (id: string) => void;
  clearPicked: () => void;
  toChat: (ids: string[]) => Promise<void>;
  preparing: boolean;
}

export type OnPrefill = (prefill: CommentPrefill) => void;

const SHOW_RESOLVED_KEY = "studio.comments.showResolved";

function readShowResolved(): boolean {
  return readStored(SHOW_RESOLVED_KEY) === "1";
}

const RUNNING_NOTICE = "Agent is running: queued";
const DESCRIBE_TIMEOUT_MS = 800;

function base(projectId: string, directionId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/d/${encodeURIComponent(directionId)}/comments`;
}

function queuedOf(comments: DesignComment[]): DesignComment[] {
  return comments.filter((comment) => comment.status === "queued");
}

async function describeWithTimeout(
  describe: DescribeAnchors | null,
  comments: DesignComment[]
): Promise<Record<string, SelectionContext>> {
  if (!describe || comments.length === 0) {
    return {};
  }

  const timeout = new Promise<null>((resolve) =>
    window.setTimeout(() => resolve(null), DESCRIBE_TIMEOUT_MS)
  );

  const contexts = await Promise.race([
    describe(comments.map(anchorQueryOf)).catch(() => null),
    timeout,
  ]);

  const out: Record<string, SelectionContext> = {};
  comments.forEach((comment, index) => {
    const context = contexts?.[index];

    if (context) {
      out[comment.id] = context;
    }
  });

  return out;
}

function frameField(ref: MutableRefObject<CommentFrame | null>): {
  frame?: CommentFrame;
} {
  return ref.current ? { frame: ref.current } : {};
}

function usePicks(comments: DesignComment[]) {
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => {
    setPicked((prev) => {
      const next = prev.filter((id) =>
        comments.some(
          (comment) => comment.id === id && canPickForChat(comment.status)
        )
      );

      return next.length === prev.length ? prev : next;
    });
  }, [comments]);

  const togglePick = useCallback(
    (id: string) =>
      setPicked((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      ),
    []
  );

  const clearPicked = useCallback(() => setPicked([]), []);

  return { picked, togglePick, clearPicked };
}

export function useComments(
  projectId: string,
  directionId: string | null,
  composerActive = false,
  running = false,
  onPrefill?: OnPrefill
): CommentsControl {
  const [comments, setComments] = useState<DesignComment[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, startSending] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [repinId, setRepinId] = useState<string | null>(null);
  const [showResolved, setShowResolvedState] = useState(readShowResolved);
  const describeRef = useRef<DescribeAnchors | null>(null);
  const frameRef = useRef<CommentFrame | null>(null);
  const [preparing, startPreparing] = useTransition();
  const prefillRef = useRef(onPrefill);
  prefillRef.current = onPrefill;
  const didRef = useRef(directionId);
  didRef.current = directionId;
  const listRef = useRef(comments);
  listRef.current = comments;
  const runningRef = useRef(running);
  runningRef.current = running;
  const afterRun = useRef(new Set<string>());
  const [chatIds, setChatIds] = useState<string[]>([]);
  const chatRef = useRef(chatIds);
  chatRef.current = chatIds;

  useEffect(() => {
    setComments([]);
    setOpenId(null);
    setRepinId(null);
    setNotice(null);
    afterRun.current.clear();

    if (!directionId) {
      return;
    }

    let alive = true;
    const load = async () => {
      try {
        const list = await json<DesignComment[]>(
          "GET",
          base(projectId, directionId)
        );

        if (alive) {
          setComments(list);
        }
      } catch (err: unknown) {
        if (alive) {
          setNotice(errorText(err));
        }
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, [projectId, directionId]);

  useProjectEvents(projectId, (event) => {
    if (
      event.type === "comments.changed" &&
      event.directionId === didRef.current
    ) {
      setComments(event.comments);
    }
  });

  const call = useCallback(
    async <T>(
      method: string,
      suffix: string,
      body?: JsonBody
    ): Promise<T | null> => {
      const did = didRef.current;

      if (!did) {
        return null;
      }

      return json<T>(method, `${base(projectId, did)}${suffix}`, body);
    },
    [projectId]
  );

  const send = useCallback(
    async (ids?: string[]) => {
      const chosen = ids
        ? listRef.current.filter((comment) => ids.includes(comment.id))
        : queuedOf(listRef.current).filter(
            (comment) => !chatRef.current.includes(comment.id)
          );

      if (chosen.length === 0) {
        return;
      }

      const pending = (async (): Promise<void> => {
        try {
          const contexts = await describeWithTimeout(
            describeRef.current,
            chosen.filter((comment) => !comment.drawing)
          );

          await call("POST", "/send", {
            ids: chosen.map((comment) => comment.id),
            contexts,
          });
          setNotice(null);
        } catch (err) {
          setNotice(
            err instanceof ApiError &&
              err.status === 409 &&
              err.tag === "run_in_progress"
              ? RUNNING_NOTICE
              : errorText(err)
          );
        }
      })();

      startSending(async () => {
        await pending;
      });

      await pending;
    },
    [call]
  );

  const deliver = useCallback(
    async (created: DesignComment[], toClaude: boolean) => {
      if (!toClaude || created.length === 0) {
        return;
      }

      const ids = created.map((comment) => comment.id);

      if (runningRef.current) {
        for (const id of ids) {
          afterRun.current.add(id);
        }

        return;
      }

      listRef.current = [
        ...listRef.current.filter((c) => !ids.includes(c.id)),
        ...created,
      ];
      await send(ids);
    },
    [send]
  );

  const add = useCallback(
    async (
      selections: SelectionContext[],
      text: string,
      toClaude: boolean,
      extras: CommentExtras = {}
    ): Promise<boolean> => {
      const clean = text.trim();

      if (!clean || selections.length === 0) {
        return false;
      }

      const now = toClaude && !runningRef.current;

      try {
        const created: DesignComment[] = [];

        for (const selection of selections) {
          const comment = await call<DesignComment>("POST", "", {
            text: clean,
            target: targetWith(
              selection,
              selections.length === 1 ? extras.offset : undefined
            ),
            context: selection,
            status: now ? "draft" : "queued",
            ...frameField(frameRef),
            ...(extras.mentions?.length ? { mentions: extras.mentions } : {}),
            ...(extras.attachmentIds?.length
              ? { attachmentIds: extras.attachmentIds }
              : {}),
          });

          if (comment) {
            created.push(comment);
          }
        }

        setComments((prev) => [
          ...prev.filter((c) => !created.some((n) => n.id === c.id)),
          ...created,
        ]);
        await deliver(created, toClaude);

        return true;
      } catch (err) {
        setNotice(errorText(err));

        return false;
      }
    },
    [call, deliver]
  );

  useEffect(() => {
    for (const id of [...afterRun.current]) {
      if (comments.find((comment) => comment.id === id)?.status !== "queued") {
        afterRun.current.delete(id);
      }
    }
  }, [comments]);

  useEffect(() => {
    if (running || afterRun.current.size === 0) {
      return;
    }

    const ready = listRef.current.filter(
      (comment) =>
        afterRun.current.has(comment.id) && comment.status === "queued"
    );

    if (ready.length > 0) {
      void send(ready.map((comment) => comment.id));
    }
  }, [running, send]);

  const update = useCallback(
    async (id: string, patch: CommentPatch) => {
      try {
        await call("PATCH", `/${encodeURIComponent(id)}`, patch);
      } catch (err) {
        setNotice(errorText(err));
      }
    },
    [call]
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await call("DELETE", `/${encodeURIComponent(id)}`);
        setOpenId((current) => (current === id ? null : current));
      } catch (err) {
        setNotice(errorText(err));
      }
    },
    [call]
  );

  const move = useCallback(
    async (id: string, delta: -1 | 1) => {
      const ids = queuedOf(listRef.current).map((comment) => comment.id);
      const at = ids.indexOf(id);
      const to = at + delta;

      if (at === -1 || to < 0 || to >= ids.length) {
        return;
      }

      [ids[at], ids[to]] = [ids[to] as string, ids[at] as string];

      try {
        await call("POST", "/reorder", { ids });
      } catch (err) {
        setNotice(errorText(err));
      }
    },
    [call]
  );

  const repin = useCallback(
    async (
      id: string,
      selection: SelectionContext,
      offset?: CommentTarget["offset"]
    ) => {
      const comment = listRef.current.find((item) => item.id === id);
      setRepinId(null);

      if (!comment) {
        return;
      }

      await update(id, {
        target: targetWith(selection, offset),
        context: selection,
        ...(comment.status === "orphaned" ? { status: "queued" as const } : {}),
      });
    },
    [update]
  );

  const merge = useCallback((comment: DesignComment) => {
    setComments((prev) =>
      prev.some((c) => c.id === comment.id)
        ? prev.map((c) => (c.id === comment.id ? comment : c))
        : [...prev, comment]
    );
  }, []);

  const addDrawing = useCallback(
    async (input: {
      text: string;
      drawing: CommentDrawing;
      image: Blob;
      toClaude: boolean;
      extras?: CommentExtras;
    }): Promise<boolean> => {
      const clean = input.text.trim();

      if (!clean) {
        return false;
      }

      const now = input.toClaude && !runningRef.current;

      try {
        const attachment = await api.uploadAttachment(
          projectId,
          new File([input.image], "drawing.png", { type: "image/png" })
        );

        const comment = await call<DesignComment>("POST", "", {
          text: clean,
          target: drawingTarget(input.drawing.box),
          status: now ? "draft" : "queued",
          attachmentIds: [
            attachment.id,
            ...(input.extras?.attachmentIds ?? []),
          ].slice(0, 4),
          ...(input.extras?.mentions?.length
            ? { mentions: input.extras.mentions }
            : {}),
          drawing: input.drawing,
          ...frameField(frameRef),
        });

        if (!comment) {
          return false;
        }

        merge(comment);
        await deliver([comment], input.toClaude);

        return true;
      } catch (err) {
        setNotice(errorText(err));

        return false;
      }
    },
    [call, deliver, merge, projectId]
  );

  const reply = useCallback(
    async (id: string, text: string): Promise<boolean> => {
      const clean = text.trim();

      if (!clean) {
        return false;
      }

      try {
        const comment = await call<DesignComment>(
          "POST",
          `/${encodeURIComponent(id)}/replies`,
          { text: clean }
        );

        if (comment) {
          merge(comment);
        }

        return comment !== null;
      } catch (err) {
        setNotice(errorText(err));

        return false;
      }
    },
    [call, merge]
  );

  const removeReply = useCallback(
    async (id: string, replyId: string) => {
      try {
        const comment = await call<DesignComment>(
          "DELETE",
          `/${encodeURIComponent(id)}/replies/${encodeURIComponent(replyId)}`
        );

        if (comment) {
          merge(comment);
        }
      } catch (err) {
        setNotice(errorText(err));
      }
    },
    [call, merge]
  );

  const setShowResolved = useCallback((on: boolean) => {
    setShowResolvedState(on);

    writeStored(SHOW_RESOLVED_KEY, on ? "1" : "0");
  }, []);

  const queued = useMemo(
    () => queuedOf(comments).filter((comment) => !chatIds.includes(comment.id)),
    [comments, chatIds]
  );

  const inChat = useMemo(
    () =>
      comments.filter(
        (comment) => chatIds.includes(comment.id) && comment.status === "queued"
      ),
    [comments, chatIds]
  );

  const picks = usePicks(comments);
  const clearPicks = picks.clearPicked;

  const toChat = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) {
        return;
      }

      const pending = (async (): Promise<void> => {
        try {
          const prefill = await call<CommentPrefill>("POST", "/prefill", {
            ids,
          });

          if (prefill) {
            prefillRef.current?.(prefill);
            setChatIds((prev) => [
              ...new Set([...prev, ...prefill.commentIds]),
            ]);
          }

          clearPicks();
          setNotice(null);
        } catch (err) {
          setNotice(errorText(err));
        }
      })();

      startPreparing(async () => {
        await pending;
      });

      await pending;
    },
    [call, clearPicks]
  );

  return {
    directionId,
    composerActive,
    running,
    comments,
    queued,
    inChat,
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
    addDrawing,
    reply,
    removeReply,
    showResolved,
    setShowResolved,
    frameRef,
    ...picks,
    toChat,
    preparing,
  };
}

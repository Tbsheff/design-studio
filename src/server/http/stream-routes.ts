import { randomBytes } from "node:crypto";

import type { Context, Hono } from "hono";
import { streamSSE } from "hono/streaming";

import {
  APP_STREAM_PATH,
  STREAM_APPROVALS,
  STREAM_HELLO,
  type StreamWatchRequest,
} from "../../shared/app-stream.js";
import type { StudioEvent } from "../../shared/contracts.js";
import { BadRequestError, NotFoundError } from "../store/errors.js";
import type { EventBus, ProjectStore } from "../types.js";
import type { ApprovalFeed } from "./mcp-routes.js";

const HEARTBEAT_MS = 15_000;
const RETRY_MS = 1000;
const MAX_WATCH = 64;

export interface StreamTracker {
  opened(): void;
  closed(): void;
}

interface StreamDeps {
  bus: EventBus;
  projects: Pick<ProjectStore, "get">;
  approvals: ApprovalFeed;
  track: StreamTracker;
}

interface Queued {
  event: StudioEvent;
  replay: boolean;
}

interface Session {
  watch(projectId: string, afterSeq: number): void;
  unwatch(projectId: string): void;
}

function createSession(bus: EventBus, wake: () => void) {
  const queue: Queued[] = [];
  const subs = new Map<string, () => void>();
  const sent = new Map<string, number>();
  const session: Session = {
    watch(projectId, afterSeq) {
      for (const event of bus.since(projectId, afterSeq))
        queue.push({ event, replay: true });
      if (!subs.has(projectId)) {
        subs.set(
          projectId,
          bus.subscribe(projectId, (event) => {
            queue.push({ event, replay: false });
            wake();
          })
        );
      }
      wake();
    },
    unwatch(projectId) {
      subs.get(projectId)?.();
      subs.delete(projectId);
      sent.delete(projectId);
    },
  };
  const take = (): StudioEvent[] => {
    const out: StudioEvent[] = [];
    for (const item of queue.splice(0, queue.length)) {
      const last = sent.get(item.event.projectId) ?? 0;
      if (!item.replay && item.event.seq <= last) continue;
      sent.set(item.event.projectId, Math.max(last, item.event.seq));
      out.push(item.event);
    }
    return out;
  };
  const close = (): void => {
    for (const stop of subs.values()) stop();
    subs.clear();
  };
  return { session, take, close, idle: () => queue.length === 0 };
}

function parseWatch(input: unknown): {
  watch: [string, number][];
  unwatch: string[];
} {
  const raw = (input ?? {}) as StreamWatchRequest;
  const watch = Object.entries(raw.watch ?? {}).filter(
    ([, after]) => Number.isInteger(after) && after >= 0
  );
  const unwatch = Array.isArray(raw.unwatch)
    ? raw.unwatch.filter((id): id is string => typeof id === "string")
    : [];
  if (watch.length + unwatch.length > MAX_WATCH)
    throw new BadRequestError("too many projects in one request");
  return { watch, unwatch };
}

async function knownProject(
  projects: StreamDeps["projects"],
  projectId: string
): Promise<boolean> {
  try {
    await projects.get(projectId);
    return true;
  } catch {
    return false;
  }
}

export function registerStreamRoutes(app: Hono, deps: StreamDeps): void {
  const sessions = new Map<string, Session>();

  app.get(APP_STREAM_PATH, (c) =>
    streamSSE(c, async (stream) => {
      const sid = randomBytes(12).toString("base64url");
      let wake: (() => void) | null = null;
      let closed = false;
      let approvalsDirty = true;
      let lastApprovals = "";
      const nudge = (): void => wake?.();
      const live = createSession(deps.bus, nudge);
      sessions.set(sid, live.session);
      deps.track.opened();
      const stopApprovals = deps.approvals.watch(() => {
        approvalsDirty = true;
        nudge();
      });
      const heartbeat = setInterval(() => {
        approvalsDirty = true;
        void stream.write(": ping\n\n").catch(() => undefined);
        nudge();
      }, HEARTBEAT_MS);
      stream.onAbort(() => {
        closed = true;
        nudge();
      });
      const sendApprovals = async (): Promise<void> => {
        approvalsDirty = false;
        const data = JSON.stringify(await deps.approvals.snapshot());
        if (data === lastApprovals) return;
        lastApprovals = data;
        await stream.writeSSE({ event: STREAM_APPROVALS, data });
      };
      try {
        await stream.writeSSE({
          event: STREAM_HELLO,
          data: JSON.stringify({ sid }),
          retry: RETRY_MS,
        });
        while (!closed) {
          if (approvalsDirty) await sendApprovals();
          for (const event of live.take())
            await stream.writeSSE({
              event: event.type,
              data: JSON.stringify(event),
            });
          if (live.idle() && !approvalsDirty && !closed) {
            await new Promise<void>((resolve) => {
              wake = resolve;
            });
            wake = null;
          }
        }
      } finally {
        sessions.delete(sid);
        clearInterval(heartbeat);
        stopApprovals();
        live.close();
        deps.track.closed();
      }
    })
  );

  app.post(`${APP_STREAM_PATH}/:sid`, async (c: Context) => {
    const sid = c.req.param("sid") ?? "";
    if (!sessions.has(sid)) throw new NotFoundError("stream is closed");
    const { watch, unwatch } = parseWatch(await c.req.json().catch(() => null));
    const known = await Promise.all(
      watch.map(([projectId]) => knownProject(deps.projects, projectId))
    );
    const session = sessions.get(sid);
    if (!session) throw new NotFoundError("stream is closed");
    for (const projectId of unwatch) session.unwatch(projectId);
    watch.forEach(([projectId, after], index) => {
      if (known[index]) session.watch(projectId, after);
    });
    return c.json({ ok: true });
  });
}

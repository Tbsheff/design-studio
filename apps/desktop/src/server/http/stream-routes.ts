import { randomBytes } from "node:crypto";

import { Effect, Option, Schema, Stream } from "effect";
import type { Fiber } from "effect";
import type { Context, Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { SSEStreamingApi } from "hono/streaming";

import {
  ACTION_DONE,
  MAX_WATCH,
  StreamWatchSchema,
} from "@design-studio/actions/app-stream";
import type {
  ActionDone,
  StreamWatch,
} from "@design-studio/actions/app-stream";
import {
  APP_STREAM_PATH,
  STREAM_APPROVALS,
  STREAM_HELLO,
} from "../../shared/app-stream.js";
import type { RecordedEvent } from "../events/index.js";
import { EventQueue } from "../events/index.js";
import type { StudioRuntime } from "../main/runtime.js";
import { BadRequestError, NotFoundError } from "../platform/errors/index.js";
import type { ProjectStore } from "../types.js";
import type { ApprovalFeed } from "./mcp-routes.js";

const HEARTBEAT_MS = 15_000;
const RETRY_MS = 1000;

interface StreamTracker {
  opened(): void;
  closed(): void;
}

interface StreamDeps {
  readonly approvals: ApprovalFeed;
  readonly projects: Pick<ProjectStore, "get">;
  readonly runtime: StudioRuntime;
  readonly track: StreamTracker;
}

interface Outgoing {
  readonly data: string;
  readonly type: string;
}

interface Session {
  readonly watch: (projectId: string, afterSeq: number) => void;
  readonly unwatch: (projectId: string) => void;
}

interface LiveSession {
  readonly close: () => void;
  readonly idle: () => boolean;
  readonly session: Session;
  readonly take: () => Outgoing[];
}

type Push = (item: Outgoing) => void;

type Follow = Fiber.Fiber<void>;

const decodeWatch = Schema.decodeUnknownOption(StreamWatchSchema);

const toOutgoing = (recorded: RecordedEvent): Outgoing => ({
  data: recorded.line,
  type: recorded.event.type,
});

const doneOutgoing = (done: ActionDone): Outgoing => ({
  data: JSON.stringify(done),
  type: ACTION_DONE,
});

const followProject = (
  projectId: string,
  afterSeq: number,
  push: Push
): Effect.Effect<void, never, EventQueue> =>
  Effect.gen(function* follow() {
    const bus = yield* EventQueue;

    yield* Stream.runForEach(bus.stream(projectId, afterSeq), (recorded) =>
      Effect.sync(() => push(toOutgoing(recorded)))
    );
  });

const followDone = (push: Push): Effect.Effect<void, never, EventQueue> =>
  Effect.gen(function* follow() {
    const bus = yield* EventQueue;

    yield* Stream.runForEach(bus.done(), (done) =>
      Effect.sync(() => push(doneOutgoing(done)))
    );
  });

const createSession = (
  runtime: StudioRuntime,
  wake: () => void
): LiveSession => {
  const queue: Outgoing[] = [];
  const fibers = new Map<string, Follow>();

  const push: Push = (item) => {
    queue.push(item);
    wake();
  };

  const stop = (projectId: string): void => {
    fibers.get(projectId)?.interruptUnsafe();
    fibers.delete(projectId);
  };

  const doneFiber = runtime.runFork(followDone(push));

  const current: Session = {
    unwatch: stop,
    watch: (projectId, afterSeq) => {
      stop(projectId);
      fibers.set(
        projectId,
        runtime.runFork(followProject(projectId, afterSeq, push))
      );
    },
  };

  const closeAll = (): void => {
    for (const projectId of fibers.keys()) {
      stop(projectId);
    }

    doneFiber.interruptUnsafe();
  };

  return {
    close: closeAll,
    idle: () => queue.length === 0,
    session: current,
    take: () => queue.splice(0),
  };
};

const parseWatch = (
  raw: StreamWatch | null
): { watch: [string, number][]; unwatch: string[] } => {
  if (raw === null) {
    throw new BadRequestError("the watch request is not valid");
  }

  const watch = Object.entries(raw.watch ?? {});
  const unwatch = [...(raw.unwatch ?? [])];

  if (watch.length + unwatch.length > MAX_WATCH) {
    throw new BadRequestError("too many projects in one request");
  }

  return { unwatch, watch };
};

const knownProject = async (
  projects: StreamDeps["projects"],
  projectId: string
): Promise<boolean> => {
  try {
    await projects.get(projectId);

    return true;
  } catch {
    return false;
  }
};

const watchKnown = (
  session: Session,
  watch: [string, number][],
  known: boolean[]
): void => {
  for (const [index, [projectId, after]] of watch.entries()) {
    if (known[index]) {
      session.watch(projectId, after);
    }
  }
};

const readWatch = async (c: Context): Promise<StreamWatch | null> => {
  try {
    return Option.getOrNull(decodeWatch(await c.req.json()));
  } catch {
    return Option.getOrNull(decodeWatch({}));
  }
};

interface Pump {
  approvalsDirty: boolean;
  closed: boolean;
  lastApprovals: string;
  wake: (() => void) | null;
}

const sendApprovals = async (
  stream: SSEStreamingApi,
  deps: StreamDeps,
  pump: Pump
): Promise<void> => {
  pump.approvalsDirty = false;
  const data = JSON.stringify(await deps.approvals.snapshot());

  if (data === pump.lastApprovals) {
    return;
  }

  pump.lastApprovals = data;
  await stream.writeSSE({ data, event: STREAM_APPROVALS });
};

const waitForWork = async (pump: Pump, live: LiveSession): Promise<void> => {
  if (!live.idle() || pump.approvalsDirty || pump.closed) {
    return;
  }

  await new Promise<void>((resolve) => {
    pump.wake = resolve;
  });
  pump.wake = null;
};

const runPump = async (
  stream: SSEStreamingApi,
  deps: StreamDeps,
  pump: Pump,
  live: LiveSession
): Promise<void> => {
  while (!pump.closed) {
    if (pump.approvalsDirty) {
      await sendApprovals(stream, deps, pump);
    }

    for (const item of live.take()) {
      await stream.writeSSE({ data: item.data, event: item.type });
    }

    await waitForWork(pump, live);
  }
};

const openStream = async (
  stream: SSEStreamingApi,
  deps: StreamDeps,
  sessions: Map<string, Session>
): Promise<void> => {
  const sid = randomBytes(12).toString("base64url");
  const pump: Pump = {
    approvalsDirty: true,
    closed: false,
    lastApprovals: "",
    wake: null,
  };
  const nudge = (): void => pump.wake?.();
  const live = createSession(deps.runtime, nudge);

  sessions.set(sid, live.session);
  deps.track.opened();

  const stopApprovals = deps.approvals.watch(() => {
    pump.approvalsDirty = true;
    nudge();
  });

  const heartbeat = setInterval(() => {
    pump.approvalsDirty = true;
    void stream.write(": ping\n\n").catch(() => null);
    nudge();
  }, HEARTBEAT_MS);

  stream.onAbort(() => {
    pump.closed = true;
    nudge();
  });

  try {
    await stream.writeSSE({
      data: JSON.stringify({ sid }),
      event: STREAM_HELLO,
      retry: RETRY_MS,
    });
    await runPump(stream, deps, pump, live);
  } finally {
    sessions.delete(sid);
    clearInterval(heartbeat);
    stopApprovals();
    live.close();
    deps.track.closed();
  }
};

const registerStreamRoutes = (app: Hono, deps: StreamDeps): void => {
  const sessions = new Map<string, Session>();

  app.get(APP_STREAM_PATH, (c) =>
    streamSSE(c, (stream) => openStream(stream, deps, sessions))
  );

  app.post(`${APP_STREAM_PATH}/:sid`, async (c: Context) => {
    const sid = c.req.param("sid") ?? "";

    if (!sessions.has(sid)) {
      throw new NotFoundError("stream is closed");
    }

    const { watch, unwatch } = parseWatch(await readWatch(c));
    const known = await Promise.all(
      watch.map(([projectId]) => knownProject(deps.projects, projectId))
    );
    const session = sessions.get(sid);

    if (!session) {
      throw new NotFoundError("stream is closed");
    }

    for (const projectId of unwatch) {
      session.unwatch(projectId);
    }

    watchKnown(session, watch, known);

    return c.json({ ok: true });
  });
};

export { registerStreamRoutes };

export type { StreamTracker };

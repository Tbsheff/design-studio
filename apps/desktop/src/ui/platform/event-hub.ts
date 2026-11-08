import type { StudioEvent, StudioEventBody } from "@design-studio/contracts";

import { isStudioEvent } from "./json-guard";

const EVERY_EVENT_TYPE: Record<StudioEventBody["type"], true> = {
  "app.status": true,
  "canvas.changed": true,
  "canvas.point": true,
  "comments.changed": true,
  "design-system.sources": true,
  "direction.updated": true,
  "edit-history.changed": true,
  "edit.planned": true,
  "edit.unplanned": true,
  "files.changed": true,
  "frame-states.changed": true,
  "layer-locks.changed": true,
  "links.changed": true,
  "mcp.activity": true,
  "mcp.approval": true,
  "mcp.approval.resolved": true,
  "mcp.point": true,
  "preview.build-error": true,
  "run.finished": true,
  "run.permission": true,
  "run.permission.resolved": true,
  "run.queue": true,
  "run.retry": true,
  "run.started": true,
  "run.stopping": true,
  "run.text": true,
  "run.text.delta": true,
  "run.thinking": true,
  "run.thinking.delta": true,
  "run.todos": true,
  "run.tool.finished": true,
  "run.tool.started": true,
  "run.usage": true,
  "run.user": true,
  "status.changed": true,
  "version.created": true,
  "versions.changed": true,
};

const EVENT_TYPES = Object.keys(EVERY_EVENT_TYPE) as StudioEventBody["type"][];

const RETRY_INITIAL_MS = 500;
const RETRY_MAX_MS = 8000;
const RETRY_FACTOR = 2;

type ConnectionState = "connecting" | "open" | "reconnecting";

interface EventSourceLike {
  readonly addEventListener: (type: string, listener: EventListener) => void;
  readonly close: () => void;
}

interface HubDeps {
  open: (projectId: string, afterSeq: number) => EventSourceLike;
  setTimer: (fn: () => void, ms: number) => number;
  clearTimer: (id: number | null) => void;
  defer: (fn: () => void) => void;
}

type Listener = (event: StudioEvent) => void;

interface Channel {
  listeners: Set<Listener>;
  stateListeners: Set<() => void>;
  state: ConnectionState;
  lastSeq: number;
  source: EventSourceLike | null;
  retryTimer: number | null;
  retryDelay: number;
  closing: boolean;
}

interface EventHub {
  readonly subscribe: (projectId: string, listener: Listener) => () => void;
  readonly watchState: (projectId: string, onChange: () => void) => () => void;
  readonly state: (projectId: string) => ConnectionState;
  readonly openCount: () => number;
}

interface HubScope {
  readonly channels: Map<string, Channel>;
  readonly deps: HubDeps;
}

const setState = (channel: Channel, state: ConnectionState): void => {
  if (channel.state === state) {
    return;
  }

  channel.state = state;

  for (const fn of new Set(channel.stateListeners)) {
    fn();
  }
};

const toStudioEvent = (data: string): StudioEvent | null => {
  try {
    const parsed = JSON.parse(data);

    if (isStudioEvent(parsed)) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
};

const receive = (channel: Channel, msg: MessageEvent<string>): void => {
  const event = toStudioEvent(msg.data);

  if (!event || event.seq <= channel.lastSeq) {
    return;
  }

  channel.lastSeq = event.seq;

  for (const listener of new Set(channel.listeners)) {
    try {
      listener(event);
    } catch (error) {
      globalThis.reportError(error);
    }
  }
};

const connect = (
  scope: HubScope,
  projectId: string,
  channel: Channel
): void => {
  if (scope.channels.get(projectId) !== channel) {
    return;
  }

  const source = scope.deps.open(projectId, channel.lastSeq);

  channel.source = source;

  const onMessage = (msg: Event): void =>
    receive(channel, msg as MessageEvent<string>);

  source.addEventListener("open", () => {
    channel.retryDelay = RETRY_INITIAL_MS;
    setState(channel, "open");
  });
  source.addEventListener("message", onMessage);

  for (const type of EVENT_TYPES) {
    source.addEventListener(type, onMessage);
  }

  source.addEventListener("error", () => {
    source.close();

    if (scope.channels.get(projectId) !== channel) {
      return;
    }

    setState(channel, "reconnecting");
    scope.deps.clearTimer(channel.retryTimer);
    channel.retryTimer = scope.deps.setTimer(
      () => connect(scope, projectId, channel),
      channel.retryDelay
    );
    channel.retryDelay = Math.min(
      channel.retryDelay * RETRY_FACTOR,
      RETRY_MAX_MS
    );
  });
};

const channelFor = (scope: HubScope, projectId: string): Channel => {
  const existing = scope.channels.get(projectId);

  if (existing) {
    existing.closing = false;

    return existing;
  }

  const channel: Channel = {
    closing: false,
    lastSeq: 0,
    listeners: new Set(),
    retryDelay: RETRY_INITIAL_MS,
    retryTimer: null,
    source: null,
    state: "connecting",
    stateListeners: new Set(),
  };

  scope.channels.set(projectId, channel);
  connect(scope, projectId, channel);

  return channel;
};

const isChannelIdle = (channel: Channel): boolean =>
  channel.listeners.size === 0 && channel.stateListeners.size === 0;

const release = (
  scope: HubScope,
  projectId: string,
  channel: Channel
): void => {
  if (!isChannelIdle(channel) || channel.closing) {
    return;
  }

  channel.closing = true;
  scope.deps.defer(() => {
    if (
      !channel.closing ||
      scope.channels.get(projectId) !== channel ||
      !isChannelIdle(channel)
    ) {
      return;
    }

    scope.channels.delete(projectId);
    scope.deps.clearTimer(channel.retryTimer);
    channel.source?.close();
    channel.source = null;
  });
};

const createEventHub = (deps: HubDeps): EventHub => {
  const scope: HubScope = { channels: new Map(), deps };

  return {
    openCount() {
      return scope.channels.size;
    },
    state(projectId) {
      return scope.channels.get(projectId)?.state ?? "connecting";
    },
    subscribe(projectId, listener) {
      const channel = channelFor(scope, projectId);

      channel.listeners.add(listener);

      return () => {
        channel.listeners.delete(listener);
        release(scope, projectId, channel);
      };
    },
    watchState(projectId, onChange) {
      const channel = channelFor(scope, projectId);

      channel.stateListeners.add(onChange);

      return () => {
        channel.stateListeners.delete(onChange);
        release(scope, projectId, channel);
      };
    },
  };
};

export { EVENT_TYPES, createEventHub };

export type { ConnectionState, EventSourceLike, HubDeps, EventHub };

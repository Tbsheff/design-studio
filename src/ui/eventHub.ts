import type { StudioEvent, StudioEventBody } from '../shared/contracts';

const EVERY_EVENT_TYPE: Record<StudioEventBody['type'], true> = {
  'run.started': true,
  'run.text.delta': true,
  'run.text': true,
  'run.thinking.delta': true,
  'run.thinking': true,
  'run.tool.started': true,
  'run.tool.finished': true,
  'run.user': true,
  'run.queue': true,
  'run.stopping': true,
  'run.permission': true,
  'run.permission.resolved': true,
  'run.todos': true,
  'run.usage': true,
  'run.retry': true,
  'run.finished': true,
  'files.changed': true,
  'version.created': true,
  'direction.updated': true,
  'status.changed': true,
  'preview.build-error': true,
  'comments.changed': true,
  'edit-history.changed': true,
};

export const EVENT_TYPES = Object.keys(EVERY_EVENT_TYPE) as StudioEventBody['type'][];

export type ConnectionState = 'connecting' | 'open' | 'reconnecting';

export interface EventSourceLike {
  onopen: ((this: EventSource, ev: Event) => unknown) | null;
  onmessage: ((this: EventSource, ev: MessageEvent) => unknown) | null;
  onerror: ((this: EventSource, ev: Event) => unknown) | null;
  addEventListener(type: string, listener: EventListener): void;
  close(): void;
}

export interface HubDeps {
  open: (projectId: string, afterSeq: number) => EventSourceLike;
  setTimer: (fn: () => void, ms: number) => number;
  clearTimer: (id: number | undefined) => void;
  defer: (fn: () => void) => void;
}

type Listener = (event: StudioEvent) => void;

interface Channel {
  listeners: Set<Listener>;
  stateListeners: Set<() => void>;
  state: ConnectionState;
  lastSeq: number;
  source: EventSourceLike | null;
  retryTimer: number | undefined;
  retryDelay: number;
  closing: boolean;
}

export interface EventHub {
  subscribe(projectId: string, listener: Listener): () => void;
  watchState(projectId: string, onChange: () => void): () => void;
  state(projectId: string): ConnectionState;
  openCount(): number;
}

export function createEventHub(deps: HubDeps): EventHub {
  const channels = new Map<string, Channel>();

  const setState = (channel: Channel, state: ConnectionState) => {
    if (channel.state === state) return;
    channel.state = state;
    for (const fn of [...channel.stateListeners]) fn();
  };

  const receive = (channel: Channel, msg: MessageEvent<string>) => {
    let event: StudioEvent;
    try {
      event = JSON.parse(msg.data) as StudioEvent;
    } catch {
      return;
    }
    if (typeof event.seq !== 'number' || event.seq <= channel.lastSeq) return;
    channel.lastSeq = event.seq;
    for (const listener of [...channel.listeners]) {
      try {
        listener(event);
      } catch (error) {
        console.error('[events] listener failed', error);
      }
    }
  };

  const connect = (projectId: string, channel: Channel) => {
    if (channels.get(projectId) !== channel) return;
    const es = deps.open(projectId, channel.lastSeq);
    channel.source = es;
    const onMessage = (msg: Event) => receive(channel, msg as MessageEvent<string>);
    es.onopen = () => {
      channel.retryDelay = 500;
      setState(channel, 'open');
    };
    es.onmessage = onMessage;
    for (const type of EVENT_TYPES) es.addEventListener(type, onMessage);
    es.onerror = () => {
      es.close();
      if (channels.get(projectId) !== channel) return;
      setState(channel, 'reconnecting');
      deps.clearTimer(channel.retryTimer);
      channel.retryTimer = deps.setTimer(() => connect(projectId, channel), channel.retryDelay);
      channel.retryDelay = Math.min(channel.retryDelay * 2, 8000);
    };
  };

  const channelFor = (projectId: string): Channel => {
    const existing = channels.get(projectId);
    if (existing) {
      existing.closing = false;
      return existing;
    }
    const channel: Channel = {
      listeners: new Set(),
      stateListeners: new Set(),
      state: 'connecting',
      lastSeq: 0,
      source: null,
      retryTimer: undefined,
      retryDelay: 500,
      closing: false,
    };
    channels.set(projectId, channel);
    connect(projectId, channel);
    return channel;
  };

  const release = (projectId: string, channel: Channel) => {
    if (channel.listeners.size > 0 || channel.stateListeners.size > 0 || channel.closing) return;
    channel.closing = true;
    deps.defer(() => {
      if (!channel.closing || channels.get(projectId) !== channel) return;
      if (channel.listeners.size > 0 || channel.stateListeners.size > 0) return;
      channels.delete(projectId);
      deps.clearTimer(channel.retryTimer);
      channel.source?.close();
      channel.source = null;
    });
  };

  return {
    subscribe(projectId, listener) {
      const channel = channelFor(projectId);
      channel.listeners.add(listener);
      return () => {
        channel.listeners.delete(listener);
        release(projectId, channel);
      };
    },
    watchState(projectId, onChange) {
      const channel = channelFor(projectId);
      channel.stateListeners.add(onChange);
      return () => {
        channel.stateListeners.delete(onChange);
        release(projectId, channel);
      };
    },
    state(projectId) {
      return channels.get(projectId)?.state ?? 'connecting';
    },
    openCount() {
      return channels.size;
    },
  };
}

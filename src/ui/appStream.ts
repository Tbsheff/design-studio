import {
  APP_STREAM_PATH,
  STREAM_APPROVALS,
  STREAM_HELLO,
  type StreamHello,
  type StreamWatchRequest,
} from "../shared/app-stream";
import type { McpApprovalPoll } from "../shared/export";
import { json } from "./api";
import {
  EVENT_TYPES,
  type ConnectionState,
  type EventSourceLike,
} from "./eventHub";
import { getSession } from "./session";

type Wants = Record<string, number>;

type Wire =
  | { t: "want"; tab: string; wants: Wants }
  | { t: "bye"; tab: string }
  | { t: "hello" }
  | { t: "ev"; type: string; pid: string; seq: number; data: string }
  | { t: "state"; state: ConnectionState }
  | { t: "approvals"; poll: McpApprovalPoll };

const CHANNEL = "design-studio-stream";
const LEADER_LOCK = "design-studio-stream-leader";
const TAB_LOCK = "design-studio-tab-";
const REOPEN_MS = 2000;
const GAP_MS = 2000;
const GAP_MAX = 2000;

class VirtualSource implements EventSourceLike {
  onopen: EventSourceLike["onopen"] = null;
  onmessage: EventSourceLike["onmessage"] = null;
  onerror: EventSourceLike["onerror"] = null;
  opened = false;
  closed = false;
  private readonly typed = new Map<string, Set<EventListener>>();
  private readonly held = new Map<number, { type: string; data: string }>();
  private gapTimer: number | undefined;

  constructor(
    readonly projectId: string,
    public delivered: number,
    private readonly onClose: (source: VirtualSource) => void
  ) {}

  addEventListener(type: string, listener: EventListener): void {
    const set = this.typed.get(type) ?? new Set<EventListener>();
    set.add(listener);
    this.typed.set(type, set);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    window.clearTimeout(this.gapTimer);
    this.held.clear();
    this.onClose(this);
  }

  open(): void {
    if (this.closed || this.opened) return;
    this.opened = true;
    this.onopen?.call(this as unknown as EventSource, new Event("open"));
  }

  fail(): void {
    if (this.closed) return;
    this.onerror?.call(this as unknown as EventSource, new Event("error"));
  }

  deliver(type: string, seq: number, data: string): void {
    if (this.closed || seq <= this.delivered) return;
    if (seq > this.delivered + 1) return this.hold(type, seq, data);
    this.emit(type, seq, data);
    this.drain();
  }

  private hold(type: string, seq: number, data: string): void {
    this.held.set(seq, { type, data });
    if (this.held.size >= GAP_MAX) return this.release();
    this.gapTimer ??= window.setTimeout(() => this.release(), GAP_MS);
  }

  private drain(): void {
    for (
      let next = this.held.get(this.delivered + 1);
      next;
      next = this.held.get(this.delivered + 1)
    ) {
      this.held.delete(this.delivered + 1);
      this.emit(next.type, this.delivered + 1, next.data);
    }
    if (this.held.size > 0) return;
    window.clearTimeout(this.gapTimer);
    this.gapTimer = undefined;
  }

  private release(): void {
    window.clearTimeout(this.gapTimer);
    this.gapTimer = undefined;
    const waiting = [...this.held.entries()].sort(([a], [b]) => a - b);
    this.held.clear();
    for (const [seq, item] of waiting)
      if (seq > this.delivered) this.emit(item.type, seq, item.data);
  }

  private emit(type: string, seq: number, data: string): void {
    if (this.closed) return;
    this.delivered = seq;
    const msg = new MessageEvent(type, { data });
    const listeners = this.typed.get(type);
    if (listeners) for (const listener of [...listeners]) listener(msg);
    else this.onmessage?.call(this as unknown as EventSource, msg);
  }
}

function eventHead(
  data: string
): { pid: string; seq: number; type: string } | null {
  try {
    const event = JSON.parse(data) as {
      projectId?: unknown;
      seq?: unknown;
      type?: unknown;
    };
    if (
      typeof event.projectId !== "string" ||
      typeof event.seq !== "number" ||
      typeof event.type !== "string"
    )
      return null;
    return { pid: event.projectId, seq: event.seq, type: event.type };
  } catch {
    return null;
  }
}

class Tab {
  readonly id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  readonly sources = new Set<VirtualSource>();
  state: ConnectionState = "connecting";
  approvals: McpApprovalPoll | null = null;
  readonly approvalListeners = new Set<(poll: McpApprovalPoll) => void>();
  private announcing = false;

  constructor(private readonly announce: (wants: Wants) => void) {}

  source(projectId: string, after: number): VirtualSource {
    const source = new VirtualSource(projectId, after, (closed) => {
      this.sources.delete(closed);
      this.changed();
    });
    this.sources.add(source);
    this.changed();
    if (this.state === "open") queueMicrotask(() => source.open());
    return source;
  }

  wants(): Wants {
    const out: Wants = {};
    for (const source of this.sources)
      out[source.projectId] = Math.min(
        out[source.projectId] ?? Number.MAX_SAFE_INTEGER,
        source.delivered
      );
    return out;
  }

  changed(): void {
    if (this.announcing) return;
    this.announcing = true;
    queueMicrotask(() => {
      this.announcing = false;
      this.announce(this.wants());
    });
  }

  deliver(type: string, pid: string, seq: number, data: string): void {
    for (const source of [...this.sources])
      if (source.projectId === pid) source.deliver(type, seq, data);
  }

  setState(state: ConnectionState): void {
    if (this.state === state) return;
    this.state = state;
    for (const source of [...this.sources]) {
      if (state === "open") source.open();
      else if (state === "reconnecting") source.fail();
    }
  }

  setApprovals(poll: McpApprovalPoll): void {
    this.approvals = poll;
    for (const listener of [...this.approvalListeners]) listener(poll);
  }
}

class Leader {
  private es: EventSource | null = null;
  private sid: string | null = null;
  private readonly watched = new Map<string, number>();
  private readonly tabs = new Map<string, Wants>();
  private pendingWatch: Wants = {};
  private pendingUnwatch = new Set<string>();
  private flushing = false;

  constructor(
    private readonly tab: Tab,
    private readonly channel: BroadcastChannel | null
  ) {}

  start(): void {
    this.post({ t: "hello" });
    this.update(this.tab.id, this.tab.wants());
    this.open();
  }

  update(tab: string, wants: Wants): void {
    const prev = this.tabs.get(tab);
    this.tabs.set(tab, wants);
    if (!prev && tab !== this.tab.id) this.replayStatus();
    if (!this.sid) return;
    for (const [pid, after] of Object.entries(wants)) {
      const pos = this.watched.get(pid);
      const fresh = prev?.[pid] === undefined || after < (prev[pid] ?? 0);
      if (pos === undefined || (fresh && after < pos))
        this.queueWatch(pid, after);
    }
    this.collectUnused();
    this.scheduleFlush();
  }

  drop(tab: string): void {
    if (!this.tabs.delete(tab)) return;
    this.collectUnused();
    this.scheduleFlush();
  }

  private replayStatus(): void {
    this.post({ t: "state", state: this.tab.state });
    if (this.tab.approvals)
      this.post({ t: "approvals", poll: this.tab.approvals });
  }

  private post(message: Wire): void {
    this.channel?.postMessage(message);
  }

  private open(): void {
    const url = `${APP_STREAM_PATH}?token=${encodeURIComponent(getSession().token)}`;
    const es = new EventSource(url);
    this.es = es;
    es.addEventListener(STREAM_HELLO, (msg) =>
      this.hello(JSON.parse((msg as MessageEvent<string>).data) as StreamHello)
    );
    es.addEventListener(STREAM_APPROVALS, (msg) =>
      this.approvals(
        JSON.parse((msg as MessageEvent<string>).data) as McpApprovalPoll
      )
    );
    const onEvent = (msg: Event) =>
      this.event((msg as MessageEvent<string>).data);
    for (const type of EVENT_TYPES) es.addEventListener(type, onEvent);
    es.onerror = () => this.lost(es);
  }

  private lost(es: EventSource): void {
    this.sid = null;
    this.setState("reconnecting");
    if (es.readyState !== EventSource.CLOSED) return;
    es.close();
    window.setTimeout(() => {
      if (this.es === es) this.open();
    }, REOPEN_MS);
  }

  private hello(hello: StreamHello): void {
    const seen = new Map(this.watched);
    this.sid = hello.sid;
    this.watched.clear();
    this.pendingUnwatch.clear();
    this.pendingWatch = {};
    for (const wants of this.tabs.values())
      for (const [pid, after] of Object.entries(wants))
        this.queueWatch(pid, seen.get(pid) ?? after);
    this.scheduleFlush();
    this.setState("open");
    this.post({ t: "hello" });
    void this.pruneDeadTabs();
  }

  private setState(state: ConnectionState): void {
    this.tab.setState(state);
    this.post({ t: "state", state });
  }

  private approvals(poll: McpApprovalPoll): void {
    this.tab.setApprovals(poll);
    this.post({ t: "approvals", poll });
  }

  private event(data: string): void {
    const head = eventHead(data);
    if (!head) return;
    if (head.seq > (this.watched.get(head.pid) ?? 0))
      this.watched.set(head.pid, head.seq);
    this.tab.deliver(head.type, head.pid, head.seq, data);
    this.post({ t: "ev", type: head.type, pid: head.pid, seq: head.seq, data });
  }

  private queueWatch(pid: string, after: number): void {
    this.pendingWatch[pid] = Math.min(
      this.pendingWatch[pid] ?? Number.MAX_SAFE_INTEGER,
      after
    );
    this.pendingUnwatch.delete(pid);
    if (!this.watched.has(pid)) this.watched.set(pid, after);
  }

  private collectUnused(): void {
    const wanted = new Set<string>();
    for (const wants of this.tabs.values())
      for (const pid of Object.keys(wants)) wanted.add(pid);
    for (const pid of this.watched.keys()) {
      if (wanted.has(pid)) continue;
      this.watched.delete(pid);
      this.pendingUnwatch.add(pid);
    }
  }

  private scheduleFlush(): void {
    if (this.flushing) return;
    this.flushing = true;
    queueMicrotask(() => {
      this.flushing = false;
      this.flush();
    });
  }

  private flush(): void {
    const sid = this.sid;
    const watch = this.pendingWatch;
    const unwatch = [...this.pendingUnwatch];
    if (!sid || (Object.keys(watch).length === 0 && unwatch.length === 0))
      return;
    this.pendingWatch = {};
    this.pendingUnwatch.clear();
    const body: StreamWatchRequest = { watch, unwatch };
    json("POST", `${APP_STREAM_PATH}/${encodeURIComponent(sid)}`, body).catch(
      (error: unknown) => console.warn("[stream] watch failed", error)
    );
  }

  private async pruneDeadTabs(): Promise<void> {
    if (!this.channel || !navigator.locks) return;
    const state = await navigator.locks.query();
    const live = new Set(
      (state.held ?? [])
        .map((lock) => lock.name)
        .filter((name): name is string => Boolean(name?.startsWith(TAB_LOCK)))
    );
    for (const tab of [...this.tabs.keys()])
      if (tab !== this.tab.id && !live.has(TAB_LOCK + tab)) this.drop(tab);
  }
}

interface AppStream {
  source(projectId: string, after: number): EventSourceLike;
  onApprovals(listener: (poll: McpApprovalPoll) => void): () => void;
}

function follow(tab: Tab, message: Wire, leader: Leader | null): void {
  switch (message.t) {
    case "ev": {
      if (!leader)
        tab.deliver(message.type, message.pid, message.seq, message.data);
      return;
    }
    case "state": {
      if (!leader) tab.setState(message.state);
      return;
    }
    case "approvals": {
      if (!leader) tab.setApprovals(message.poll);
      return;
    }
    case "hello": {
      if (!leader) tab.changed();
      return;
    }
    case "want": {
      leader?.update(message.tab, message.wants);
      return;
    }
    case "bye": {
      leader?.drop(message.tab);
    }
  }
}

function startStream(): AppStream {
  const shared =
    typeof BroadcastChannel !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.locks);
  const channel = shared ? new BroadcastChannel(CHANNEL) : null;
  let leader: Leader | null = null;
  const tab = new Tab((wants) => {
    if (leader) leader.update(tab.id, wants);
    else channel?.postMessage({ t: "want", tab: tab.id, wants } satisfies Wire);
  });
  const lead = () => {
    leader = new Leader(tab, channel);
    leader.start();
  };
  if (channel) {
    channel.onmessage = (msg: MessageEvent<Wire>) =>
      follow(tab, msg.data, leader);
    void navigator.locks.request(
      TAB_LOCK + tab.id,
      () => new Promise<void>(() => undefined)
    );
    void navigator.locks.request(LEADER_LOCK, () => {
      lead();
      return new Promise<void>(() => undefined);
    });
    window.addEventListener("pagehide", () => {
      if (leader)
        channel.postMessage({
          t: "state",
          state: "reconnecting",
        } satisfies Wire);
      else channel.postMessage({ t: "bye", tab: tab.id } satisfies Wire);
    });
    tab.changed();
  } else {
    lead();
  }
  return {
    source: (projectId, after) => tab.source(projectId, after),
    onApprovals(listener) {
      tab.approvalListeners.add(listener);
      if (tab.approvals) listener(tab.approvals);
      return () => {
        tab.approvalListeners.delete(listener);
      };
    },
  };
}

let stream: AppStream | null = null;

export function appStream(): AppStream {
  stream ??= startStream();
  return stream;
}

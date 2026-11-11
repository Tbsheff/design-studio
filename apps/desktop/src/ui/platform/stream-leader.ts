import type { McpApprovalPoll } from "@design-studio/contracts/export";

import {
  APP_STREAM_PATH,
  STREAM_APPROVALS,
  STREAM_HELLO,
} from "../../shared/app-stream";
import type { StreamHello, StreamWatchRequest } from "../../shared/app-stream";
import { EVENT_TYPES } from "./event-hub";
import type { ConnectionState } from "./event-hub";
import { isApprovalPoll, isStreamHello, isStudioEvent } from "./json-guard";
import { getSession } from "./session";
import type { StreamTab } from "./stream-tab";
import { ACTION_DONE_EVENT, REOPEN_MS, TAB_LOCK } from "./stream-types";
import type { Wants, Wire } from "./stream-types";

interface EventHead {
  readonly pid: string;
  readonly seq: number;
  readonly type: string;
}

interface LeaderOptions {
  readonly tab: StreamTab;
  readonly channel: BroadcastChannel | null;
  readonly sendWatch: (
    sessionId: string,
    body: StreamWatchRequest
  ) => Promise<void>;
}

const toEventHead = (data: string): EventHead | null => {
  try {
    const event: unknown = JSON.parse(data);

    if (!isStudioEvent(event)) {
      return null;
    }

    return { pid: event.projectId, seq: event.seq, type: event.type };
  } catch {
    return null;
  }
};

const toMessageText = (message: Event): string =>
  (message as MessageEvent<string>).data;

class StreamLeader {
  private source: EventSource | null = null;
  private sessionId: string | null = null;
  private readonly watched = new Map<string, number>();
  private readonly tabs = new Map<string, Wants>();
  private pendingWatch: Wants = {};
  private readonly pendingUnwatch = new Set<string>();
  private isFlushing = false;
  private readonly tab: StreamTab;
  private readonly channel: BroadcastChannel | null;

  private readonly sendWatch: LeaderOptions["sendWatch"];

  public constructor(options: LeaderOptions) {
    this.tab = options.tab;
    this.channel = options.channel;
    this.sendWatch = options.sendWatch;
  }

  public start(): void {
    this.post({ kind: "hello" });
    this.update(this.tab.id, this.tab.wants());
    this.open();
  }

  public update(tabId: string, wants: Wants): void {
    const previous = this.tabs.get(tabId);
    this.tabs.set(tabId, wants);

    if (!previous && tabId !== this.tab.id) {
      this.replayStatus();
    }

    if (!this.sessionId) {
      return;
    }

    for (const [pid, after] of Object.entries(wants)) {
      const position = this.watched.get(pid) ?? Number.POSITIVE_INFINITY;
      const previousAfter = previous?.[pid] ?? Number.POSITIVE_INFINITY;
      const isFresh = after < previousAfter;

      if (!this.watched.has(pid) || (isFresh && after < position)) {
        this.queueWatch(pid, after);
      }
    }

    this.collectUnused();
    this.scheduleFlush();
  }

  public drop(tabId: string): void {
    if (!this.tabs.delete(tabId)) {
      return;
    }

    this.collectUnused();
    this.scheduleFlush();
  }

  private replayStatus(): void {
    this.post({ kind: "state", state: this.tab.state });

    if (this.tab.approvals) {
      this.post({ kind: "approvals", poll: this.tab.approvals });
    }
  }

  private post(message: Wire): void {
    this.channel?.postMessage(message);
  }

  private open(): void {
    const url = `${APP_STREAM_PATH}?token=${encodeURIComponent(getSession().token)}`;
    const source = new EventSource(url);
    this.source = source;
    source.addEventListener(STREAM_HELLO, (message) => {
      this.helloText(toMessageText(message));
    });
    source.addEventListener(STREAM_APPROVALS, (message) => {
      this.approvalsText(toMessageText(message));
    });
    source.addEventListener(ACTION_DONE_EVENT, (message) => {
      this.done(toMessageText(message));
    });

    const onEvent = (message: Event): void => {
      this.event(toMessageText(message));
    };

    for (const type of EVENT_TYPES) {
      source.addEventListener(type, onEvent);
    }

    source.addEventListener("error", () => {
      this.lost(source);
    });
  }

  private lost(source: EventSource): void {
    this.sessionId = null;
    this.setState("reconnecting");

    if (source.readyState !== EventSource.CLOSED) {
      return;
    }

    source.close();
    globalThis.setTimeout(() => {
      if (this.source === source) {
        this.open();
      }
    }, REOPEN_MS);
  }

  private helloText(data: string): void {
    const hello = JSON.parse(data);

    if (isStreamHello(hello)) {
      this.hello(hello);
    }
  }

  private approvalsText(data: string): void {
    const poll = JSON.parse(data);

    if (isApprovalPoll(poll)) {
      this.approvals(poll);
    }
  }

  private hello(hello: StreamHello): void {
    const seen = new Map(this.watched);
    this.sessionId = hello.sid;
    this.watched.clear();
    this.pendingUnwatch.clear();
    this.pendingWatch = {};

    for (const wants of this.tabs.values()) {
      for (const [pid, after] of Object.entries(wants)) {
        this.queueWatch(pid, seen.get(pid) ?? after);
      }
    }

    this.scheduleFlush();
    this.setState("open");
    this.post({ kind: "hello" });
    void this.pruneDeadTabs();
  }

  private setState(state: ConnectionState): void {
    this.tab.setState(state);
    this.post({ kind: "state", state });
  }

  private done(data: string): void {
    this.tab.done(data);
    this.post({ data, kind: "done" });
  }

  private approvals(poll: McpApprovalPoll): void {
    this.tab.setApprovals(poll);
    this.post({ kind: "approvals", poll });
  }

  private event(data: string): void {
    const head = toEventHead(data);

    if (!head) {
      return;
    }

    if (head.seq > (this.watched.get(head.pid) ?? 0)) {
      this.watched.set(head.pid, head.seq);
    }

    this.tab.deliver(head.type, head.pid, head.seq, data);
    this.post({
      data,
      kind: "ev",
      pid: head.pid,
      seq: head.seq,
      type: head.type,
    });
  }

  private queueWatch(pid: string, after: number): void {
    this.pendingWatch[pid] = Math.min(
      this.pendingWatch[pid] ?? Number.MAX_SAFE_INTEGER,
      after
    );
    this.pendingUnwatch.delete(pid);

    if (!this.watched.has(pid)) {
      this.watched.set(pid, after);
    }
  }

  private collectUnused(): void {
    const wanted = new Set<string>();

    for (const wants of this.tabs.values()) {
      for (const pid of Object.keys(wants)) {
        wanted.add(pid);
      }
    }

    for (const pid of this.watched.keys()) {
      if (!wanted.has(pid)) {
        this.watched.delete(pid);
        this.pendingUnwatch.add(pid);
      }
    }
  }

  private scheduleFlush(): void {
    if (this.isFlushing) {
      return;
    }

    this.isFlushing = true;
    queueMicrotask(() => {
      this.isFlushing = false;
      void this.flush();
    });
  }

  private async flush(): Promise<void> {
    const { sessionId } = this;
    const watch = this.pendingWatch;
    const unwatch = [...this.pendingUnwatch];

    if (
      !sessionId ||
      (Object.keys(watch).length === 0 && unwatch.length === 0)
    ) {
      return;
    }

    this.pendingWatch = {};
    this.pendingUnwatch.clear();
    const body: StreamWatchRequest = { unwatch, watch };

    try {
      await this.sendWatch(sessionId, body);
    } catch (error) {
      globalThis.console.warn("[stream] watch failed", error);
    }
  }

  private async pruneDeadTabs(): Promise<void> {
    if (!this.channel || !navigator.locks) {
      return;
    }

    const state = await navigator.locks.query();

    const live = new Set(
      (state.held ?? [])
        .map((lock) => lock.name)
        .filter((name): name is string => Boolean(name?.startsWith(TAB_LOCK)))
    );

    for (const tabId of this.tabs.keys()) {
      if (tabId !== this.tab.id && !live.has(TAB_LOCK + tabId)) {
        this.drop(tabId);
      }
    }
  }
}

export { StreamLeader };

export type { LeaderOptions };

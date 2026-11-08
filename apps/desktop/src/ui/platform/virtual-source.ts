import type { EventSourceLike } from "./event-hub";
import { GAP_MAX, GAP_MS } from "./stream-types";

class VirtualSource implements EventSourceLike {
  public onopen: EventSourceLike["onopen"] = null;
  public onmessage: EventSourceLike["onmessage"] = null;
  public onerror: EventSourceLike["onerror"] = null;
  public opened = false;
  public closed = false;
  public readonly projectId: string;
  public delivered: number;
  private readonly onClose: (source: VirtualSource) => void;
  private readonly typed = new Map<string, Set<EventListener>>();
  private readonly held = new Map<number, { type: string; data: string }>();
  private gapTimer: ReturnType<typeof setTimeout> | null = null;

  public constructor(
    projectId: string,
    delivered: number,
    onClose: (source: VirtualSource) => void
  ) {
    this.projectId = projectId;
    this.delivered = delivered;
    this.onClose = onClose;
  }

  public addEventListener(type: string, listener: EventListener): void {
    const listeners = this.typed.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.typed.set(type, listeners);
  }

  public close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.clearGapTimer();
    this.held.clear();
    this.onClose(this);
  }

  public open(): void {
    if (this.closed || this.opened) {
      return;
    }

    this.opened = true;
    this.onopen?.(new Event("open"));
  }

  public fail(): void {
    if (this.closed) {
      return;
    }

    this.onerror?.(new Event("error"));
  }

  public deliver(type: string, seq: number, data: string): void {
    if (this.closed || seq <= this.delivered) {
      return;
    }

    if (seq > this.delivered + 1) {
      this.hold(type, seq, data);

      return;
    }

    this.emit(type, seq, data);
    this.drain();
  }

  private clearGapTimer(): void {
    if (this.gapTimer !== null) {
      globalThis.clearTimeout(this.gapTimer);
    }

    this.gapTimer = null;
  }

  private hold(type: string, seq: number, data: string): void {
    this.held.set(seq, { data, type });

    if (this.held.size >= GAP_MAX) {
      this.release();

      return;
    }

    this.gapTimer ??= globalThis.setTimeout(() => {
      this.release();
    }, GAP_MS);
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

    if (this.held.size > 0) {
      return;
    }

    this.clearGapTimer();
  }

  private release(): void {
    this.clearGapTimer();

    const waiting = [...this.held.entries()].toSorted(
      ([left], [right]) => left - right
    );

    this.held.clear();

    for (const [seq, held] of waiting) {
      if (seq > this.delivered) {
        this.emit(held.type, seq, held.data);
      }
    }
  }

  private emit(type: string, seq: number, data: string): void {
    if (this.closed) {
      return;
    }

    this.delivered = seq;
    const message = new MessageEvent(type, { data });
    const listeners = this.typed.get(type);

    if (listeners) {
      for (const listener of listeners) {
        listener(message);
      }

      return;
    }

    this.onmessage?.(message);
  }
}

export { VirtualSource };

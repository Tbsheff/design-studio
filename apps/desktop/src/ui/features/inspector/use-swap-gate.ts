import type { ProjectKind } from "@design-studio/contracts";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";

import type { FilesChange } from "../home/use-studio-data.js";
import { useLatestRef } from "./use-latest-ref.js";

const SWAP_RELEASE_MS = 4000;

interface SwapSnapshot {
  readonly flights: number;
  readonly inFlight: string | null;
  readonly next: ReadonlyMap<string, FilesChange>;
  readonly shown: ReadonlyMap<string, FilesChange>;
}

class SwapQueue {
  public readonly shown = new Map<string, FilesChange>();
  public readonly next = new Map<string, FilesChange>();
  private readonly waiting = new Map<string, FilesChange>();
  private readonly listeners = new Set<() => void>();
  private flying: string | null = null;
  private held = false;
  private snapshot: SwapSnapshot = {
    flights: 0,
    inFlight: null,
    next: new Map(),
    shown: new Map(),
  };
  public flights = 0;

  public get inFlight(): string | null {
    return this.flying;
  }

  public readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return (): void => {
      this.listeners.delete(listener);
    };
  };

  public readonly getSnapshot = (): SwapSnapshot => this.snapshot;

  public notify(): void {
    this.snapshot = {
      flights: this.flights,
      inFlight: this.flying,
      next: new Map(this.next),
      shown: new Map(this.shown),
    };

    for (const listener of this.listeners) {
      listener();
    }
  }

  public offer(key: string, change: FilesChange): void {
    this.waiting.set(key, change);
    this.pump();
  }

  public done(directionId: string): boolean {
    if (this.flying !== directionId) {
      return false;
    }

    const change = this.next.get(directionId);

    if (change) {
      this.shown.set(directionId, change);
    }

    this.next.delete(directionId);
    this.flying = null;
    this.pump();

    return true;
  }

  public hold(on: boolean): boolean {
    if (this.held === on) {
      return false;
    }

    this.held = on;
    const id = this.flying;

    if (on && id !== null) {
      const change = this.next.get(id);

      if (change && !this.waiting.has(id)) {
        this.waiting.set(id, change);
      }

      this.next.delete(id);
      this.flying = null;
    }

    if (!on) {
      this.pump();
    }

    return true;
  }

  private pump(): void {
    if (this.held || this.flying !== null) {
      return;
    }

    const first = this.waiting.entries().next();

    if (first.done) {
      return;
    }

    const [id, change] = first.value;
    this.waiting.delete(id);
    this.flying = id;
    this.flights += 1;
    this.next.set(id, change);
  }
}

interface SwapGate {
  readonly shownFor: (key: string) => FilesChange | null;
  readonly nextFor: (key: string) => FilesChange | null;
  readonly onSwapDone: (key: string) => void;
}

interface GateTarget {
  readonly key: string;
  readonly directionId: string;
  readonly headVersionId: string | null;
}

interface SwapGateOptions {
  readonly kind: ProjectKind;
  readonly targets: GateTarget[];
  readonly lastChange: FilesChange | null;
  readonly isHeld: boolean;
  readonly liveDirectionId: string | null;
}

interface GateContext {
  readonly queue: SwapQueue;
  readonly isGated: boolean;
  readonly targetsRef: RefObject<GateTarget[]>;
}

const useChangeOffer = (
  ctx: GateContext,
  lastChange: FilesChange | null,
  liveDirectionId: string | null,
  setLiveWait: Dispatch<SetStateAction<number>>
): void => {
  const { isGated, queue, targetsRef } = ctx;

  useEffect(() => {
    if (!isGated || !lastChange) {
      return;
    }

    if (lastChange.directionId === liveDirectionId && queue.hold(true)) {
      setLiveWait((countValue) => countValue + 1);
    }

    const hits = targetsRef.current.filter(
      (target) => target.directionId === lastChange.directionId
    );

    for (const target of hits) {
      queue.offer(target.key, lastChange);
    }

    if (hits.length > 0) {
      queue.notify();
    }
  }, [isGated, lastChange, liveDirectionId, queue, setLiveWait, targetsRef]);
};

const useLiveRelease = (
  queue: SwapQueue,
  liveWait: number,
  holdRef: RefObject<boolean>
): void => {
  useEffect(() => {
    if (liveWait === 0) {
      return;
    }

    const timer = globalThis.setTimeout(() => {
      if (!holdRef.current && queue.hold(false)) {
        queue.notify();
      }
    }, SWAP_RELEASE_MS);

    return (): void => globalThis.clearTimeout(timer);
  }, [liveWait, queue, holdRef]);
};

const hasHeadMoved = (
  previous: string | null,
  head: string,
  directionId: string
): boolean =>
  previous !== null &&
  previous !== head &&
  previous.startsWith(`${directionId}:`);

const toHeadKey = (target: GateTarget): string =>
  `${target.directionId}:${target.headVersionId ?? ""}`;

const useHeadSwap = (ctx: GateContext): void => {
  const { isGated, queue, targetsRef } = ctx;
  const heads = useRef<Record<string, string>>({});
  const lastKey = useRef("");

  useEffect(() => {
    const headKey = targetsRef.current
      .map((target) => `${target.key}:${toHeadKey(target)}`)
      .join("|");

    if (headKey === lastKey.current) {
      return;
    }

    lastKey.current = headKey;

    for (const target of targetsRef.current) {
      const head = toHeadKey(target);
      const previous = heads.current[target.key] ?? null;
      heads.current[target.key] = head;

      if (isGated && hasHeadMoved(previous, head, target.directionId)) {
        const now = Date.now();
        queue.offer(target.key, {
          changedAt: now,
          directionId: target.directionId,
          paths: [],
          receivedAt: now,
          shouldReload: false,
        });
        queue.notify();
      }
    }
  });
};

const useFlightTimer = (
  snapshot: SwapSnapshot,
  onSwapDone: (key: string) => void
): void => {
  const { flights, inFlight } = snapshot;

  const flight = useMemo(
    () => ({ flights, id: inFlight }),
    [flights, inFlight]
  );

  useEffect(() => {
    const { id } = flight;

    if (id === null) {
      return;
    }

    const timer = globalThis.setTimeout(() => onSwapDone(id), SWAP_RELEASE_MS);

    return (): void => globalThis.clearTimeout(timer);
  }, [flight, onSwapDone]);
};

const useSwapGate = (options: SwapGateOptions): SwapGate => {
  const { isHeld, kind, lastChange, liveDirectionId, targets } = options;
  const queue = useMemo(() => new SwapQueue(), []);
  const snapshot = useSyncExternalStore(queue.subscribe, queue.getSnapshot);
  const targetsRef = useLatestRef(targets);
  const holdRef = useLatestRef(isHeld);
  const [liveWait, setLiveWait] = useState(0);
  const isGated = kind === "html";

  const ctx = useMemo(
    () => ({ isGated, queue, targetsRef }),
    [isGated, queue, targetsRef]
  );

  const onSwapDone = useCallback(
    (key: string) => {
      if (queue.done(key)) {
        queue.notify();
      }
    },
    [queue]
  );

  useChangeOffer(ctx, lastChange, liveDirectionId, setLiveWait);
  useLiveRelease(queue, liveWait, holdRef);
  useHeadSwap(ctx);

  useEffect(() => {
    if (queue.hold(isHeld)) {
      queue.notify();
    }
  }, [isHeld, queue]);

  useFlightTimer(snapshot, onSwapDone);

  const shownFor = useCallback(
    (directionId: string) => snapshot.shown.get(directionId) ?? null,
    [snapshot]
  );

  const nextFor = useCallback(
    (directionId: string) => snapshot.next.get(directionId) ?? null,
    [snapshot]
  );

  return { nextFor, onSwapDone, shownFor };
};

export { SwapQueue, useSwapGate };

export type { SwapGate, GateTarget };

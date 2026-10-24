import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { ProjectKind } from '../shared/contracts';
import type { FilesChange } from './useStudioData';

const SWAP_RELEASE_MS = 4000;

export class SwapQueue {
  readonly shown = new Map<string, FilesChange>();
  readonly next = new Map<string, FilesChange>();
  private readonly waiting = new Map<string, FilesChange>();
  private flying: string | null = null;
  private held = false;
  flights = 0;

  get inFlight(): string | null {
    return this.flying;
  }

  offer(key: string, change: FilesChange): void {
    this.waiting.set(key, change);
    this.pump();
  }

  done(directionId: string): boolean {
    if (this.flying !== directionId) return false;
    const change = this.next.get(directionId);
    if (change) this.shown.set(directionId, change);
    this.next.delete(directionId);
    this.flying = null;
    this.pump();
    return true;
  }

  hold(on: boolean): boolean {
    if (this.held === on) return false;
    this.held = on;
    const id = this.flying;
    if (on && id !== null) {
      const change = this.next.get(id);
      if (change && !this.waiting.has(id)) this.waiting.set(id, change);
      this.next.delete(id);
      this.flying = null;
    }
    if (!on) this.pump();
    return true;
  }

  private pump(): void {
    if (this.held || this.flying !== null) return;
    const first = this.waiting.entries().next();
    if (first.done) return;
    const [id, change] = first.value;
    this.waiting.delete(id);
    this.flying = id;
    this.flights += 1;
    this.next.set(id, change);
  }
}

export interface SwapGate {
  shownFor: (key: string) => FilesChange | null;
  nextFor: (key: string) => FilesChange | null;
  onSwapDone: (key: string) => void;
}

export interface GateTarget {
  key: string;
  directionId: string;
  headVersionId: string | null;
}

export function useSwapGate(kind: ProjectKind, targets: GateTarget[], lastChange: FilesChange | null, hold: boolean, liveDirectionId: string | null = null): SwapGate {
  const queue = useRef(new SwapQueue());
  const [version, bump] = useReducer((n: number) => n + 1, 0);
  const heads = useRef<Record<string, string>>({});
  const live = useRef(targets);
  live.current = targets;
  const holdRef = useRef(hold);
  holdRef.current = hold;
  const [liveWait, setLiveWait] = useState(0);
  const gated = kind === 'html';

  const onSwapDone = useCallback((key: string) => {
    if (queue.current.done(key)) bump();
  }, []);

  useEffect(() => {
    if (!gated || !lastChange) return;
    if (lastChange.directionId === liveDirectionId && queue.current.hold(true)) setLiveWait((n) => n + 1);
    const hits = live.current.filter((target) => target.directionId === lastChange.directionId);
    for (const target of hits) queue.current.offer(target.key, lastChange);
    if (hits.length > 0) bump();
  }, [gated, lastChange, liveDirectionId]);

  useEffect(() => {
    if (liveWait === 0) return;
    const timer = window.setTimeout(() => {
      if (!holdRef.current && queue.current.hold(false)) bump();
    }, SWAP_RELEASE_MS);
    return () => window.clearTimeout(timer);
  }, [liveWait]);

  const headKey = targets.map((target) => `${target.key}:${target.directionId}:${target.headVersionId ?? ''}`).join('|');
  useEffect(() => {
    for (const target of live.current) {
      const head = `${target.directionId}:${target.headVersionId ?? ''}`;
      const previous = heads.current[target.key];
      heads.current[target.key] = head;
      if (!gated || previous === undefined || previous === head || !previous.startsWith(`${target.directionId}:`)) continue;
      const now = Date.now();
      queue.current.offer(target.key, { directionId: target.directionId, changedAt: now, receivedAt: now, paths: [] });
      bump();
    }
  }, [headKey, gated]);

  useEffect(() => {
    if (queue.current.hold(hold)) bump();
  }, [hold]);

  const flying = queue.current.inFlight;
  const flight = queue.current.flights;
  useEffect(() => {
    if (flying === null) return;
    const timer = window.setTimeout(() => onSwapDone(flying), SWAP_RELEASE_MS);
    return () => window.clearTimeout(timer);
  }, [flying, flight, onSwapDone]);

  const shownFor = useCallback((directionId: string) => queue.current.shown.get(directionId) ?? null, [version]);
  const nextFor = useCallback((directionId: string) => queue.current.next.get(directionId) ?? null, [version]);
  return { shownFor, nextFor, onSwapDone };
}

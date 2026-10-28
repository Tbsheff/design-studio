import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReviewFinding, ReviewResult } from '../shared/review';
import { api, errorText } from './api';
import type { CanvasFrame } from './canvasFrames';
import type { FilesChange } from './useStudioData';

const RERUN_MS = 900;
const SIDE_MIN = 200;
const SIDE_MAX = 4000;

export interface ReviewInput {
  projectId: string;
  directionId: string | null;
  frame: CanvasFrame;
  lastChange: FilesChange | null;
  open: boolean;
}

export interface ReviewState {
  result: ReviewResult | null;
  stale: boolean;
  busy: boolean;
  fixing: string[] | null;
  error: string | null;
  run: () => void;
  fix: (findings: ReviewFinding[]) => Promise<void>;
}

function side(value: number): number {
  return Math.min(SIDE_MAX, Math.max(SIDE_MIN, Math.round(value)));
}

export function frameKey(directionId: string | null, frame: CanvasFrame): string {
  return `${directionId}|${frame.id}|${frame.path ?? ''}|${frame.width}x${frame.height}`;
}

function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function useReview(input: ReviewInput): ReviewState {
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [changedAt, setChangedAt] = useState(0);
  const [ranAt, setRanAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fixing, setFixing] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = useLatest(input);
  const key = frameKey(input.directionId, input.frame);
  const pending = useRef(0);

  const run = useCallback(() => {
    const { projectId, directionId, frame } = latest.current;
    if (!directionId) return;
    const ticket = ++pending.current;
    const runKey = frameKey(directionId, frame);
    const started = Date.now();
    setBusy(true);
    setError(null);
    api
      .review(projectId, directionId, { frame: frame.id, ...(frame.path ? { path: frame.path } : {}), width: side(frame.width), height: side(frame.height) })
      .then((next) => {
        if (ticket !== pending.current) return;
        setResult(next);
        setResultKey(runKey);
        setRanAt(started);
      })
      .catch((err: unknown) => ticket === pending.current && setError(errorText(err)))
      .finally(() => ticket === pending.current && setBusy(false));
  }, [latest]);

  const fix = useCallback(
    async (findings: ReviewFinding[]) => {
      const { projectId, directionId } = latest.current;
      if (!directionId || findings.length === 0) return;
      setFixing(findings.map((finding) => finding.id));
      setError(null);
      try {
        const done = await api.reviewFix(projectId, directionId, findings.map((finding) => finding.id));
        if (done.applied.length === 0) setError(done.skipped[0]?.reason ?? 'Nothing was fixed.');
      } catch (err) {
        setError(errorText(err));
      } finally {
        setFixing(null);
      }
    },
    [latest],
  );

  const change = input.lastChange;
  useEffect(() => {
    if (change && change.directionId === latest.current.directionId) setChangedAt(change.receivedAt);
  }, [change, latest]);

  const stale = result !== null && (resultKey !== key || changedAt > ranAt);
  const open = input.open;
  useEffect(() => {
    if (!open || busy || fixing || error) return;
    if (result && !stale) return;
    const timer = window.setTimeout(run, result ? RERUN_MS : 0);
    return () => window.clearTimeout(timer);
  }, [open, stale, result, busy, fixing, error, run]);

  return { result: resultKey === key ? result : null, stale, busy, fixing, error, run, fix };
}

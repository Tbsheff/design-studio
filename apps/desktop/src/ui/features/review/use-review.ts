import type {
  ReviewFinding,
  ReviewResult,
} from "@design-studio/contracts/review";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { api, errorText } from "../../api.js";
import type { CanvasFrame } from "../canvas/canvas-frames-model.js";
import type { FilesChange } from "../home/use-studio-data.js";
import { pick } from "./pick.js";

const RERUN_MS = 900;
const SIDE_MIN = 200;
const SIDE_MAX = 4000;

interface ReviewInput {
  projectId: string;
  directionId: string | null;
  frame: CanvasFrame;
  lastChange: FilesChange | null;
  open: boolean;
}

interface ReviewState {
  result: ReviewResult | null;
  stale: boolean;
  busy: boolean;
  fixing: string[] | null;
  error: string | null;
  run: () => void;
  fix: (findings: ReviewFinding[]) => Promise<void>;
}

const side = (value: number): number =>
  Math.min(SIDE_MAX, Math.max(SIDE_MIN, Math.round(value)));

const frameKey = (directionId: string | null, frame: CanvasFrame): string =>
  `${directionId}|${frame.id}|${frame.path ?? ""}|${frame.width}x${frame.height}`;

const useLatest = <Value>(value: Value): RefObject<Value> => {
  const ref = useRef(value);
  ref.current = value;

  return ref;
};

const useReview = (input: ReviewInput): ReviewState => {
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

    if (!directionId) {
      return;
    }

    const ticket = ++pending.current;
    const runKey = frameKey(directionId, frame);
    const started = Date.now();
    setBusy(true);
    setError(null);
    const load = async (): Promise<void> => {
      try {
        const next = await api.review(projectId, directionId, {
          frame: frame.id,
          ...(frame.path ? { path: frame.path } : {}),
          height: side(frame.height),
          width: side(frame.width),
        });

        if (ticket !== pending.current) {
          return;
        }

        setResult(next);
        setResultKey(runKey);
        setRanAt(started);
      } catch (caught) {
        if (ticket === pending.current) {
          setError(errorText(caught));
        }
      } finally {
        if (ticket === pending.current) {
          setBusy(false);
        }
      }
    };
    void load();
  }, [latest]);

  const fix = useCallback(
    async (findings: ReviewFinding[]) => {
      const { projectId, directionId } = latest.current;

      if (!directionId || findings.length === 0) {
        return;
      }

      setFixing(findings.map((finding) => finding.id));
      setError(null);

      try {
        const done = await api.reviewFix(
          projectId,
          directionId,
          findings.map((finding) => finding.id)
        );

        if (done.applied.length === 0) {
          setError(done.skipped[0]?.reason ?? "Nothing was fixed.");
        }
      } catch (caught) {
        setError(errorText(caught));
      } finally {
        setFixing(null);
      }
    },
    [latest]
  );

  const change = input.lastChange;
  useEffect(() => {
    if (change && change.directionId === latest.current.directionId) {
      setChangedAt(change.receivedAt);
    }
  }, [change, latest]);

  const stale = result !== null && (resultKey !== key || changedAt > ranAt);
  const { open } = input;
  useEffect(() => {
    if (!open || busy || fixing || error) {
      return;
    }

    if (result && !stale) {
      return;
    }

    const timer = globalThis.setTimeout(run, pick(result, RERUN_MS, 0));

    return (): void => globalThis.clearTimeout(timer);
  }, [open, stale, result, busy, fixing, error, run]);

  return {
    busy,
    error,
    fix,
    fixing,
    result: pick(resultKey === key, result, null),
    run,
    stale,
  };
};

export { frameKey, useReview };

export type { ReviewInput, ReviewState };

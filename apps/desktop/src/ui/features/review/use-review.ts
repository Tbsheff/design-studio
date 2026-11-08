import type {
  ReviewFinding,
  ReviewResult,
} from "@design-studio/contracts/review";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";

import { api, errorText } from "../../api.js";
import type { CanvasFrame } from "../canvas/canvas-frames-model.js";
import type { FilesChange } from "../home/use-studio-data.js";
import { pick } from "./pick.js";
import { toFrameKey, toReviewRequest } from "./review-request.js";

const RERUN_MS = 900;

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

interface Loaded {
  ranAt: number;
  result: ReviewResult | null;
  resultKey: string | null;
}

interface SeenChange {
  change: FilesChange | null;
  changedAt: number;
}

interface ReviewRun {
  isBusy: boolean;
  run: () => void;
}

interface ReviewFix {
  fix: (findings: ReviewFinding[]) => Promise<void>;
  fixing: string[] | null;
}

type SetFailure = Dispatch<SetStateAction<string | null>>;

const EMPTY_LOADED: Loaded = { ranAt: 0, result: null, resultKey: null };
const EMPTY_SEEN: SeenChange = { change: null, changedAt: 0 };

const useLatest = <Value>(value: Value): RefObject<Value> => {
  const ref = useRef(value);

  useLayoutEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
};

const useReviewRun = (
  latest: RefObject<ReviewInput>,
  setLoaded: Dispatch<SetStateAction<Loaded>>,
  setFailure: SetFailure
): ReviewRun => {
  const [isBusy, startRun] = useTransition();
  const pending = useRef(0);

  const run = useCallback(() => {
    const { projectId, directionId, frame } = latest.current;

    if (!directionId) {
      return;
    }

    pending.current += 1;

    const ticket = pending.current;
    const started = Date.now();
    setFailure(null);

    startRun(async () => {
      try {
        const next = await api.review(
          projectId,
          directionId,
          toReviewRequest(frame)
        );

        if (ticket === pending.current) {
          setLoaded({
            ranAt: started,
            result: next,
            resultKey: toFrameKey(directionId, frame),
          });
        }
      } catch (error) {
        if (ticket === pending.current) {
          setFailure(errorText(error));
        }
      }
    });
  }, [latest, setFailure, setLoaded]);

  return { isBusy, run };
};

const useReviewFix = (
  latest: RefObject<ReviewInput>,
  setFailure: SetFailure
): ReviewFix => {
  const [fixing, setFixing] = useState<string[] | null>(null);

  const fix = useCallback(
    async (findings: ReviewFinding[]) => {
      const { projectId, directionId } = latest.current;

      if (!directionId || findings.length === 0) {
        return;
      }

      setFixing(findings.map((finding) => finding.id));
      setFailure(null);

      try {
        const done = await api.reviewFix(
          projectId,
          directionId,
          findings.map((finding) => finding.id)
        );

        if (done.applied.length === 0) {
          setFailure(done.skipped[0]?.reason ?? "Nothing was fixed.");
        }
      } catch (error) {
        setFailure(errorText(error));
      }

      setFixing(null);
    },
    [latest, setFailure]
  );

  return { fix, fixing };
};

const useChangedAt = (
  change: FilesChange | null,
  directionId: string | null
): number => {
  const [seen, setSeen] = useState(EMPTY_SEEN);

  if (change !== seen.change) {
    const isOwn = change !== null && change.directionId === directionId;

    setSeen({
      change,
      changedAt: pick(isOwn, change?.receivedAt ?? 0, seen.changedAt),
    });
  }

  return seen.changedAt;
};

const useReview = (input: ReviewInput): ReviewState => {
  const [loaded, setLoaded] = useState(EMPTY_LOADED);
  const [failure, setFailure] = useState<string | null>(null);
  const latest = useLatest(input);
  const key = toFrameKey(input.directionId, input.frame);

  const { isBusy, run: runReview } = useReviewRun(
    latest,
    setLoaded,
    setFailure
  );

  const { fix: fixFindings, fixing: activeFixes } = useReviewFix(
    latest,
    setFailure
  );

  const changedAt = useChangedAt(input.lastChange, input.directionId);
  const { result, resultKey } = loaded;

  const stale =
    result !== null && (resultKey !== key || changedAt > loaded.ranAt);

  const { open } = input;

  useEffect(() => {
    if (!open || isBusy || activeFixes || failure) {
      return;
    }

    if (result && !stale) {
      return;
    }

    const timer = globalThis.setTimeout(runReview, pick(result, RERUN_MS, 0));

    return (): void => globalThis.clearTimeout(timer);
  }, [open, stale, result, isBusy, activeFixes, failure, runReview]);

  return {
    busy: isBusy,
    error: failure,
    fix: fixFindings,
    fixing: activeFixes,
    result: pick(resultKey === key, result, null),
    run: runReview,
    stale,
  };
};

export { useReview };

export type { ReviewInput, ReviewState };

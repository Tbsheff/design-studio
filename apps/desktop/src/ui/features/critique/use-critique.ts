import { useCallback, useMemo, useState, useTransition } from "react";

import type { CritiqueView } from "./critique-model.js";
import { useGetCritique } from "./use-get.js";
import type { GetInput } from "./use-get.js";
import { useRunCritique } from "./use-run.js";

interface CritiqueOptions {
  readonly directionId: string | null;
  readonly frameId: string;
  readonly projectId: string;
}

interface CritiqueState {
  readonly critique: CritiqueView | null;
  readonly error: string | null;
  readonly handleRun: () => void;
  readonly isBusy: boolean;
}

interface Latest {
  readonly key: string;
  readonly value: CritiqueView;
}

const toKey = (input: GetInput): string =>
  `${input.projectId}|${input.directionId}|${input.frameId}`;

const useCritique = (options: CritiqueOptions): CritiqueState => {
  const { directionId, frameId, projectId } = options;
  const [latest, setLatest] = useState<Latest | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const runner = useRunCritique();

  const input = useMemo(() => {
    if (directionId === null) {
      return null;
    }

    return { directionId, frameId, projectId };
  }, [directionId, frameId, projectId]);

  const saved = useGetCritique(input);

  const handleRun = useCallback(() => {
    if (input === null) {
      return;
    }

    startSubmit(async () => {
      const done = await runner.run(input);

      if (done !== null) {
        setLatest({ key: toKey(input), value: done });
      }
    });
  }, [input, runner]);

  const isCurrent = input !== null && latest?.key === toKey(input);
  const critique = (isCurrent && latest?.value) || saved.data;

  const error = runner.error?.message ?? null;
  const isBusy = isSubmitting || runner.pending;

  return { critique, error, handleRun, isBusy };
};

export { useCritique };

export type { CritiqueOptions, CritiqueState };

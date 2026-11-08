import { useCallback, useMemo, useState, useTransition } from "react";

import type { AttentionView } from "./attention-model.js";
import { critiqueRoutes, useAction } from "./deps.js";

interface AttentionOptions {
  readonly directionId: string | null;
  readonly frameId: string;
  readonly projectId: string;
}

interface AttentionState {
  readonly attention: AttentionView | null;
  readonly error: string | null;
  readonly handleRun: () => void;
  readonly isBusy: boolean;
}

interface Latest {
  readonly key: string;
  readonly value: AttentionView;
}

const toKey = (options: AttentionOptions): string =>
  `${options.projectId}|${options.directionId}|${options.frameId}`;

const useAttention = (options: AttentionOptions): AttentionState => {
  const { directionId, frameId, projectId } = options;
  const [latest, setLatest] = useState<Latest | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const runner = useAction(critiqueRoutes.runAttentionCritique);

  const input = useMemo(() => {
    if (directionId === null) {
      return null;
    }

    return { directionId, frameId, projectId };
  }, [directionId, frameId, projectId]);

  const saved = useAction(critiqueRoutes.getAttentionCritique, input);

  const handleRun = useCallback(() => {
    if (input === null) {
      return;
    }

    startSubmit(async () => {
      const done = await runner.run(input);

      if (done !== null) {
        setLatest({ key: toKey(options), value: done });
      }
    });
  }, [input, options, runner]);

  const isCurrent = latest?.key === toKey(options);
  const attention = (isCurrent && latest?.value) || saved.data?.result || null;
  const error = runner.error?.message ?? null;
  const isBusy = isSubmitting || runner.pending;

  return { attention, error, handleRun, isBusy };
};

export { useAttention };

export type { AttentionOptions, AttentionState };

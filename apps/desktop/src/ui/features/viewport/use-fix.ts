import { useCallback, useState, useTransition } from "react";

import type { FixResultView } from "./fix-model.js";
import { toFixWidths } from "./fix-model.js";
import { useApplyViewport } from "./use-apply.js";
import type { ApplyInput } from "./use-apply.js";

interface FixOptions {
  readonly directionId: string | null;
  readonly onApplied: () => void;
  readonly page: string;
  readonly projectId: string;
  readonly widths: readonly number[];
}

interface FixView {
  readonly canFix: boolean;
  readonly error: string | null;
  readonly handleApply: () => void;
  readonly handlePreview: () => void;
  readonly isBusy: boolean;
  readonly isSaved: boolean;
  readonly result: FixResultView | null;
}

const requestOf = (options: FixOptions, isDry: boolean): ApplyInput => ({
  directionId: options.directionId,
  isDryRun: isDry,
  kinds: ["overflow", "clipped-text", "tap-target", "horizontal-scroll"],
  page: options.page,
  projectId: options.projectId,
  widths: toFixWidths(options.widths),
});

const useFix = (options: FixOptions): FixView => {
  const [result, setResult] = useState<FixResultView | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const applier = useApplyViewport();
  const { onApplied } = options;

  const canFix =
    options.directionId !== null && toFixWidths(options.widths).length > 0;

  const handlePreview = useCallback(() => {
    startSubmit(async () => {
      const planned = await applier.run(requestOf(options, true));

      if (planned !== null) {
        setResult(planned);
      }
    });
  }, [applier, options]);

  const handleApply = useCallback(() => {
    startSubmit(async () => {
      const saved = await applier.run(requestOf(options, false));

      if (saved !== null) {
        setResult(saved);
        onApplied();
      }
    });
  }, [applier, onApplied, options]);

  const error = applier.error?.message ?? null;
  const isBusy = isSubmitting || applier.pending;
  const isSaved = result !== null && result.versionId !== null;

  return {
    canFix,
    error,
    handleApply,
    handlePreview,
    isBusy,
    isSaved,
    result,
  };
};

export { useFix };

export type { FixOptions, FixView };

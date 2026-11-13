import { routes } from "@design-studio/actions/page/routes";
import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useMemo, useState, useTransition } from "react";

import { useAction } from "../../platform/query.js";
import { copy } from "./copy.js";
import {
  isSharedLayerApplicable,
  isSharedLayerShown,
  toSharedLayerCounts,
  toSharedLayerFiles,
  toSharedLayerNotice,
  toSharedLayerSource,
  toSharedLayerTargets,
} from "./shared-layers-model.js";
import type {
  SharedLayerCounts,
  SharedLayerMatch,
  SharedLayerNotice,
} from "./shared-layers-model.js";
import { isApiConflict } from "./use-api-error.js";

interface SharedLayersSetup {
  readonly directionId: string | null;
  readonly editCount: number;
  readonly projectId: string;
  readonly selection: readonly SelectionContext[];
}

interface SharedLayersState {
  readonly counts: SharedLayerCounts;
  readonly error: string | null;
  readonly files: string;
  readonly isApplicable: boolean;
  readonly isPending: boolean;
  readonly isShown: boolean;
  readonly notice: SharedLayerNotice | null;
  readonly handleApply: () => void;
}

interface SharedLayersBaseline {
  readonly count: number;
  readonly html: string;
  readonly key: string;
}

const NO_ITEMS: readonly SharedLayerMatch[] = [];

const APPLY_STEP = 1;

const toApplyError = (error: Error | null): string | null => {
  if (error === null) {
    return null;
  }

  if (isApiConflict(error)) {
    return copy.sharedAllChanged;
  }

  return error.message;
};

const toVisibleNotice = (
  notice: SharedLayerNotice | null,
  key: string
): SharedLayerNotice | null => {
  if (notice?.key !== key) {
    return null;
  }

  return notice;
};

const useSharedLayers = (setup: SharedLayersSetup): SharedLayersState => {
  const { directionId, editCount, projectId, selection } = setup;
  const source = useMemo(() => toSharedLayerSource(selection), [selection]);
  const key = source?.key ?? "";
  const html = source?.html ?? "";
  const count = editCount;

  const [baseline, setBaseline] = useState<SharedLayersBaseline>({
    count,
    html,
    key,
  });

  const [notice, setNotice] = useState<SharedLayerNotice | null>(null);
  const [isApplyPending, startTransition] = useTransition();

  if (baseline.key !== key) {
    setBaseline({ count, html, key });
  }

  const input = useMemo(() => {
    if (source === null || directionId === null) {
      return null;
    }

    const { file, selector } = source;
    const versionId = null;

    return { directionId, file, projectId, selector, versionId };
  }, [directionId, projectId, source]);

  const inspect = useAction(routes.inspectMatchesPage, input);
  const update = useAction(routes.updateMatchesPage);
  const { run } = update;
  const { refetch } = inspect;
  const items = inspect.data?.items ?? NO_ITEMS;
  const isEdited = baseline.html !== html || editCount > baseline.count;

  const applyMatches = useCallback((): void => {
    if (input === null) {
      return;
    }

    const targets = toSharedLayerTargets(items);

    startTransition(async () => {
      const { file, selector } = input;

      const done = await run({
        directionId: input.directionId,
        file,
        projectId,
        selector,
        targets,
      });

      if (done === null) {
        setNotice(null);
        await refetch();

        return;
      }

      setNotice(toSharedLayerNotice(key, done));
      setBaseline({ count: count + APPLY_STEP, html, key });
    });
  }, [count, html, input, items, key, projectId, refetch, run]);

  return {
    counts: toSharedLayerCounts(items),
    error: toApplyError(update.error),
    files: toSharedLayerFiles(items),
    handleApply: applyMatches,
    isApplicable: isSharedLayerApplicable(items, isEdited),
    isPending: isApplyPending,
    isShown: isSharedLayerShown(items),
    notice: toVisibleNotice(notice, key),
  };
};

export { useSharedLayers };

export type { SharedLayersSetup, SharedLayersState };

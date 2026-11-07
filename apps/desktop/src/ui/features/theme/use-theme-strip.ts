import { useMemo } from "react";

import { themeRoutes, useAction } from "./deps.js";
import type { ThemeItem } from "./theme-model.js";
import { useThemeActions } from "./use-theme-actions.js";
import { useThemePreview } from "./use-theme-preview.js";

interface ThemeStripSetup {
  readonly directionId: string;
  readonly onApplied: () => void;
  readonly onPreview: (css: string) => void;
  readonly projectId: string;
}

interface ThemeStrip {
  readonly error: string | null;
  readonly handleApply: (item: ThemeItem) => void;
  readonly handleShuffle: (brief: string) => void;
  readonly handleToggle: (item: ThemeItem) => void;
  readonly isBusy: boolean;
  readonly items: readonly ThemeItem[];
}

const LIST_LIMIT = 8;

const useThemeStrip = (setup: ThemeStripSetup): ThemeStrip => {
  const { directionId, onApplied, onPreview, projectId } = setup;

  const ids = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  const input = useMemo(() => ({ ...ids, limit: LIST_LIMIT }), [ids]);

  const read = useAction(themeRoutes.listTheme, input);
  const items = useMemo(() => read.data?.items ?? [], [read.data]);

  const onUnshown = useThemePreview({
    directionId,
    items,
    onPreview,
    projectId,
  });

  const actions = useThemeActions({
    directionId,
    onApplied,
    onUnshown,
    projectId,
  });

  const error = actions.error ?? read.error?.message ?? null;
  const { handleApply, handleShuffle, handleToggle, isBusy } = actions;

  return { error, handleApply, handleShuffle, handleToggle, isBusy, items };
};

export { useThemeStrip };

export type { ThemeStrip, ThemeStripSetup };

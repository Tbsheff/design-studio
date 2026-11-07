import { useCallback, useMemo, useTransition } from "react";

import { themeRoutes, useAction } from "./deps.js";
import { toRandomSeed } from "./theme-model.js";
import type { ThemeItem } from "./theme-model.js";

interface ThemeActionsSetup {
  readonly directionId: string;
  readonly onApplied: () => void;
  readonly onUnshown: () => void;
  readonly projectId: string;
}

interface ThemeActions {
  readonly error: string | null;
  readonly handleApply: (item: ThemeItem) => void;
  readonly handleShuffle: (brief: string) => void;
  readonly handleToggle: (item: ThemeItem) => void;
  readonly isBusy: boolean;
}

const SHUFFLE_COUNT = 4;

const toFirstError = (errors: readonly (Error | null)[]): string | null => {
  const found = errors.find((item) => item !== null) ?? null;

  if (found === null) {
    return null;
  }

  return found.message;
};

const useThemeActions = (setup: ThemeActionsSetup): ThemeActions => {
  const { directionId, onApplied, onUnshown, projectId } = setup;

  const ids = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  const creator = useAction(themeRoutes.createTheme);
  const setter = useAction(themeRoutes.setTheme);
  const applier = useAction(themeRoutes.applyTheme);
  const [isWorking, startWork] = useTransition();
  const { run: runCreate } = creator;
  const { run: runSet } = setter;
  const { run: runApply } = applier;

  const handleShuffle = useCallback(
    (brief: string): void => {
      const trimmed = brief.trim();
      let text: string | null = null;

      if (trimmed !== "") {
        text = trimmed;
      }

      startWork(async () => {
        await runCreate({
          brief: text,
          count: SHUFFLE_COUNT,
          ...ids,
          seed: toRandomSeed(),
        });
      });
    },
    [ids, runCreate]
  );

  const handleToggle = useCallback(
    (item: ThemeItem): void => {
      let themeId: string | null = item.id;

      if (item.isActive) {
        themeId = null;
      }

      startWork(async () => {
        await runSet({
          ...ids,
          themeId,
        });
      });
    },
    [ids, runSet]
  );

  const handleApply = useCallback(
    (item: ThemeItem): void => {
      startWork(async () => {
        onUnshown();

        const done = await runApply({
          ...ids,
          themeId: item.id,
        });

        if (done !== null) {
          onApplied();
        }
      });
    },
    [ids, onApplied, onUnshown, runApply]
  );

  const error = toFirstError([creator.error, setter.error, applier.error]);

  return { error, handleApply, handleShuffle, handleToggle, isBusy: isWorking };
};

export { useThemeActions };

export type { ThemeActions };

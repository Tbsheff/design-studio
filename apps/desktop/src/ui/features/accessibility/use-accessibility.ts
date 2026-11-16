import { useCallback, useMemo, useState, useTransition } from "react";

import { applyContrastFix, writeAccessibility } from "./accessibility-api.js";
import type { AccessibilityIds, ThemeName } from "./accessibility-api.js";
import { insertError } from "./deps.js";
import type {
  AccessibilityChanges,
  AccessibilityReport,
  ContrastFix,
  SelectionContext,
} from "./deps.js";
import { useAccessibilityInfo } from "./use-accessibility-info.js";

interface Accessibility {
  readonly apply: (changes: AccessibilityChanges) => void;
  readonly error: string | null;
  readonly handleFix: (fix: ContrastFix) => void;
  readonly handleTheme: (theme: ThemeName) => void;
  readonly ids: AccessibilityIds;
  readonly isPending: boolean;
  readonly report: AccessibilityReport | null;
  readonly theme: ThemeName;
}

const toColorScheme = (theme: ThemeName): ThemeName | null => {
  if (theme === "dark") {
    return theme;
  }

  return null;
};

const useAccessibility = (
  ids: AccessibilityIds,
  target: SelectionContext
): Accessibility => {
  const [round, setRound] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeName>("light");
  const [isPending, startTransition] = useTransition();

  const query = useMemo(
    () => ({
      colorScheme: toColorScheme(theme),
      frame: null,
      passing: true,
      selector: target.selector,
    }),
    [target.selector, theme]
  );

  const load = useAccessibilityInfo(ids, query, String(round), true);

  const run = useCallback((work: () => Promise<object>): void => {
    startTransition(async () => {
      try {
        await work();
        setSaveError(null);
      } catch (error) {
        setSaveError(insertError(error));
      }

      setRound((value) => value + 1);
    });
  }, []);

  const apply = useCallback(
    (changes: AccessibilityChanges): void => {
      run(() => writeAccessibility(ids, target, changes));
    },
    [ids, run, target]
  );

  const handleFix = useCallback(
    (next: ContrastFix): void => {
      run(() => applyContrastFix(ids, next));
    },
    [ids, run]
  );

  const handleTheme = useCallback((next: ThemeName): void => {
    setTheme(next);
  }, []);

  const error = saveError ?? load.error;
  const { report } = load;

  return useMemo(
    () => ({
      apply,
      error,
      handleFix,
      handleTheme,
      ids,
      isPending,
      report,
      theme,
    }),
    [apply, error, handleFix, handleTheme, ids, isPending, report, theme]
  );
};

export { useAccessibility };

export type { Accessibility };

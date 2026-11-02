import { useCallback, useMemo, useState, useTransition } from "react";

import { applyContrastFix, writeAccessibility } from "./accessibility-api.js";
import type { AccessibilityIds } from "./accessibility-api.js";
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
  readonly isPending: boolean;
  readonly report: AccessibilityReport | null;
}

const useAccessibility = (
  ids: AccessibilityIds,
  target: SelectionContext
): Accessibility => {
  const [round, setRound] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const query = useMemo(
    () => ({ frame: null, passing: true, selector: target.selector }),
    [target.selector]
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

  const error = saveError ?? load.error;
  const { report } = load;

  return useMemo(
    () => ({ apply, error, handleFix, isPending, report }),
    [apply, error, handleFix, isPending, report]
  );
};

export { useAccessibility };

export type { Accessibility };

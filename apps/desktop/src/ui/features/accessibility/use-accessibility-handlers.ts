import { useCallback, useMemo } from "react";

import {
  labelChange,
  roleChange,
  tabIndexChange,
} from "./accessibility-model.js";
import type { Accessibility } from "./use-accessibility.js";

interface AccessibilityHandlers {
  readonly handleAlt: (raw: string) => void;
  readonly handleDecorative: (isDecorative: boolean) => void;
  readonly handleLabel: (raw: string) => void;
  readonly handleRole: (raw: string) => void;
  readonly handleTabIndex: (raw: string) => void;
}

const useAccessibilityHandlers = (
  accessibility: Accessibility
): AccessibilityHandlers => {
  const { apply } = accessibility;

  const handleLabel = useCallback(
    (raw: string): void => apply(labelChange(raw)),
    [apply]
  );

  const handleRole = useCallback(
    (raw: string): void => apply(roleChange(raw)),
    [apply]
  );

  const handleAlt = useCallback(
    (raw: string): void => apply({ alt: raw.trim() }),
    [apply]
  );

  const handleDecorative = useCallback(
    (isDecorative: boolean): void => {
      if (isDecorative) {
        apply({ alt: "" });

        return;
      }

      apply({ alt: null });
    },
    [apply]
  );

  const handleTabIndex = useCallback(
    (raw: string): void => {
      const change = tabIndexChange(raw);

      if (change !== null) {
        apply(change);
      }
    },
    [apply]
  );

  return useMemo(
    () => ({
      handleAlt,
      handleDecorative,
      handleLabel,
      handleRole,
      handleTabIndex,
    }),
    [handleAlt, handleDecorative, handleLabel, handleRole, handleTabIndex]
  );
};

export { useAccessibilityHandlers };

export type { AccessibilityHandlers };

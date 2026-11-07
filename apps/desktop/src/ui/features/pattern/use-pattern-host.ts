import { useCallback, useMemo, useState } from "react";

import { copy } from "./copy.js";
import type { IconName, SelectionContext } from "./deps.js";
import { toTarget } from "./pattern-model.js";
import type { PatternTarget } from "./pattern-model.js";

interface PatternHostOptions {
  readonly busy: boolean;
  readonly directionId: string | null;
  readonly enabled: boolean;
  readonly isReact: boolean;
  readonly notify: (message: string) => void;
  readonly projectId: string;
}

interface PatternMenuItem {
  readonly disabled?: string;
  readonly icon: IconName;
  readonly id: string;
  readonly label: string;
  readonly run: () => void;
}

interface PatternHost {
  readonly close: () => void;
  readonly items: (target: SelectionContext) => PatternMenuItem[];
  readonly opened: PatternTarget | null;
}

const toBlocker = (
  busy: boolean,
  target: PatternTarget | null
): string | null => {
  if (target === null) {
    return copy.needSource;
  }

  if (busy) {
    return copy.wait;
  }

  return null;
};

const usePatternHost = (options: PatternHostOptions): PatternHost => {
  const [opened, setOpened] = useState<PatternTarget | null>(null);
  const { busy, directionId, enabled, isReact } = options;

  const close = useCallback((): void => setOpened(null), []);

  const items = useCallback(
    (selection: SelectionContext): PatternMenuItem[] => {
      if (!enabled || directionId === null || !isReact) {
        return [];
      }

      const target = toTarget(selection);
      const blocked = toBlocker(busy, target);

      const run = (): void => setOpened(target);

      const item: PatternMenuItem = {
        icon: "component",
        id: "save-pattern",
        label: copy.menu,
        run,
      };

      if (blocked !== null) {
        return [{ ...item, disabled: blocked }];
      }

      return [item];
    },
    [busy, directionId, enabled, isReact]
  );

  return useMemo(() => ({ close, items, opened }), [close, items, opened]);
};

export { usePatternHost };

export type { PatternHost, PatternHostOptions, PatternMenuItem };

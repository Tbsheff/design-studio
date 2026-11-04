import { useCallback, useMemo, useState } from "react";

import { copy } from "./copy.js";
import type { IconName, SelectionContext } from "./deps.js";
import type { PropLayer, PropTarget } from "./prop-model.js";

interface PropHostOptions {
  readonly busy: boolean;
  readonly directionId: string | null;
  readonly enabled: boolean;
  readonly isReact: boolean;
  readonly notify: (message: string) => void;
  readonly projectId: string;
}

interface PropMenuItem {
  readonly disabled?: string;
  readonly icon: IconName;
  readonly id: string;
  readonly label: string;
  readonly run: () => void;
}

interface Opened {
  readonly layer: PropLayer;
  readonly target: PropTarget;
}

interface PropHost {
  readonly close: () => void;
  readonly items: (target: SelectionContext) => PropMenuItem[];
  readonly opened: Opened | null;
}

const toBlocker = (
  options: PropHostOptions,
  target: SelectionContext
): string | null => {
  if (!target.source) {
    return copy.needSource;
  }

  if (!target.owners?.length) {
    return copy.needComponent;
  }

  if (options.busy) {
    return copy.wait;
  }

  return null;
};

const toOpened = (
  options: PropHostOptions,
  target: SelectionContext
): Opened | null => {
  const owner = target.owners?.[0];
  const { directionId } = options;

  if (!target.source || !owner || directionId === null) {
    return null;
  }

  const { col, file, line } = target.source;
  const { projectId } = options;
  const layer = { col, line, tag: target.tag };
  const propTarget = { component: owner.name, directionId, file, projectId };

  return { layer, target: propTarget };
};

const usePropHost = (options: PropHostOptions): PropHost => {
  const [opened, setOpened] = useState<Opened | null>(null);
  const { busy, directionId, enabled, isReact, notify, projectId } = options;

  const close = useCallback((): void => setOpened(null), []);

  const items = useCallback(
    (target: SelectionContext): PropMenuItem[] => {
      if (!enabled || directionId === null || !isReact) {
        return [];
      }

      const current = {
        busy,
        directionId,
        enabled,
        isReact,
        notify,
        projectId,
      };

      const blocked = toBlocker(current, target);

      const run = (): void => {
        const next = toOpened(current, target);

        if (next === null) {
          notify(copy.needComponent);

          return;
        }

        setOpened(next);
      };

      const item: PropMenuItem = {
        icon: "component",
        id: "make-prop",
        label: copy.menu,
        run,
      };

      if (blocked !== null) {
        return [{ ...item, disabled: blocked }];
      }

      return [item];
    },
    [busy, directionId, enabled, isReact, notify, projectId]
  );

  return useMemo(() => ({ close, items, opened }), [close, items, opened]);
};

export { usePropHost };

export type { Opened, PropHost, PropHostOptions, PropMenuItem };

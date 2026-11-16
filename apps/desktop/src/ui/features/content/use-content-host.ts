import { useCallback, useMemo, useState } from "react";

import { copy } from "./copy.js";
import type { IconName, SelectionContext } from "./deps.js";

interface ContentHostOptions {
  readonly busy: boolean;
  readonly directionId: string | null;
  readonly enabled: boolean;
  readonly projectId: string;
}

interface ContentTarget {
  readonly directionId: string;
  readonly projectId: string;
  readonly target: SelectionContext;
}

interface ContentMenuItem {
  readonly disabled?: string;
  readonly icon: IconName;
  readonly id: string;
  readonly label: string;
  readonly run: () => void;
}

interface ContentHost {
  readonly close: () => void;
  readonly items: (target: SelectionContext) => ContentMenuItem[];
  readonly opened: ContentTarget | null;
}

const toBlocker = (busy: boolean, target: SelectionContext): string | null => {
  if (!target.source) {
    return copy.needSource;
  }

  if (busy) {
    return copy.wait;
  }

  return null;
};

const useContentHost = (options: ContentHostOptions): ContentHost => {
  const [opened, setOpened] = useState<ContentTarget | null>(null);
  const { busy, directionId, enabled, projectId } = options;

  const close = useCallback((): void => setOpened(null), []);

  const items = useCallback(
    (target: SelectionContext): ContentMenuItem[] => {
      if (!enabled || directionId === null) {
        return [];
      }

      const item: ContentMenuItem = {
        icon: "type",
        id: "sample-content",
        label: copy.menu,
        run: (): void => setOpened({ directionId, projectId, target }),
      };

      const blocked = toBlocker(busy, target);

      if (blocked !== null) {
        return [{ ...item, disabled: blocked }];
      }

      return [item];
    },
    [busy, directionId, enabled, projectId]
  );

  return useMemo(() => ({ close, items, opened }), [close, items, opened]);
};

export { useContentHost };

export type { ContentHost, ContentHostOptions, ContentMenuItem, ContentTarget };

import { useCallback, useMemo, useState } from "react";

import { copy } from "./copy.js";
import { useLive } from "./deps.js";
import type { IconName, KeyId, SelectionContext } from "./deps.js";
import {
  copiedStyleStore,
  toLayerId,
  toPasteBlocker,
} from "./layer-style-model.js";
import type { CopiedStyle, StyleGroup } from "./layer-style-model.js";
import { useLayerStyleApply } from "./use-layer-style-apply.js";

interface LayerStyleHostOptions {
  readonly busy: boolean;
  readonly directionId: string | null;
  readonly enabled: boolean;
  readonly notify: (message: string) => void;
  readonly projectId: string;
  readonly selection: SelectionContext[];
  readonly variant: string;
}

interface LayerStyleMenuItem {
  readonly disabled?: string;
  readonly icon: IconName;
  readonly id: string;
  readonly keyId?: KeyId;
  readonly label: string;
  readonly run: () => void;
}

interface LayerStyleHost {
  readonly apply: (groups: readonly StyleGroup[] | null) => void;
  readonly close: () => void;
  readonly isPending: boolean;
  readonly items: (target: SelectionContext) => LayerStyleMenuItem[];
  readonly opened: boolean;
}

interface BlockerInput {
  readonly busy: boolean;
  readonly copied: CopiedStyle | null;
  readonly directionId: string;
  readonly projectId: string;
  readonly selection: SelectionContext[];
}

interface DisabledReason {
  disabled?: string;
}

const toDisabledBy = (reason: string | null): DisabledReason => {
  if (reason === null) {
    return {};
  }

  return { disabled: reason };
};

const toBlocker = (input: BlockerInput): string | null => {
  const blocked = toPasteBlocker(input.copied, {
    directionId: input.directionId,
    projectId: input.projectId,
  });

  if (blocked !== null) {
    return blocked;
  }

  if (input.selection.some((item) => toLayerId(item) === null)) {
    return copy.needSource;
  }

  if (input.busy) {
    return copy.wait;
  }

  return null;
};

const toCopyReason = (layerId: string | null): string | null => {
  if (layerId === null) {
    return copy.needSource;
  }

  return null;
};

const toCopyItem = (
  target: SelectionContext,
  scope: { readonly directionId: string; readonly projectId: string },
  notify: (message: string) => void
): LayerStyleMenuItem => {
  const id = toLayerId(target);

  const run = (): void => {
    if (id === null) {
      return;
    }

    copiedStyleStore.set({
      directionId: scope.directionId,
      label: target.tag,
      layerId: id,
      projectId: scope.projectId,
    });

    notify(copy.copied(target.tag));
  };

  return {
    icon: "copy",
    id: "copy-style",
    keyId: "copy-style",
    label: copy.copy,
    run,
    ...toDisabledBy(toCopyReason(id)),
  };
};

const useLayerStyleHost = (options: LayerStyleHostOptions): LayerStyleHost => {
  const [opened, setOpened] = useState(false);
  const copied = useLive(copiedStyleStore);

  const { busy, directionId, enabled, notify, projectId, selection, variant } =
    options;

  const close = useCallback((): void => setOpened(false), []);
  const open = useCallback((): void => setOpened(true), []);

  const { apply, isPending } = useLayerStyleApply({
    close,
    directionId,
    notify,
    projectId,
    selection,
    variant,
  });

  const items = useCallback(
    (target: SelectionContext): LayerStyleMenuItem[] => {
      if (!enabled || directionId === null) {
        return [];
      }

      const scope = { directionId, projectId };

      const pasteItem: LayerStyleMenuItem = {
        icon: "copy",
        id: "paste-style",
        label: copy.paste,
        run: (): void => apply(null),
        ...toDisabledBy(toBlocker({ busy, copied, selection, ...scope })),
      };

      return [
        toCopyItem(target, scope, notify),
        { ...pasteItem, keyId: "paste-style" },
        {
          ...pasteItem,
          id: "paste-style-some",
          label: copy.pasteSome,
          run: open,
        },
      ];
    },
    [
      apply,
      busy,
      copied,
      directionId,
      enabled,
      notify,
      open,
      projectId,
      selection,
    ]
  );

  return useMemo(
    () => ({ apply, close, isPending, items, opened }),
    [apply, close, isPending, items, opened]
  );
};

export { useLayerStyleHost };

export type { LayerStyleHost, LayerStyleHostOptions, LayerStyleMenuItem };

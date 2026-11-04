import { useCallback, useEffect, useMemo, useState } from "react";

import {
  copy,
  EDIT_GROUP,
  INSERT_ICON_COMMAND,
  SWAP_ICON_COMMAND,
} from "./copy.js";
import { IS_MAC, isTypingTarget, matchesKey, useCommands } from "./deps.js";
import type { Command, PreviewMenuItem, SelectionContext } from "./deps.js";
import { isIconLayer } from "./icon-target.js";
import type { IconMode } from "./icon-target.js";

interface IconHostOptions {
  readonly busy: boolean;
  readonly directionId: string | null;
  readonly enabled: boolean;
  readonly notify: (message: string) => void;
  readonly projectId: string;
  readonly selection: readonly SelectionContext[];
}

interface Opened {
  readonly mode: IconMode;
  readonly target: SelectionContext;
}

interface IconHost {
  readonly close: () => void;
  readonly items: (target: SelectionContext) => PreviewMenuItem[];
  readonly opened: Opened | null;
}

type Open = (mode: IconMode) => void;

type Disabled = Pick<Command, "disabled">;

const INSERT_KEY = "insert-icon";

const MODAL = '[role="dialog"][aria-modal="true"], dialog[open]';

const blockerOf = (
  options: IconHostOptions,
  target: SelectionContext | undefined
): string | null => {
  if (!target) {
    return copy.needSelection;
  }

  if (!target.source && !target.owners?.length) {
    return copy.noSource;
  }

  if (options.busy) {
    return copy.wait;
  }

  return null;
};

const disabledBy = (reason: string | null): Disabled => {
  if (reason) {
    return { disabled: reason };
  }

  return {};
};

const isLive = (options: IconHostOptions): boolean =>
  options.enabled && options.directionId !== null;

const swapCommand = (open: Open, blocked: string | null): Command => ({
  group: EDIT_GROUP,
  icon: "restore",
  id: SWAP_ICON_COMMAND,
  keywords: "icon svg replace",
  run: (): void => open("swap"),
  title: copy.swap,
  ...disabledBy(blocked),
});

const iconCommands = (options: IconHostOptions, open: Open): Command[] => {
  if (!isLive(options)) {
    return [];
  }

  const target = options.selection.at(-1);
  const blocked = blockerOf(options, target);

  const insert: Command = {
    group: EDIT_GROUP,
    icon: "plus",
    id: INSERT_ICON_COMMAND,
    keyId: INSERT_KEY,
    keywords: "icon svg lucide glyph",
    run: (): void => open("insert"),
    title: copy.insert,
    ...disabledBy(blocked),
  };

  if (target && isIconLayer(target)) {
    return [insert, swapCommand(open, blocked)];
  }

  return [insert];
};

const menuItems = (
  options: IconHostOptions,
  open: Open,
  target: SelectionContext
): PreviewMenuItem[] => {
  if (!isLive(options)) {
    return [];
  }

  const blocked = blockerOf(options, target);

  const insert: PreviewMenuItem = {
    icon: "plus",
    id: INSERT_KEY,
    keyId: INSERT_KEY,
    label: copy.insertMenu,
    run: (): void => open("insert"),
    ...disabledBy(blocked),
  };

  if (!isIconLayer(target)) {
    return [insert];
  }

  const swap: PreviewMenuItem = {
    icon: "restore",
    id: "swap-icon",
    label: copy.swapMenu,
    run: (): void => open("swap"),
    ...disabledBy(blocked),
  };

  return [insert, swap];
};

const skipKey = (event: KeyboardEvent): boolean =>
  event.defaultPrevented ||
  event.repeat ||
  isTypingTarget(event.target) ||
  document.querySelector(MODAL) !== null;

const useIconKey = (options: IconHostOptions, open: Open): void => {
  const live = isLive(options);

  useEffect(() => {
    if (!live) {
      return;
    }

    const handleKey = (event: KeyboardEvent): void => {
      if (skipKey(event) || !matchesKey(INSERT_KEY, event, IS_MAC)) {
        return;
      }

      event.preventDefault();
      open("insert");
    };

    globalThis.addEventListener("keydown", handleKey);

    return (): void => {
      globalThis.removeEventListener("keydown", handleKey);
    };
  }, [live, open]);
};

const useIconHost = (options: IconHostOptions): IconHost => {
  const [opened, setOpened] = useState<Opened | null>(null);
  const { busy, directionId, enabled, notify, projectId, selection } = options;

  const open = useCallback(
    (mode: IconMode): void => {
      const target = selection.at(-1);

      const blocked = blockerOf(
        { busy, directionId, enabled, notify, projectId, selection },
        target
      );

      if (blocked || !target) {
        notify(blocked ?? copy.needSelection);

        return;
      }

      setOpened({ mode, target });
    },
    [busy, directionId, enabled, notify, projectId, selection]
  );

  const close = useCallback((): void => {
    setOpened(null);
  }, []);

  useCommands(() => iconCommands(options, open));
  useIconKey(options, open);

  const items = useCallback(
    (target: SelectionContext): PreviewMenuItem[] =>
      menuItems(
        { busy, directionId, enabled, notify, projectId, selection },
        open,
        target
      ),
    [busy, directionId, enabled, notify, open, projectId, selection]
  );

  return useMemo(() => ({ close, items, opened }), [close, items, opened]);
};

export { useIconHost };

export type { IconHost, IconHostOptions, Opened };

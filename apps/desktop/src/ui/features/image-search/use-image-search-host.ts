import { useCallback, useMemo, useState } from "react";

import { copy, EDIT_GROUP, FIND_PHOTO_COMMAND } from "./copy.js";
import { useCommands } from "./deps.js";
import type { Command, PreviewMenuItem, SelectionContext } from "./deps.js";

interface ImageSearchHostOptions {
  readonly busy: boolean;
  readonly directionId: string | null;
  readonly enabled: boolean;
  readonly notify: (message: string) => void;
  readonly projectId: string;
  readonly selection: readonly SelectionContext[];
}

interface ImageSearchHost {
  readonly close: () => void;
  readonly items: (target: SelectionContext) => PreviewMenuItem[];
  readonly opened: SelectionContext | null;
}

const blockerOf = (
  options: ImageSearchHostOptions,
  target: SelectionContext | null
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

const isLive = (options: ImageSearchHostOptions): boolean =>
  options.enabled && options.directionId !== null;

const disabledBy = (reason: string | null): Pick<Command, "disabled"> => {
  if (reason) {
    return { disabled: reason };
  }

  return {};
};

const findCommand = (
  options: ImageSearchHostOptions,
  open: () => void
): Command[] => {
  if (!isLive(options)) {
    return [];
  }

  const blocked = blockerOf(options, options.selection.at(-1) ?? null);

  return [
    {
      group: EDIT_GROUP,
      icon: "image",
      id: FIND_PHOTO_COMMAND,
      keywords: "photo image stock picture openverse search",
      run: open,
      title: copy.find,
      ...disabledBy(blocked),
    },
  ];
};

const useImageSearchHost = (
  options: ImageSearchHostOptions
): ImageSearchHost => {
  const [opened, setOpened] = useState<SelectionContext | null>(null);
  const { busy, directionId, enabled, notify, projectId, selection } = options;

  const open = useCallback((): void => {
    const target = selection.at(-1) ?? null;

    const blocked = blockerOf(
      { busy, directionId, enabled, notify, projectId, selection },
      target
    );

    if (blocked || !target) {
      notify(blocked ?? copy.needSelection);

      return;
    }

    setOpened(target);
  }, [busy, directionId, enabled, notify, projectId, selection]);

  const close = useCallback((): void => {
    setOpened(null);
  }, []);

  useCommands(() => findCommand(options, open));

  const items = useCallback(
    (target: SelectionContext): PreviewMenuItem[] => {
      if (!enabled || directionId === null) {
        return [];
      }

      const blocked = blockerOf(
        { busy, directionId, enabled, notify, projectId, selection },
        target
      );

      return [
        {
          icon: "image",
          id: "find-photo",
          label: copy.findMenu,
          run: open,
          ...disabledBy(blocked),
        },
      ];
    },
    [busy, directionId, enabled, notify, open, projectId, selection]
  );

  return useMemo(() => ({ close, items, opened }), [close, items, opened]);
};

export { useImageSearchHost };

export type { ImageSearchHost, ImageSearchHostOptions };

import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useRef } from "react";
import type { RefObject } from "react";

import {
  isPictureCount,
  toggleSelectionPicture,
  useSelectionPicture,
} from "../../platform/selection-picture.js";
import { ITEM_FOCUS } from "./composer-menu-model.js";
import type { UsePlacedPopoverResult } from "./composer-menu-model.js";
import { toFocusPath } from "./run-focus-model.js";
import { useFocusOnOpen } from "./use-focus-on-open.js";
import { usePlacedPopover } from "./use-placed-popover.js";
import type { RunFocus } from "./use-run-focus.js";

interface SelectionChipMenu {
  readonly filePath: string | null;
  readonly hasPicture: boolean;
  readonly isFileOnly: boolean;
  readonly isPictureOn: boolean;
  readonly menu: UsePlacedPopoverResult;
  readonly onFileOnly: () => void;
  readonly onPicture: () => void;
  readonly panel: RefObject<HTMLDivElement | null>;
  readonly trigger: RefObject<HTMLButtonElement | null>;
}

const toFilePath = (selected: SelectionContext): string | null => {
  if (selected.source === null) {
    return null;
  }

  return toFocusPath(selected.source.file);
};

const useSelectionChipMenu = (
  selected: SelectionContext,
  count: number,
  focus: RunFocus
): SelectionChipMenu => {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const menu = usePlacedPopover(trigger, panel);
  const isPictureOn = useSelectionPicture(count);
  const filePath = toFilePath(selected);
  const { add, paths, remove } = focus;
  const isFileOnly = filePath !== null && paths.includes(filePath);
  const { close } = menu;
  const hasPicture = isPictureCount(count);
  useFocusOnOpen(menu.open, panel, ITEM_FOCUS);

  const onFileOnly = useCallback((): void => {
    close(true);

    if (filePath === null) {
      return;
    }

    if (isFileOnly) {
      remove(filePath);

      return;
    }

    add(filePath);
  }, [add, close, filePath, isFileOnly, remove]);

  const onPicture = useCallback((): void => {
    close(true);
    toggleSelectionPicture();
  }, [close]);

  return {
    filePath,
    hasPicture,
    isFileOnly,
    isPictureOn,
    menu,
    onFileOnly,
    onPicture,
    panel,
    trigger,
  };
};

export { useSelectionChipMenu };

export type { SelectionChipMenu };

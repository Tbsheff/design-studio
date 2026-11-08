import { usePopover } from "@design-studio/ui";
import { useCallback, useLayoutEffect, useState } from "react";
import type { CSSProperties, RefObject } from "react";

import { pick } from "../../platform/pick.js";
import type { UsePlacedPopoverResult } from "./composer-menu-model.js";
import { UNPLACED, placeAboveOrBelow } from "./run-settings-model.js";
import { usePresence } from "./use-presence.js";

const usePlacement = (
  open: boolean,
  trigger: RefObject<HTMLButtonElement | null>,
  panel: RefObject<HTMLElement | null>,
  setStyle: (style: CSSProperties) => void
): void => {
  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const place = (): void => {
      if (trigger.current && panel.current) {
        setStyle(placeAboveOrBelow(trigger.current, panel.current));
      }
    };

    place();
    const observer = new ResizeObserver(place);
    observer.observe(document.documentElement);

    if (panel.current) {
      observer.observe(panel.current);
    }

    return (): void => observer.disconnect();
  }, [open, trigger, panel, setStyle]);
};

const usePlacedPopover = (
  trigger: RefObject<HTMLButtonElement | null>,
  panel: RefObject<HTMLElement | null>
): UsePlacedPopoverResult => {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>(UNPLACED);
  const presence = usePresence(pick(open, true, null));

  const close = useCallback(
    (refocus: boolean) => {
      setOpen(false);

      if (refocus) {
        trigger.current?.focus();
      }
    },
    [trigger]
  );

  usePopover(open, panel, close, trigger);
  usePlacement(open, trigger, panel, setStyle);

  const toggle = useCallback((): void => {
    if (open) {
      close(false);

      return;
    }

    setStyle(UNPLACED);
    setOpen(true);
  }, [open, close]);

  const { closing } = presence;
  const shown = presence.shown !== null;

  return { close, closing, open, shown, style, toggle };
};

export { usePlacedPopover };

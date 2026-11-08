import { usePopover } from "@design-studio/ui";
import { useCallback, useLayoutEffect, useState } from "react";
import type { CSSProperties, KeyboardEvent, RefObject } from "react";

import {
  UNPLACED,
  placeAboveOrBelow,
  toTabStops,
} from "./run-settings-model.js";

interface UseRunSettingsPopoverResult {
  readonly open: boolean;
  readonly placement: CSSProperties;
  readonly onPanelKey: (event: KeyboardEvent) => void;
  readonly onToggle: () => void;
}

const usePlacement = (
  open: boolean,
  trigger: RefObject<HTMLButtonElement | null>,
  panel: RefObject<HTMLDialogElement | null>,
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

    if (panel.current) {
      toTabStops(panel.current)[0]?.focus();
    }

    const observer = new ResizeObserver(place);
    observer.observe(document.documentElement);

    if (panel.current) {
      observer.observe(panel.current);
    }

    if (trigger.current) {
      observer.observe(trigger.current);
    }

    return (): void => observer.disconnect();
  }, [open, trigger, panel, setStyle]);
};

const useRunSettingsPopover = (
  trigger: RefObject<HTMLButtonElement | null>,
  panel: RefObject<HTMLDialogElement | null>,
  onOpen: (() => void) | null
): UseRunSettingsPopoverResult => {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<CSSProperties>(UNPLACED);

  const close = useCallback(
    (refocus: boolean) => {
      setOpen(false);
      setPlacement(UNPLACED);

      if (refocus) {
        trigger.current?.focus();
      }
    },
    [trigger]
  );

  usePopover(open, panel, close, trigger);
  usePlacement(open, trigger, panel, setPlacement);

  const onPanelKey = useCallback(
    (event: KeyboardEvent): void => {
      if (event.key !== "Tab" || !panel.current) {
        return;
      }

      const stops = toTabStops(panel.current);

      const isLeavingStart =
        event.shiftKey && document.activeElement === stops[0];

      const isLeavingEnd =
        !event.shiftKey && document.activeElement === stops.at(-1);

      if (isLeavingStart || isLeavingEnd) {
        event.preventDefault();
        close(true);
      }
    },
    [close, panel]
  );

  const onToggle = useCallback((): void => {
    if (open) {
      close(false);

      return;
    }

    onOpen?.();
    setOpen(true);
  }, [open, close, onOpen]);

  return { onPanelKey, onToggle, open, placement };
};

export { useRunSettingsPopover };

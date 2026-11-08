import { usePopover } from "@design-studio/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";

import type { Panel } from "./frame-state-ui-model.js";
import { toMenuItems } from "./menu-items-model.js";

interface PanelMenu {
  readonly close: (refocus: boolean) => void;
  readonly open: boolean;
  readonly panel: Panel;
  readonly root: RefObject<HTMLDivElement | null>;
  readonly setOpen: Dispatch<SetStateAction<boolean>>;
  readonly setPanel: Dispatch<SetStateAction<Panel>>;
  readonly trigger: RefObject<HTMLButtonElement | null>;
}

const usePanelMenu = (): PanelMenu => {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("list");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    setPanel("list");

    if (refocus) {
      trigger.current?.focus();
    }
  }, []);

  usePopover(open, root, close);

  useEffect(() => {
    if (open && panel === "list" && root.current) {
      const checked = toMenuItems(root.current).find(
        (item) => item.getAttribute("aria-checked") === "true"
      );

      checked?.focus();
    }
  }, [open, panel]);

  return { close, open, panel, root, setOpen, setPanel, trigger };
};

export { usePanelMenu };

export type { PanelMenu };

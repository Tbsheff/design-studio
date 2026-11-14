import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import type { KeyboardEvent, ReactElement } from "react";
import { useCallback, useEffect } from "react";

import { openPortDialog, portAvailable } from "../design-system/port-api.js";
import { menuKeys, toRootMenuItems, useMenu } from "./frame-menu-model.js";
import { FrameMenuRows } from "./frame-menu-rows.js";
import { useFrameMenuRows } from "./use-frame-menu-rows.js";
import { useMenuFit } from "./use-menu-fit.js";
import { usePortEntry } from "./use-port-entry.js";
import { stop } from "./variation-model.js";

interface FrameMenuItem {
  id: string;
  label: string;
  icon: IconName;
  disabled?: string;
  run: () => void;
}

const FrameMoreMenu = ({
  name,
  items: own,
  path,
}: {
  name: string;
  items: FrameMenuItem[];
  path: string | null;
}): ReactElement | null => {
  const menu = useMenu();
  const fitMenu = useMenuFit("root", null);
  const { close, root, setOpen, trigger } = menu;
  const toggle = useCallback(() => setOpen((value) => !value), [setOpen]);

  const portEntry = usePortEntry(root, openPortDialog);
  let port: FrameMenuItem | null = null;

  if (menu.open && portAvailable()) {
    port = portEntry;
  }

  const rows = useFrameMenuRows({ own, path, port, root });

  const handleKeys = useCallback(
    (event: KeyboardEvent<HTMLElement>): void => menuKeys(event, close),
    [close]
  );

  useEffect(() => {
    if (menu.open && root.current) {
      toRootMenuItems(root.current)[0]?.focus();
    }
  }, [menu.open, root]);

  let datatip = "More frame actions";

  if (menu.open) {
    datatip = "";
  }

  return (
    <div className="frame-menu-root" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="frame-chip more"
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-label={`More actions for ${name}`}
        onPointerDown={stop}
        onClick={toggle}
        data-tip={datatip || null}
      >
        <Icon name="more" size={14} />
      </button>
      {menu.open && (
        <div
          ref={fitMenu}
          className="ui-menu project-menu canvas-menu frame-menu"
          role="menu"
          tabIndex={-1}
          aria-label={`${name} actions`}
          onKeyDown={handleKeys}
        >
          <FrameMenuRows rows={rows} close={close} />
        </div>
      )}
    </div>
  );
};

export { FrameMoreMenu };

export type { FrameMenuItem };

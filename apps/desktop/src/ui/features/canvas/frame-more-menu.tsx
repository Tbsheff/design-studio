import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import type { KeyboardEvent, ReactElement } from "react";
import { useCallback, useEffect } from "react";

import { openPortDialog, portAvailable } from "../design-system/port-api.js";
import { FrameMenuItemButton } from "./frame-menu-item.js";
import {
  menuKeys,
  useCopyPngEntry,
  useMenu,
  useRedesignEntry,
  useScreenEntry,
  useTidyEntry,
} from "./frame-menu-model.js";
import { toMenuItems } from "./menu-items-model.js";
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
  const { close, root, setOpen, trigger } = menu;
  const toggle = useCallback(() => setOpen((value) => !value), [setOpen]);

  const portEntry = usePortEntry(root, openPortDialog);
  const screenEntry = useScreenEntry(root);
  const copyPngEntry = useCopyPngEntry(root);
  const redesignEntry = useRedesignEntry(path);
  const tidyEntry = useTidyEntry(root);

  const handleKeys = useCallback(
    (event: KeyboardEvent<HTMLElement>): void => menuKeys(event, close),
    [close]
  );

  useEffect(() => {
    if (menu.open && root.current) {
      toMenuItems(root.current)[0]?.focus();
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
          className="ui-menu project-menu canvas-menu frame-menu"
          role="menu"
          tabIndex={-1}
          aria-label={`${name} actions`}
          onKeyDown={handleKeys}
        >
          {menu.open && portAvailable() && (
            <FrameMenuItemButton entry={portEntry} close={close} />
          )}
          {redesignEntry && (
            <FrameMenuItemButton entry={redesignEntry} close={close} />
          )}
          <FrameMenuItemButton entry={screenEntry} close={close} />
          <FrameMenuItemButton entry={copyPngEntry} close={close} />
          <FrameMenuItemButton entry={tidyEntry} close={close} />
          {own.map((item) => (
            <FrameMenuItemButton key={item.id} entry={item} close={close} />
          ))}
        </div>
      )}
    </div>
  );
};

export { FrameMoreMenu };

export type { FrameMenuItem };

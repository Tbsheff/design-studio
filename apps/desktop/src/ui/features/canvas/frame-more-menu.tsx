import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import type { KeyboardEvent, ReactElement } from "react";
import { useCallback, useEffect } from "react";

import { openPortDialog, portAvailable } from "../design-system/port-api.js";
import { FrameMenuItemButton } from "./frame-menu-item.js";
import { menuKeys, useMenu } from "./frame-menu-model.js";
import { toMenuItems } from "./menu-items-model.js";
import { stop } from "./variation-controls.js";

interface FrameMenuItem {
  id: string;
  label: string;
  icon: IconName;
  disabled?: string;
  run: () => void;
}

const portItem = (root: HTMLElement | null): FrameMenuItem[] => {
  if (!portAvailable()) {
    return [];
  }

  const frame = root?.closest<HTMLElement>("[data-frame-id]") ?? null;

  const run = (): void =>
    openPortDialog({
      directionId: frame?.dataset.directionId ?? null,
      frameId: frame?.dataset.frameId ?? null,
    });

  return [{ icon: "react", id: "port-to-app", label: "Move to app…", run }];
};

const FrameMoreMenu = ({
  name,
  items: own,
}: {
  name: string;
  items: FrameMenuItem[];
}): ReactElement | null => {
  const menu = useMenu();
  const { close, root, setOpen } = menu;
  const toggle = useCallback(() => setOpen((value) => !value), [setOpen]);

  const handleKeys = useCallback(
    (event: KeyboardEvent<HTMLElement>): void => menuKeys(event, close),
    [close]
  );

  useEffect(() => {
    if (menu.open && root.current) {
      toMenuItems(root.current)[0]?.focus();
    }
  }, [menu.open, root]);

  let items: FrameMenuItem[] = own;

  if (menu.open) {
    items = [...portItem(root.current), ...own];
  }

  if (items.length === 0 && !portAvailable()) {
    return null;
  }

  let datatip = "More frame actions";

  if (menu.open) {
    datatip = "";
  }

  return (
    <div className="frame-menu-root" ref={root}>
      <button
        ref={menu.trigger}
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
          {items.map((item) => (
            <FrameMenuItemButton key={item.id} entry={item} close={close} />
          ))}
        </div>
      )}
    </div>
  );
};

export { FrameMoreMenu };

export type { FrameMenuItem };

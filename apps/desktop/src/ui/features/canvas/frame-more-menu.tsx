import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useEffect } from "react";

import { openPortDialog, portAvailable } from "../design-system/port-api.js";
import { menuKeys, useMenu } from "./frame-resize-handles.js";
import { stop } from "./variation-model.js";

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
  useEffect(() => {
    if (menu.open) {
      menu.root.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
        ?.focus();
    }
  }, [menu.open, menu.root]);

  let items: FrameMenuItem[] = own;

  if (menu.open) {
    items = [...portItem(menu.root.current), ...own];
  }

  if (items.length === 0 && !portAvailable()) {
    return null;
  }

  const datatip: "More frame actions" | undefined = (():
    | "More frame actions"
    | undefined => {
    if (menu.open) {
      return undefined;
    }

    return "More frame actions";
  })();

  return (
    <div className="frame-menu-root" ref={menu.root}>
      <button
        ref={menu.trigger}
        type="button"
        className="frame-chip more"
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-label={`More actions for ${name}`}
        onPointerDown={stop}
        onClick={() => menu.setOpen((value) => !value)}
        data-tip={datatip}
      >
        <Icon name="more" size={14} />
      </button>
      {menu.open && (
        <div
          className="ui-menu project-menu canvas-menu frame-menu"
          role="menu"
          aria-label={`${name} actions`}
          onKeyDown={(event) => menuKeys(event, menu.close)}
        >
          {items.map((item) => {
            let part: "" | " has-hint" = "";

            if (item.disabled) {
              part = " has-hint";
            }

            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={`ui-menu-item${part}`}
                tabIndex={-1}
                disabled={Boolean(item.disabled)}
                onClick={() => {
                  menu.close(true);
                  item.run();
                }}
              >
                <Icon name={item.icon} size={14} />
                <span>{item.label}</span>
                {item.disabled && (
                  <span className="ui-menu-hint">{item.disabled}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export { FrameMoreMenu };

export type { FrameMenuItem };

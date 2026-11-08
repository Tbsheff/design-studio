import { Icon, usePopover } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import { useCallback, useRef } from "react";
import type { KeyboardEvent, MouseEvent, RefObject, ReactElement } from "react";

import { moveMenuFocus, toFocusableIds } from "./menu-focus.js";
import { useMenuItemRefs } from "./use-menu-item-refs.js";
import type { MenuItemRefs } from "./use-menu-item-refs.js";

type CanvasTool = "select" | "comment" | "edit" | "prototype" | null;

type PresentMode = "window" | "fullscreen" | "new-window" | "play";

interface MenuEntry {
  id: string;
  label: string;
  icon?: IconName;
  meta?: string;
  checked?: boolean;
  disabled?: boolean;
  tip?: string;
  run: () => void;
}

interface MenuGroup {
  label?: string;
  items: MenuEntry[];
  note?: string;
  fold?: "wide" | "narrow" | "tight";
}

interface MenuPopoverProps {
  readonly groups: MenuGroup[];
  readonly label: string;
  readonly align: "start" | "end";
  readonly onClose: (refocus: boolean) => void;
  readonly trigger: RefObject<HTMLButtonElement | null>;
}

const toVisibleGroups = (groups: MenuGroup[]): MenuGroup[] => {
  const visible: MenuGroup[] = [];

  for (const group of groups) {
    if (group.items.length > 0 || group.note) {
      visible.push(group);
    }
  }

  return visible;
};

const toGroupKey = (group: MenuGroup): string =>
  group.label ?? group.items[0]?.id ?? group.note ?? "";

const toItemRole = (item: MenuEntry): "menuitem" | "menuitemradio" => {
  if (item.checked === true || item.checked === false) {
    return "menuitemradio";
  }

  return "menuitem";
};

const toItemNode = (
  item: MenuEntry,
  bind: MenuItemRefs["bind"],
  onPick: (event: MouseEvent<HTMLButtonElement>) => void
): ReactElement => (
  <button
    key={item.id}
    ref={bind(item.id)}
    type="button"
    role={toItemRole(item)}
    aria-checked={item.checked}
    className="ui-menu-item"
    disabled={item.disabled}
    data-item-id={item.id}
    data-tip={item.tip}
    data-tip-align="start"
    onClick={onPick}
  >
    {item.icon && <Icon name={item.icon} size={14} />}
    <span className="truncate">{item.label}</span>
    {item.meta && <span className="ui-menu-meta">{item.meta}</span>}
  </button>
);

const toSectionNode = (
  group: MenuGroup,
  bind: MenuItemRefs["bind"],
  onPick: (event: MouseEvent<HTMLButtonElement>) => void
): ReactElement => (
  <div
    key={toGroupKey(group)}
    className="ui-menu-section"
    data-fold={group.fold}
  >
    {group.label && <div className="ui-menu-label">{group.label}</div>}
    {group.items.map((item) => toItemNode(item, bind, onPick))}
    {group.note && <p className="ui-menu-note">{group.note}</p>}
  </div>
);

const MenuPopover = ({
  groups,
  label,
  align,
  onClose,
  trigger,
}: MenuPopoverProps): ReactElement => {
  const root = useRef<HTMLDivElement>(null);
  const { bind, refs } = useMenuItemRefs();
  usePopover(true, root, onClose, trigger);
  const visible = toVisibleGroups(groups);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void =>
      moveMenuFocus(event, toFocusableIds(visible), refs),
    [visible, refs]
  );

  const onPick = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      const { itemId } = event.currentTarget.dataset;

      for (const group of visible) {
        for (const item of group.items) {
          if (item.id === itemId) {
            onClose(true);
            item.run();
          }
        }
      }
    },
    [visible, onClose]
  );

  return (
    <div
      ref={root}
      className={`ui-menu topbar-menu align-${align}`}
      role="menu"
      tabIndex={-1}
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {visible.map((group) => toSectionNode(group, bind, onPick))}
    </div>
  );
};

export { MenuPopover };

export type { CanvasTool, MenuEntry, MenuGroup, PresentMode };

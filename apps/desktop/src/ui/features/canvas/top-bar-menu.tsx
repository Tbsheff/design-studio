import { useFitPopover, usePopover } from "@design-studio/ui";
import { useCallback, useRef } from "react";
import type { KeyboardEvent, ReactElement, RefObject } from "react";

import type { MenuGroup } from "./top-bar-menu-model.js";
import { MenuSection } from "./top-bar-menu-section.js";

type ItemSet = Set<HTMLButtonElement>;

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
  `${group.label ?? ""}|${group.items.map((entry) => entry.id).join(",")}|${group.note ?? ""}`;

const toFocusable = (registered: ItemSet): HTMLButtonElement[] => {
  const focusable: HTMLButtonElement[] = [];

  for (const node of registered) {
    if (!node.disabled && node.checkVisibility()) {
      focusable.push(node);
    }
  }

  return focusable.toSorted((left, right) => {
    if (
      left.compareDocumentPosition(right) === Node.DOCUMENT_POSITION_FOLLOWING
    ) {
      return -1;
    }

    return 1;
  });
};

const runMenuKey = (
  event: KeyboardEvent<HTMLDivElement>,
  registered: ItemSet
): void => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
    return;
  }

  const items = toFocusable(registered);
  const active = items.find((node) => node === document.activeElement);
  let at = -1;

  if (active) {
    at = items.indexOf(active);
  }

  event.preventDefault();

  let operand: 1 | -1 = -1;

  if (event.key === "ArrowDown") {
    operand = 1;
  }

  items[(at + operand + items.length) % items.length]?.focus();
};

interface MenuPopoverProps {
  groups: MenuGroup[];
  label: string;
  align: "start" | "end";
  onClose: (refocus: boolean) => void;
  trigger: RefObject<HTMLButtonElement | null>;
}

const MenuPopover = ({
  groups,
  label,
  align,
  onClose,
  trigger,
}: MenuPopoverProps): ReactElement => {
  const root = useRef<HTMLDivElement>(null);
  const registered = useRef<ItemSet>(new Set());
  usePopover(true, root, onClose, trigger);
  useFitPopover(root, trigger, true);

  const onRegister = useCallback((node: HTMLButtonElement) => {
    registered.current.add(node);

    return (): void => {
      registered.current.delete(node);
    };
  }, []);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    runMenuKey(event, registered.current);
  }, []);

  return (
    <div
      ref={root}
      className={`ui-menu topbar-menu align-${align}`}
      role="menu"
      tabIndex={-1}
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {toVisibleGroups(groups).map((group) => (
        <MenuSection
          key={toGroupKey(group)}
          group={group}
          onClose={onClose}
          onRegister={onRegister}
        />
      ))}
    </div>
  );
};

export { MenuPopover };

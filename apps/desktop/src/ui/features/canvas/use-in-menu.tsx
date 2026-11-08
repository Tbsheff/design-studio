import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { KeyboardEvent, MouseEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { menuKeys, useMenu } from "./frame-menu-model.js";
import { stop } from "./variation-model.js";
import type { Sibling } from "./variation-model.js";

const USE_IN_TIP = "Use the selected element in another variation";

interface UseInMenuProps {
  readonly siblings: Sibling[];
  readonly isBusy: boolean;
  readonly onPick: (id: string) => void;
}

const toTip = (isOpen: boolean): string | undefined => {
  if (!isOpen) {
    return USE_IN_TIP;
  }
};

const toTriggerLabel = (isBusy: boolean): string => {
  if (isBusy) {
    return "Starting…";
  }

  return "Use in…";
};

type ItemRef = ((element: HTMLButtonElement | null) => void) | null;

const toItemRef = (index: number, focusOnMount: ItemRef): ItemRef => {
  if (index === 0) {
    return focusOnMount;
  }

  return null;
};

const toItemNode = (
  other: Sibling,
  itemRef: ItemRef,
  onItemClick: (event: MouseEvent<HTMLButtonElement>) => void
): ReactElement => (
  <button
    key={other.id}
    ref={itemRef}
    type="button"
    role="menuitem"
    tabIndex={-1}
    data-sibling-id={other.id}
    onClick={onItemClick}
  >
    <span className="badge">{other.label}</span>
    <span>{other.title}</span>
  </button>
);

const UseInMenu = ({
  siblings,
  isBusy,
  onPick,
}: UseInMenuProps): ReactElement => {
  const { close, open, root, setOpen, trigger } = useMenu();

  const focusOnMount = useCallback(
    (element: HTMLButtonElement | null): void => {
      element?.focus();
    },
    []
  );

  const onToggle = useCallback(
    (): void => setOpen((value) => !value),
    [setOpen]
  );

  const onMenuKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>): void => menuKeys(event, close),
    [close]
  );

  const onItemClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      close(true);
      onPick(event.currentTarget.dataset.siblingId ?? "");
    },
    [close, onPick]
  );

  return (
    <div className="frame-menu-root" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="frame-chip strong"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={isBusy}
        onPointerDown={stop}
        onClick={onToggle}
        data-tip={toTip(open)}
      >
        {toTriggerLabel(isBusy)}
        <Icon name="chevronDown" size={12} />
      </button>
      {open && (
        <div
          className="project-menu canvas-menu frame-menu"
          role="menu"
          tabIndex={-1}
          aria-label={copy.inVariation}
          onKeyDown={onMenuKeyDown}
        >
          {siblings.map((other, index) =>
            toItemNode(other, toItemRef(index, focusOnMount), onItemClick)
          )}
        </div>
      )}
    </div>
  );
};

export { UseInMenu };

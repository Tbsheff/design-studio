import { Icon, usePopover } from "@design-studio/ui";
import { useCallback, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { COPY } from "./copy.js";
import { useMenuPlace } from "./use-menu-place.js";
import { VersionMenuItem } from "./version-menu-item.js";
import { runMenuKey, toMoreTip } from "./version-menu-model.js";
import type { MoreItem } from "./version-row-types.js";

const TRIGGER_ICON_SIZE = 15;
const HIDDEN_STYLE = { visibility: "hidden" } as const;

interface VersionMoreMenuProps {
  readonly items: MoreItem[];
  readonly title: string;
}

const VersionMoreMenu = ({ items, title }: VersionMoreMenuProps): ReactNode => {
  const [isOpen, setIsOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const close = useCallback((refocus: boolean): void => {
    setIsOpen(false);

    if (refocus) {
      trigger.current?.focus({ preventScroll: true });
    }
  }, []);

  usePopover(isOpen, root, close);
  useMenuPlace(isOpen, trigger, menu);

  const handleToggleMenu = useCallback((): void => {
    setIsOpen((value) => !value);
  }, []);

  const handleMenuKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      runMenuKey(event, close);
    },
    [close]
  );

  return (
    <div className="version-more" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="icon-btn"
        aria-label={`${COPY.moreActionsPrefix}${title}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        data-tip={toMoreTip(isOpen)}
        data-tip-side="top"
        onClick={handleToggleMenu}
      >
        <Icon name="more" size={TRIGGER_ICON_SIZE} />
      </button>
      {isOpen && (
        <div
          ref={menu}
          className="ui-menu version-menu"
          role="menu"
          tabIndex={-1}
          aria-label={COPY.labelMoreVersionActions}
          style={HIDDEN_STYLE}
          onKeyDown={handleMenuKeyDown}
        >
          {items.map((item) => (
            <VersionMenuItem key={item.id} item={item} onPick={close} />
          ))}
        </div>
      )}
    </div>
  );
};

export { VersionMoreMenu };

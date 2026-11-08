import { useCallback, useRef, useSyncExternalStore } from "react";
import type { KeyboardEvent, ReactElement, RefObject } from "react";

import {
  THEME_OPTIONS,
  subscribeTheme,
  toMenuTarget,
  toThemePref,
} from "./theme-menu-model.js";
import { ThemeOptionButton } from "./theme-option.js";
import { useThemeMenuDismiss } from "./use-theme-menu-dismiss.js";

const ITEM_SELECTOR = '[role="menuitemradio"]';

const toItems = (root: HTMLElement | null): HTMLElement[] => [
  ...(root?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []),
];

const ThemeMenu = ({
  trigger,
  onClose,
}: {
  trigger: RefObject<HTMLButtonElement | null>;
  onClose: (refocus: boolean) => void;
}): ReactElement => {
  const ref = useRef<HTMLDivElement>(null);
  const pref = useSyncExternalStore(subscribeTheme, toThemePref);

  useThemeMenuDismiss(ref, trigger, onClose);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.key === "Escape" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        onClose(event.key === "Escape");

        return;
      }

      const items = toItems(ref.current);

      const index = items.findIndex((item) =>
        item.isSameNode(document.activeElement)
      );

      const next = toMenuTarget(event.key, index, items.length);

      if (next === null) {
        return;
      }

      event.preventDefault();
      items[(next + items.length) % items.length]?.focus();
    },
    [onClose]
  );

  return (
    <div
      tabIndex={0}
      ref={ref}
      className="theme-menu"
      role="menu"
      aria-label="Theme"
      onKeyDown={onKeyDown}
    >
      {THEME_OPTIONS.map((option) => (
        <ThemeOptionButton
          key={option.pref}
          option={option}
          pref={pref}
          onClose={onClose}
        />
      ))}
    </div>
  );
};

export { ThemeMenu };

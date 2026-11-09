import {
  lazy,
  Suspense,
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactElement } from "react";

import { Icon } from "./icon.js";
import { subscribeTheme, toThemeIcon } from "./theme-menu-model.js";

const ThemeMenu = lazy(async () => {
  const loaded = await import("./theme-menu.js");

  return { default: loaded.ThemeMenu };
});

export const ThemeButton = (): ReactElement => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const icon = useSyncExternalStore(subscribeTheme, toThemeIcon);

  const toggle = useCallback(() => setOpen((isOpen) => !isOpen), []);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);

    if (refocus) {
      ref.current?.focus();
    }
  }, []);

  return (
    <span className="theme-anchor">
      <button
        ref={ref}
        type="button"
        className="icon-btn"
        aria-label="Theme"
        data-tip="Theme"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        <Icon name={icon} />
      </button>
      {open && (
        <Suspense fallback={null}>
          <ThemeMenu trigger={ref} onClose={close} />
        </Suspense>
      )}
    </span>
  );
};

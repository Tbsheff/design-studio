import { useCallback, useContext, useEffect, useRef } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { FrameMenuItemButton } from "./frame-menu-item.js";
import type { FrameMenuEntry } from "./frame-menu-item.js";
import { toMenuItems } from "./menu-items-model.js";
import { toNextIndex } from "./preview-menu-model.js";
import { SubmenuContext } from "./submenu-context.js";

interface FrameSubmenuProps {
  readonly close: (refocus: boolean) => void;
  readonly entries: readonly FrameMenuEntry[];
  readonly label: string;
}

const toFocused = (items: readonly HTMLButtonElement[]): number =>
  items.indexOf(document.activeElement as HTMLButtonElement);

const FrameSubmenu = ({
  close,
  entries,
  label,
}: FrameSubmenuProps): ReactElement => {
  const root = useRef<HTMLDivElement>(null);
  const { focusTick, onExit } = useContext(SubmenuContext);

  useEffect(() => {
    if (focusTick > 0 && root.current) {
      toMenuItems(root.current)[0]?.focus({ preventScroll: true });
    }
  }, [focusTick]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopPropagation();
        onExit();

        return;
      }

      const items = toMenuItems(event.currentTarget);
      const next = toNextIndex(event.key, toFocused(items), items.length);

      if (next !== null) {
        event.preventDefault();
        event.stopPropagation();
        items[next]?.focus();
      }
    },
    [onExit]
  );

  return (
    <div
      ref={root}
      className="project-menu preview-submenu frame-submenu"
      role="menu"
      tabIndex={-1}
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {entries.map((entry) => (
        <FrameMenuItemButton key={entry.id} entry={entry} close={close} />
      ))}
    </div>
  );
};

export { FrameSubmenu };

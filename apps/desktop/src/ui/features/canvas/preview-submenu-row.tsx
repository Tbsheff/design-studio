import { Icon } from "@design-studio/ui";
import { useCallback, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import type { PreviewMenuItem } from "./preview-menu-model.js";
import { SubmenuContext } from "./submenu-context.js";

interface PreviewSubmenuRowProps {
  readonly item: PreviewMenuItem;
  readonly bindRef: (id: string) => (element: HTMLButtonElement | null) => void;
}

const PreviewSubmenuRow = ({
  item,
  bindRef,
}: PreviewSubmenuRowProps): ReactElement | null => {
  const parent = useRef<HTMLButtonElement | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const { id, submenu } = item;

  const setParent = useCallback(
    (element: HTMLButtonElement | null): void => {
      parent.current = element;
      bindRef(id)(element);
    },
    [bindRef, id]
  );

  const onKeyDown = useCallback((event: KeyboardEvent): void => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setFocusTick((tick) => tick + 1);
    }
  }, []);

  const onExit = useCallback((): void => parent.current?.focus(), []);
  const context = useMemo(() => ({ focusTick, onExit }), [focusTick, onExit]);

  if (!submenu) {
    return null;
  }

  return (
    <div className="preview-submenu-host">
      <button
        ref={setParent}
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        onKeyDown={onKeyDown}
      >
        <Icon name={item.icon} size={14} />
        <span>{item.label}</span>
        <Icon name="chevronRight" size={12} />
      </button>
      <SubmenuContext value={context}>{submenu}</SubmenuContext>
    </div>
  );
};

export { PreviewSubmenuRow };

import { useCallback, useContext, useEffect, useMemo } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { toNextIndex } from "./preview-menu-model.js";
import type { PreviewMenuItem } from "./preview-menu-model.js";
import { PreviewMenuRow } from "./preview-menu-row.js";
import { SubmenuContext } from "./submenu-context.js";
import { useMenuFit } from "./use-menu-fit.js";
import { useMenuItemRefs } from "./use-menu-item-refs.js";

interface PreviewMoreItemsProps {
  readonly items: readonly PreviewMenuItem[];
  readonly onClose: () => void;
}

const PreviewMoreItems = ({
  items,
  onClose,
}: PreviewMoreItemsProps): ReactElement => {
  const { bind, focusItem, list } = useMenuItemRefs();
  const fitMenu = useMenuFit("submenu", null);
  const { focusTick, onExit } = useContext(SubmenuContext);
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const firstId = ids[0] ?? "";

  useEffect(() => {
    if (focusTick > 0) {
      focusItem(firstId, { preventScroll: true });
    }
  }, [focusTick, focusItem, firstId]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopPropagation();
        onExit();

        return;
      }

      const buttons = list(ids);

      const current = buttons.indexOf(
        document.activeElement as HTMLButtonElement
      );

      const next = toNextIndex(event.key, current, buttons.length);

      if (next !== null) {
        event.preventDefault();
        event.stopPropagation();
        buttons[next]?.focus();
      }
    },
    [ids, list, onExit]
  );

  return (
    <div
      ref={fitMenu}
      className="project-menu preview-submenu"
      role="menu"
      tabIndex={-1}
      aria-label={copy.layerMenuMore}
      onKeyDown={onKeyDown}
    >
      {items.map((item) => (
        <PreviewMenuRow
          key={item.id}
          item={item}
          onClose={onClose}
          bindRef={bind}
        />
      ))}
    </div>
  );
};

export { PreviewMoreItems };

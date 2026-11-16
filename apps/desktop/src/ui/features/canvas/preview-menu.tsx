import { useCallback, useMemo, useRef } from "react";
import type {
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  ReactElement,
} from "react";

import {
  moveItemFocus,
  toMenuStyle,
  toVisibleItems,
} from "./preview-menu-model.js";
import type { MenuPoint, PreviewMenuItem } from "./preview-menu-model.js";
import { PreviewMenuRow } from "./preview-menu-row.js";
import { useMenuItemRefs } from "./use-menu-item-refs.js";
import {
  useMenuDismiss,
  usePreviewMenuPlacement,
} from "./use-preview-menu-placement.js";

interface PreviewMenuProps {
  readonly at: MenuPoint;
  readonly label: string;
  readonly items: PreviewMenuItem[];
  readonly onClose: () => void;
}

const stopContextMenu = (event: MouseEvent<HTMLElement>): void =>
  event.preventDefault();

const stopMenuPointer = (event: PointerEvent<HTMLElement>): void =>
  event.stopPropagation();

const PreviewMenu = ({
  at,
  label,
  items,
  onClose,
}: PreviewMenuProps): ReactElement => {
  const root = useRef<HTMLDivElement>(null);
  const { bind, focusItem, list } = useMenuItemRefs();
  const visible = toVisibleItems(items);
  const firstId = visible[0]?.id ?? "";

  const focusFirst = useCallback((): void => {
    focusItem(firstId, { preventScroll: true });
  }, [focusItem, firstId]);

  const { isScrollable, point } = usePreviewMenuPlacement(root, at, focusFirst);
  useMenuDismiss(root, onClose);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.key === "Escape" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        onClose();

        return;
      }

      moveItemFocus(event, list(visible.map((item) => item.id)));
    },
    [visible, list, onClose]
  );

  const style = useMemo(() => toMenuStyle(point), [point]);

  let scrollClass = "";

  if (isScrollable) {
    scrollClass = " scrolls";
  }

  return (
    <div
      ref={root}
      className={`project-menu at-pointer preview-menu${scrollClass}`}
      role="menu"
      tabIndex={-1}
      aria-label={label}
      style={style}
      onKeyDown={onKeyDown}
      onPointerDown={stopMenuPointer}
      onContextMenu={stopContextMenu}
    >
      {visible.map((item) => (
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

export { PreviewMenu };

export type { PreviewMenuItem };

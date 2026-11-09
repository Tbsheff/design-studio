import type { LayerPick } from "@design-studio/contracts";
import { useCallback, useContext, useEffect, useMemo } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { toPickRows } from "./layer-pick-model.js";
import { LayerPickRowView } from "./layer-pick-row.js";
import { toNextIndex } from "./preview-menu-model.js";
import { SubmenuContext } from "./submenu-context.js";
import type { LayerPickHandle } from "./use-layer-pick.js";
import { useMenuItemRefs } from "./use-menu-item-refs.js";

interface LayerPickItemsProps {
  readonly layers: LayerPick[];
  readonly onClose: () => void;
  readonly pick: LayerPickHandle;
}

const LayerPickItems = ({
  layers,
  onClose,
  pick,
}: LayerPickItemsProps): ReactElement => {
  const { bind, focusItem, list } = useMenuItemRefs();
  const { focusTick, onExit } = useContext(SubmenuContext);
  const { onHover, onPick } = pick;
  const rows = useMemo(() => toPickRows(layers), [layers]);
  const ids = useMemo(() => rows.map((row) => row.id), [rows]);
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
        onHover(null);
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
    [ids, list, onExit, onHover]
  );

  const onRowPick = useCallback(
    (layer: LayerPick): void => {
      onClose();
      onPick(layer);
    },
    [onClose, onPick]
  );

  return (
    <div
      className="project-menu preview-submenu"
      role="menu"
      tabIndex={-1}
      aria-label={copy.selectLayer}
      onKeyDown={onKeyDown}
    >
      {rows.map((row) => (
        <LayerPickRowView
          key={row.id}
          bindRef={bind}
          row={row}
          onHover={onHover}
          onPick={onRowPick}
        />
      ))}
    </div>
  );
};

export { LayerPickItems };

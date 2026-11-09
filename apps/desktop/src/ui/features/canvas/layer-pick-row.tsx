import type { LayerPick } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement } from "react";

import type { LayerPickRow } from "./layer-pick-model.js";

interface LayerPickRowViewProps {
  readonly bindRef: (id: string) => (element: HTMLButtonElement | null) => void;
  readonly onHover: (layer: LayerPick | null) => void;
  readonly onPick: (layer: LayerPick) => void;
  readonly row: LayerPickRow;
}

const LayerPickRowView = ({
  bindRef,
  onHover,
  onPick,
  row,
}: LayerPickRowViewProps): ReactElement => {
  const { layer } = row;
  const onEnter = useCallback((): void => onHover(layer), [onHover, layer]);
  const onLeave = useCallback((): void => onHover(null), [onHover]);
  const onClick = useCallback((): void => onPick(layer), [onPick, layer]);

  return (
    <button
      ref={bindRef(row.id)}
      type="button"
      role="menuitem"
      onClick={onClick}
      onFocus={onEnter}
      onMouseEnter={onEnter}
      onBlur={onLeave}
      onMouseLeave={onLeave}
    >
      <span>{row.label}</span>
      <span className="preview-submenu-tag">{row.detail}</span>
    </button>
  );
};

export { LayerPickRowView };

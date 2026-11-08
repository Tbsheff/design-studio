import type { SelectionContext } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback, useMemo } from "react";
import type { CSSProperties, PointerEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import type { BeginDrag } from "./use-link-drag.js";

const HANDLE_ICON = 10;

interface LinkHandleProps {
  readonly selection: SelectionContext;
  readonly activeId: string;
  readonly onBegin: BeginDrag;
}

const LinkHandle = ({
  selection,
  activeId,
  onBegin,
}: LinkHandleProps): ReactElement => {
  const { rect } = selection;

  const style = useMemo<CSSProperties>(
    () => ({ left: rect.x + rect.width, top: rect.y + rect.height / 2 }),
    [rect.height, rect.width, rect.x, rect.y]
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>): void =>
      onBegin(event, selection, activeId),
    [activeId, onBegin, selection]
  );

  return (
    <div className="link-handle-anchor" style={style}>
      <button
        type="button"
        className="link-handle"
        aria-label={copy.dragToA}
        data-tip={copy.dragToA}
        data-testid="link-handle"
        onPointerDown={handlePointerDown}
      >
        <Icon name="plus" size={HANDLE_ICON} />
      </button>
    </div>
  );
};

export { LinkHandle };

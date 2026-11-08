import type { ReactElement, ReactNode } from "react";
import { useCallback } from "react";

import type { DragHandlers } from "./component-drag-state.js";
import type { Item } from "./components-panel-model.js";
import { toCardTip } from "./components-panel-model.js";

const CardButton = ({
  children,
  handlers,
  item,
  onMention,
}: {
  children: ReactNode;
  handlers: DragHandlers | null;
  item: Item;
  onMention: (component: Item["info"]) => void;
}): ReactElement => {
  const mention = useCallback((): void => {
    onMention(item.info);
  }, [item.info, onMention]);

  return (
    <button
      type="button"
      className="cmp-card"
      aria-label={`Mention ${item.info.name}`}
      data-tip={toCardTip(item)}
      data-testid="component-card"
      onClick={mention}
      onClickCapture={handlers?.onClickCapture}
      onPointerCancel={handlers?.onPointerCancel}
      onPointerDown={handlers?.onPointerDown}
      onPointerMove={handlers?.onPointerMove}
      onPointerUp={handlers?.onPointerUp}
    >
      {children}
    </button>
  );
};

export { CardButton };

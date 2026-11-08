import type { ReactElement, RefObject } from "react";

import { copy } from "./copy.js";
import { useChatSplitter } from "./use-chat-splitter.js";

const ChatSplitter = ({
  columnsRef,
}: {
  columnsRef: RefObject<HTMLDivElement | null>;
}): ReactElement => {
  const {
    onDoubleClick: resetWidth,
    onKeyDown: stepWidth,
    onPointerDown: startDrag,
    onPointerMove: drag,
    onStop: stopDrag,
  } = useChatSplitter(columnsRef);

  return (
    <button
      type="button"
      className="splitter"
      aria-label={copy.resizeChatPanel}
      data-tip={copy.dragToResize}
      onPointerDown={startDrag}
      onPointerMove={drag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onLostPointerCapture={stopDrag}
      onDoubleClick={resetWidth}
      onKeyDown={stepWidth}
    />
  );
};

export { ChatSplitter };

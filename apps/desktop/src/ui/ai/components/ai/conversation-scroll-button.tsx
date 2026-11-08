import { useCallback } from "react";
import type { ReactElement } from "react";

import { useConversationContext } from "./conversation-context";
import { toBottomFlag } from "./conversation-flag";
import type { SlotProps } from "./slot-props";

const ConversationScrollButton = ({
  children,
  className,
}: SlotProps): ReactElement => {
  const { isAtBottom, scrollToBottom, wasAtBottomRef } =
    useConversationContext();

  const jumpToLatest = useCallback(() => {
    wasAtBottomRef.current = true;
    scrollToBottom();
  }, [scrollToBottom, wasAtBottomRef]);

  return (
    <button
      aria-label="Jump to latest"
      className={className}
      data-at-bottom={toBottomFlag(isAtBottom)}
      data-slot="conversation-scroll-button"
      onClick={jumpToLatest}
      type="button"
    >
      {children}
    </button>
  );
};

export { ConversationScrollButton };

import { useCallback } from "react";
import type { RefObject } from "react";

import { useConversationContext } from "./conversation-context";

interface ConversationState {
  readonly isAtBottom: boolean;
  readonly scrollToBottom: (behavior?: ScrollBehavior) => void;
  readonly stickToBottom: () => void;
  readonly viewportRef: RefObject<HTMLDivElement | null>;
  readonly wasAtBottomRef: RefObject<boolean>;
}

const useConversation = (): ConversationState => {
  const { isAtBottom, scrollToBottom, viewportRef, wasAtBottomRef } =
    useConversationContext();

  const stickToBottom = useCallback(() => {
    wasAtBottomRef.current = true;
    scrollToBottom("instant");
  }, [scrollToBottom, wasAtBottomRef]);

  return {
    isAtBottom,
    scrollToBottom,
    stickToBottom,
    viewportRef,
    wasAtBottomRef,
  };
};

export { useConversation };

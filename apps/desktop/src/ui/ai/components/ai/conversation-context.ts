import { createContext, useContext } from "react";
import type { RefObject } from "react";

interface ConversationContextValue {
  readonly isAtBottom: boolean;
  readonly scrollToBottom: (behavior?: ScrollBehavior) => void;
  readonly setIsAtBottom: (value: boolean) => void;
  readonly viewportRef: RefObject<HTMLDivElement | null>;
  readonly wasAtBottomRef: RefObject<boolean>;
}

const ConversationContext = createContext<ConversationContextValue | null>(
  null
);

const useConversationContext = (): ConversationContextValue => {
  const context = useContext(ConversationContext);

  if (!context) {
    throw new Error("Conversation parts must be used inside <Conversation>");
  }

  return context;
};

export { ConversationContext, useConversationContext };

export type { ConversationContextValue };

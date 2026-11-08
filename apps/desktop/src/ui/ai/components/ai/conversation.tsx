import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import { ConversationContext } from "./conversation-context";
import { toBottomFlag } from "./conversation-flag";
import type { SlotProps } from "./slot-props";

interface ConversationProps extends SlotProps {
  readonly "data-ai-scope"?: string;
  readonly "data-searching"?: boolean | null;
}

const Conversation = ({
  children,
  className,
  "data-ai-scope": scope,
  "data-searching": isSearching,
}: ConversationProps): ReactElement => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const wasAtBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    viewport.scrollTo({ behavior, top: viewport.scrollHeight });
  }, []);

  const value = useMemo(
    () => ({
      isAtBottom,
      scrollToBottom,
      setIsAtBottom,
      viewportRef,
      wasAtBottomRef,
    }),
    [isAtBottom, scrollToBottom]
  );

  return (
    <ConversationContext.Provider value={value}>
      <div
        className={cn("relative overflow-hidden", className)}
        data-ai-scope={scope}
        data-at-bottom={toBottomFlag(isAtBottom)}
        data-searching={isSearching}
        data-slot="conversation"
      >
        {children}
      </div>
    </ConversationContext.Provider>
  );
};

export { Conversation };

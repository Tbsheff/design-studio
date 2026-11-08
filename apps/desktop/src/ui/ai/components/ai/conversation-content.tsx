import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import { useConversationContext } from "./conversation-context";
import { toBottomFlag } from "./conversation-flag";
import type { SlotProps } from "./slot-props";
import { useConversationScroll } from "./use-conversation-scroll";

const ConversationContent = ({
  children,
  className,
}: SlotProps): ReactElement => {
  const { isAtBottom } = useConversationContext();
  const { contentRef, handleScroll, viewportRef } = useConversationScroll();

  return (
    <div
      className={cn("overflow-y-auto overscroll-contain size-full", className)}
      data-at-bottom={toBottomFlag(isAtBottom)}
      data-slot="conversation-content"
      onScroll={handleScroll}
      ref={viewportRef}
    >
      <div className="flex flex-col gap-6" ref={contentRef}>
        {children}
      </div>
    </div>
  );
};

export { ConversationContent };

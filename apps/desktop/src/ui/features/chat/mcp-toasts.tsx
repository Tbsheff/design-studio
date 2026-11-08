import { useMemo } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";

import { useTopModal } from "../../platform/top-modal.js";
import { useInlineApprovalProject } from "./approval-spot-model.js";
import { McpToastStack } from "./mcp-toast-stack.js";
import { useApprovalFeed } from "./use-approval-feed.js";

const showOnTop = (element: HTMLOutputElement | null): void => {
  if (element && !element.matches(":popover-open")) {
    element.showPopover();
  }
};

const McpToasts = (): ReactElement | null => {
  const { cards, drop, mark } = useApprovalFeed();
  const inlineProject = useInlineApprovalProject();
  const modal = useTopModal(cards.length > 0);

  const shown = useMemo(
    () =>
      cards.filter(
        (card) =>
          modal !== null ||
          card.approval.projectId === null ||
          card.approval.projectId !== inlineProject
      ),
    [cards, modal, inlineProject]
  );

  if (shown.length === 0) {
    return null;
  }

  if (!modal) {
    return (
      <output className="mcp-toasts" aria-live="polite">
        <McpToastStack
          cards={shown}
          isFocus={false}
          onMark={mark}
          onDrop={drop}
        />
      </output>
    );
  }

  return createPortal(
    <output
      ref={showOnTop}
      className="mcp-toasts"
      popover="manual"
      aria-live="polite"
    >
      <McpToastStack cards={shown} isFocus onMark={mark} onDrop={drop} />
    </output>,
    modal
  );
};

export { McpToasts };

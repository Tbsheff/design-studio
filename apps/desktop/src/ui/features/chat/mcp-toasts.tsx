import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { McpApprovalOutcome } from "@design-studio/actions/_core/contracts";
import { Icon } from "@design-studio/ui";
import { appStream } from "../../platform/stream.js";
import { useInlineApprovalProject } from "./approval-spot-model.js";
import { McpApproval } from "./mcp-feed.js";
import type { McpApprovalCard } from "./use-mcp-feed.js";

import "../../styles/mcp.css";

const DONE_MS = 5000;

const useApprovalFeed = (): [
  McpApprovalCard[],
  (id: string, outcome: McpApprovalOutcome) => void,
  (id: string) => void,
] => {
  const [cards, setCards] = useState<McpApprovalCard[]>([]);
  const answered = useRef(new Map<string, McpApprovalOutcome>());
  useEffect(() => {
    const settle = (ids: Set<string>) =>
      setCards((prev) =>
        prev.map((card) => {
          if (card.outcome || ids.has(card.approval.id)) {
            return card;
          }

          const outcome =
            answered.current.get(card.approval.id) ??
            (Date.now() >= card.approval.expiresAt - 1000
              ? "timeout"
              : "closed");

          return { ...card, outcome };
        })
      );

    return appStream().onApprovals((poll) => {
      settle(new Set(poll.pending.map((item) => item.id)));
      setCards((prev) => [
        ...prev,
        ...poll.pending
          .filter((item) => !prev.some((card) => card.approval.id === item.id))
          .map((approval) => ({ approval, outcome: null })),
      ]);
    });
  }, []);

  const mark = (id: string, outcome: McpApprovalOutcome) => {
    answered.current.set(id, outcome);
    setCards((prev) =>
      prev.map((card) =>
        card.approval.id === id ? { ...card, outcome } : card
      )
    );
  };

  const drop = (id: string) =>
    setCards((prev) => prev.filter((card) => card.approval.id !== id));

  return [cards, mark, drop];
};

const topModal = (): HTMLDialogElement | null => {
  const open = document.querySelectorAll<HTMLDialogElement>("dialog:modal");

  return [...open].at(-1) ?? null;
};

const useTopModal = (watch: boolean): HTMLDialogElement | null => {
  const [modal, setModal] = useState<HTMLDialogElement | null>(null);
  useEffect(() => {
    if (!watch) {
      return setModal(null);
    }

    const check = () => setModal(topModal());
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      attributeFilter: ["open"],
      attributes: true,
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [watch]);

  return modal;
};

const typingFocus = (): boolean => {
  const active = document.activeElement;

  return (
    active instanceof HTMLElement &&
    (active.isContentEditable ||
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active instanceof HTMLSelectElement)
  );
};

const showOnTop = (element: HTMLDivElement | null): void => {
  if (element && !element.matches(":popover-open")) {
    element.showPopover();
  }
};

const Toast = ({
  card,
  focus,
  onAnswer,
  onDrop,
}: {
  card: McpApprovalCard;
  focus: boolean;
  onAnswer: (allow: boolean) => void;
  onDrop: () => void;
}) => {
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;
  useEffect(() => {
    if (!card.outcome) {
      return;
    }

    const timer = globalThis.setTimeout(() => dropRef.current(), DONE_MS);

    return () => globalThis.clearTimeout(timer);
  }, [card.outcome]);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus && !card.outcome && !typingFocus()) {
      ref.current
        ?.querySelector<HTMLButtonElement>(".permission-actions .btn.primary")
        ?.focus({ preventScroll: true });
    }
  }, []);

  return (
    <div ref={ref} className="mcp-toast" data-testid="mcp-toast">
      <div className="mcp-toast-head">
        <span>
          {card.outcome
            ? card.approval.client || "MCP client"
            : `${card.approval.client || "MCP client"} needs your answer`}
        </span>
        <span className="spacer" />
        <button
          type="button"
          className="icon-btn small"
          aria-label="Hide"
          onClick={onDrop}
        >
          <Icon name="close" size={14} />
        </button>
      </div>
      <McpApproval card={card} compact onAnswer={onAnswer} />
    </div>
  );
};

export const McpToasts = () => {
  const [cards, mark, drop] = useApprovalFeed();
  const inlineProject = useInlineApprovalProject();
  const modal = useTopModal(cards.length > 0);

  const shown = cards.filter(
    (card) =>
      modal !== null ||
      card.approval.projectId === null ||
      card.approval.projectId !== inlineProject
  );

  if (shown.length === 0) {
    return null;
  }

  const toasts = shown.map((card) => (
    <Toast
      key={card.approval.id}
      card={card}
      focus={modal !== null}
      onAnswer={(allow) => mark(card.approval.id, allow ? "allow" : "deny")}
      onDrop={() => drop(card.approval.id)}
    />
  ));

  if (!modal) {
    return (
      <div className="mcp-toasts" role="status" aria-live="polite">
        {toasts}
      </div>
    );
  }

  return createPortal(
    <div
      ref={showOnTop}
      className="mcp-toasts"
      popover="manual"
      role="status"
      aria-live="polite"
    >
      {toasts}
    </div>,
    modal
  );
};

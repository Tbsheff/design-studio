import type {
  McpApprovalOutcome,
  McpApprovalRecord,
} from "@design-studio/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

import { appStream } from "../../platform/stream.js";
import type { McpApprovalCard } from "./use-mcp-feed.js";

const EXPIRY_GRACE_MS = 1000;

type AnsweredMap = Map<string, McpApprovalOutcome>;

interface ApprovalFeed {
  readonly cards: McpApprovalCard[];
  readonly drop: (id: string) => void;
  readonly mark: (id: string, outcome: McpApprovalOutcome) => void;
}

const toClosedOutcome = (
  card: McpApprovalCard,
  answered: AnsweredMap,
  now: number
): McpApprovalOutcome => {
  const known = answered.get(card.approval.id);

  if (known) {
    return known;
  }

  if (now >= card.approval.expiresAt - EXPIRY_GRACE_MS) {
    return "timeout";
  }

  return "closed";
};

const toSettledCards = (
  cards: McpApprovalCard[],
  pendingIds: Set<string>,
  answered: AnsweredMap,
  now: number
): McpApprovalCard[] =>
  cards.map((card) => {
    if (card.outcome || pendingIds.has(card.approval.id)) {
      return card;
    }

    return { ...card, outcome: toClosedOutcome(card, answered, now) };
  });

const toAddedCards = (
  cards: McpApprovalCard[],
  pending: readonly McpApprovalRecord[]
): McpApprovalCard[] => {
  const added: McpApprovalCard[] = [];

  for (const approval of pending) {
    if (!cards.some((card) => card.approval.id === approval.id)) {
      added.push({ approval, outcome: null });
    }
  }

  return [...cards, ...added];
};

const toMarkedCards = (
  cards: McpApprovalCard[],
  id: string,
  outcome: McpApprovalOutcome
): McpApprovalCard[] =>
  cards.map((card) => {
    if (card.approval.id === id) {
      return { ...card, outcome };
    }

    return card;
  });

const useApprovalFeed = (): ApprovalFeed => {
  const [cards, setCards] = useState<McpApprovalCard[]>([]);
  const answered = useRef<AnsweredMap>(new Map());

  useEffect(
    () =>
      appStream().onApprovals((poll) => {
        const ids = new Set(poll.pending.map((item) => item.id));
        const now = Date.now();

        setCards((prev) => toSettledCards(prev, ids, answered.current, now));
        setCards((prev) => toAddedCards(prev, poll.pending));
      }),
    []
  );

  const mark = useCallback((id: string, outcome: McpApprovalOutcome): void => {
    answered.current.set(id, outcome);
    setCards((prev) => toMarkedCards(prev, id, outcome));
  }, []);

  const drop = useCallback(
    (id: string): void =>
      setCards((prev) => prev.filter((card) => card.approval.id !== id)),
    []
  );

  return { cards, drop, mark };
};

export { useApprovalFeed };

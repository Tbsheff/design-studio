import type { ReviewFinding } from "@design-studio/contracts/review";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ParentMessageBody } from "../../platform/bridge.js";
import { pick } from "./pick.js";
import { useReview } from "./use-review.js";
import type { ReviewInput, ReviewState } from "./use-review.js";

interface Input extends Omit<ReviewInput, "open"> {
  live: boolean;
  post: (body: ParentMessageBody) => void;
  shell?: { onAskAgent?: (text: string) => void };
  toolKey: string;
}

interface ReviewEntryState {
  askAgent: (finding: ReviewFinding) => void;
  close: () => void;
  count: number | null;
  isOpen: boolean;
  review: ReviewState;
  select: (finding: ReviewFinding) => void;
  selectSelector: (selector: string) => void;
  toggle: () => void;
}

const useCloseOnToolChange = (toolKey: string, close: () => void): void => {
  const last = useRef(toolKey);

  useEffect(() => {
    if (last.current === toolKey) {
      return;
    }

    last.current = toolKey;
    close();
  }, [toolKey, close]);
};

const useReviewEntry = (input: Input): ReviewEntryState => {
  const [isOpen, setIsOpen] = useState(false);
  const { post } = input;
  const ask = input.shell?.onAskAgent;

  const close = useCallback((): void => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback((): void => {
    setIsOpen((value) => !value);
  }, []);

  useCloseOnToolChange(input.toolKey, close);

  const review = useReview({
    directionId: input.directionId,
    frame: input.frame,
    lastChange: input.lastChange,
    open: isOpen && input.live,
    projectId: input.projectId,
  });

  const select = useCallback(
    (finding: ReviewFinding): void => {
      if (finding.selector) {
        post({ selector: finding.selector, type: "select-selector" });
      }
    },
    [post]
  );

  const selectSelector = useCallback(
    (selector: string): void => {
      post({ selector, type: "select-selector" });
    },
    [post]
  );

  const askAgent = useCallback(
    (finding: ReviewFinding): void => {
      ask?.(finding.ask);
    },
    [ask]
  );

  const count = pick(review.result, review.result?.findings.length ?? 0, null);

  return {
    askAgent,
    close,
    count,
    isOpen,
    review,
    select,
    selectSelector,
    toggle,
  };
};

export { useReviewEntry };

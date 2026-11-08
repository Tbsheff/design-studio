import type { ReviewFinding } from "@design-studio/contracts/review";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import type { ReactNode, RefObject, ReactElement } from "react";

import { isTypingTarget } from "../../platform/typing-target.js";
import { PREVIEW_ESCAPE_EVENT } from "../chat/use-escape-stop.js";
import { copy } from "./copy.js";
import { ReviewBody } from "./review-body.js";
import { ReviewHead } from "./review-head.js";
import { toFixBlocked } from "./review-model.js";
import type { ReviewActions } from "./review-model.js";
import { ReviewSummary } from "./review-summary.js";
import type { ReviewState } from "./use-review.js";

interface Props {
  review: ReviewState;
  children: ReactNode;
  frameLabel: string;
  live: boolean;
  running: boolean;
  canAsk: boolean;
  onSelect: (finding: ReviewFinding) => void;
  onAsk: (finding: ReviewFinding) => void;
  onClose: () => void;
}

const REGION_ROLE = "region";

const useEscapeClose = (
  panel: RefObject<HTMLDivElement | null>,
  onClose: () => void
): void => {
  const latest = useRef(onClose);

  useLayoutEffect(() => {
    latest.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const onKey = (keyboardEvent: KeyboardEvent): void => {
      if (keyboardEvent.key !== "Escape" || keyboardEvent.defaultPrevented) {
        return;
      }

      const inPanel =
        keyboardEvent.target instanceof Node &&
        panel.current?.contains(keyboardEvent.target);

      if (!inPanel && isTypingTarget(keyboardEvent.target)) {
        return;
      }

      latest.current();
    };

    const onFrameEscape = (): void => latest.current();
    globalThis.addEventListener("keydown", onKey);
    globalThis.addEventListener(PREVIEW_ESCAPE_EVENT, onFrameEscape);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey);
      globalThis.removeEventListener(PREVIEW_ESCAPE_EVENT, onFrameEscape);
    };
  }, [panel]);
};

const ReviewPanel = (props: Props): ReactElement => {
  const panel = useRef<HTMLDivElement>(null);
  useEscapeClose(panel, props.onClose);
  const { fix, run } = props.review;

  const fixFindings = useCallback(
    (list: ReviewFinding[]): void => {
      void fix(list);
    },
    [fix]
  );

  const actions: ReviewActions = useMemo(
    () => ({
      canAsk: props.canAsk,
      fixBlocked: toFixBlocked(props.live, props.running),
      fixing: props.review.fixing,
      onAsk: props.onAsk,
      onFix: fixFindings,
      onSelect: props.onSelect,
    }),
    [
      props.canAsk,
      props.live,
      props.running,
      props.review.fixing,
      props.onAsk,
      props.onSelect,
      fixFindings,
    ]
  );

  return (
    <div
      ref={panel}
      className="review-panel"
      role={REGION_ROLE}
      aria-label={copy.review}
    >
      <ReviewHead
        frameLabel={props.frameLabel}
        isBusy={props.review.busy}
        isLive={props.live}
        onRun={run}
        onClose={props.onClose}
      />
      <ReviewSummary review={props.review} />
      <ReviewBody review={props.review} isLive={props.live} actions={actions}>
        {props.children}
      </ReviewBody>
    </div>
  );
};

export { ReviewPanel };

export type { Props };

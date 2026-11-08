import type {
  ReviewFinding,
  ReviewResult,
  ReviewSeverity,
} from "@design-studio/contracts/review";
import { Icon } from "@design-studio/ui";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { RefObject, ReactElement } from "react";
import { createPortal } from "react-dom";

import type { ParentMessageBody } from "../../platform/bridge.js";
import type { CanvasFrame } from "../canvas/canvas-frames-model.js";
import { frameName } from "../canvas/index.js";
import { CritiquePanel } from "../critique/index.js";
import type { FilesChange } from "../home/use-studio-data.js";
import { copy } from "./copy.js";
import { pick } from "./pick.js";
import { useReview } from "./use-review.js";
import { WalkthroughSection } from "./walkthrough-section.js";

import "../../styles/review.css";

const MAX_BADGE = 99;

const ReviewPanel = lazy(async () => {
  const loaded = await import("./review-panel.js");

  return { default: loaded.ReviewPanel };
});

interface Props {
  projectId: string;
  directionId: string | null;
  frame: CanvasFrame;
  live: boolean;
  running?: boolean;
  lastChange: FilesChange | null;
  post: (body: ParentMessageBody) => void;
  shell?: { onAskAgent?: (text: string) => void };
  toolKey: string;
}

const labelOf = (frame: CanvasFrame): string =>
  [frame.label ?? frameName(frame), frame.path].filter(Boolean).join(" · ");

const useSlot = (
  marker: RefObject<HTMLSpanElement | null>
): HTMLElement | null => {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const found =
      marker.current
        ?.closest(".canvas")
        ?.querySelector<HTMLElement>('[data-topbar-slot="review"]') ?? null;

    if (found !== slot) {
      setSlot(found);
    }
  });

  return slot;
};

const badgeText = (count: number): string =>
  count > MAX_BADGE ? "99+" : String(count);

const entryTip = (
  open: boolean,
  count: number | null,
  stale: boolean
): string | null => {
  if (open) {
    return null;
  }

  if (count === null) {
    return "Check contrast, tap targets, alt text, tokens and clipping";
  }

  return `${count} review ${pick(count === 1, "finding", "findings")}${pick(stale, " (from an older render)", "")}`;
};

const worst = (result: ReviewResult | null): ReviewSeverity | null => {
  if (!result) {
    return null;
  }

  return (
    (["high", "medium", "low"] as const).find(
      (sev) => result.counts[sev] > 0
    ) ?? null
  );
};

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

const ReviewEntry = (props: Props): ReactElement => {
  const marker = useRef<HTMLSpanElement>(null);
  const slot = useSlot(marker);
  const [open, setOpen] = useState(false);
  const close = useRef(() => setOpen(false)).current;
  useCloseOnToolChange(props.toolKey, close);

  const review = useReview({
    directionId: props.directionId,
    frame: props.frame,
    lastChange: props.lastChange,
    open: open && props.live,
    projectId: props.projectId,
  });

  const count = review.result ? review.result.findings.length : null;
  const ask = props.shell?.onAskAgent;

  const select = (finding: ReviewFinding): void => {
    if (finding.selector) {
      props.post({ selector: finding.selector, type: "select-selector" });
    }
  };

  const { post } = props;

  const selectSelector = useCallback(
    (selector: string) => post({ selector, type: "select-selector" }),
    [post]
  );

  const sev = worst(review.result);

  const button = (
    <button
      type="button"
      className="btn ghost topbar-review review-entry"
      aria-label={pick(count === null, "Review", `Review, ${count} findings`)}
      aria-pressed={open}
      aria-expanded={open}
      disabled={!props.directionId}
      data-tip={entryTip(open, count, review.stale)}
      data-tip-align="end"
      onClick={() => setOpen((value) => !value)}
    >
      {review.busy && !open ? (
        <span className="spinner" />
      ) : (
        <Icon name="review" size={14} />
      )}
      <span>{copy.review}</span>
      {count !== null && count > 0 && (
        <span
          className={`review-badge ${review.stale ? "stale" : (sev ?? "low")}`}
        >
          {badgeText(count)}
        </span>
      )}
    </button>
  );

  return (
    <>
      <span ref={marker} hidden />
      {slot && createPortal(button, slot)}
      {open && (
        <Suspense fallback={null}>
          <ReviewPanel
            review={review}
            frameLabel={labelOf(props.frame)}
            live={props.live}
            running={props.running === true}
            canAsk={Boolean(ask)}
            onSelect={select}
            onAsk={(finding) => ask?.(finding.ask)}
            onClose={() => setOpen(false)}
          >
            <Suspense fallback={null}>
              <CritiquePanel
                directionId={props.directionId}
                frameId={props.frame.id}
                isLive={props.live}
                onSelect={selectSelector}
                projectId={props.projectId}
              />
            </Suspense>
            <WalkthroughSection
              directionId={props.directionId}
              frameId={props.frame.id}
              isLive={props.live}
              projectId={props.projectId}
            />
          </ReviewPanel>
        </Suspense>
      )}
    </>
  );
};

export { ReviewEntry };

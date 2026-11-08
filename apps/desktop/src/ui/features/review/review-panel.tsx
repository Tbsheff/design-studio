import {
  REVIEW_KIND_LABEL,
  REVIEW_KINDS,
} from "@design-studio/contracts/review";
import type {
  ReviewFinding,
  ReviewKind,
  ReviewSeverity,
} from "@design-studio/contracts/review";
import { Icon } from "@design-studio/ui";
import { useEffect, useRef } from "react";
import type { ReactNode, RefObject, ReactElement } from "react";

import { isTypingTarget } from "../../platform/typing-target.js";
import { PREVIEW_ESCAPE_EVENT } from "../chat/use-escape-stop.js";
import { copy } from "./copy.js";
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

interface Actions {
  fixBlocked: string | null;
  fixing: string[] | null;
  canAsk: boolean;
  onSelect: (finding: ReviewFinding) => void;
  onAsk: (finding: ReviewFinding) => void;
  onFix: (findings: ReviewFinding[]) => void;
}

const SEVERITY_WORD: Record<ReviewSeverity, string> = {
  high: "High",
  low: "Low",
  medium: "Medium",
};

const fixBlocked = (live: boolean, running: boolean): string | null => {
  if (!live) {
    return "Fixes work on the live design";
  }

  return running ? "A run is editing this design" : null;
};

const grouped = (findings: ReviewFinding[]): [ReviewKind, ReviewFinding[]][] =>
  REVIEW_KINDS.map(
    (kind) =>
      [kind, findings.filter((finding) => finding.kind === kind)] as [
        ReviewKind,
        ReviewFinding[],
      ]
  ).filter(([, list]) => list.length > 0);

const FindingRow = ({
  finding,
  actions,
}: {
  finding: ReviewFinding;
  actions: Actions;
}): ReactElement => {
  const busy = actions.fixing?.includes(finding.id) ?? false;

  return (
    <li className="review-row">
      <button
        type="button"
        className="review-target"
        disabled={!finding.selector}
        data-tip={finding.selector ? "Select on the canvas" : null}
        onClick={() => actions.onSelect(finding)}
      >
        <span
          className={`review-sev ${finding.severity}`}
          aria-label={SEVERITY_WORD[finding.severity]}
        />
        <span className="truncate">{finding.element}</span>
        {finding.copies &&
          finding.copies > 1 &&
          !finding.element.startsWith("in ") && (
            <span className="review-copies">
              {finding.copies}
              {copy.copies}
            </span>
          )}
        {finding.shared && <span className="review-copies">{copy.shared}</span>}
      </button>
      <p className="review-msg">{finding.message}</p>
      <div className="review-actions">
        {finding.source && (
          <code className="review-src truncate">{finding.source}</code>
        )}
        {finding.fix ? (
          <button
            type="button"
            className="btn small"
            disabled={actions.fixBlocked !== null || actions.fixing !== null}
            data-tip={
              actions.fixBlocked ??
              (finding.shared
                ? `Changes the shared file ${finding.shared}, so other pages change too. One version you can undo`
                : "Apply this fix as one version you can undo")
            }
            data-tip-align="end"
            onClick={() => actions.onFix([finding])}
          >
            {busy ? (
              <span className="spinner" />
            ) : (
              <Icon name="check" size={12} />
            )}
            <span>{finding.fix.label}</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn small"
            disabled={!actions.canAsk}
            data-tip={
              actions.canAsk
                ? "Put this finding in the chat box. You send it."
                : "Chat is not available here"
            }
            data-tip-align="end"
            onClick={() => actions.onAsk(finding)}
          >
            <Icon name="chat" size={12} />
            {copy.askAgent}
          </button>
        )}
      </div>
    </li>
  );
};

const Group = ({
  kind,
  list,
  actions,
}: {
  kind: ReviewKind;
  list: ReviewFinding[];
  actions: Actions;
}): ReactElement => {
  const fixable = list.filter((finding) => finding.fix);

  return (
    <section className="review-group" aria-label={REVIEW_KIND_LABEL[kind]}>
      <div className="review-group-head">
        <span className="review-group-name">{REVIEW_KIND_LABEL[kind]}</span>
        <span className="review-count num">{list.length}</span>
        <div className="spacer" />
        {fixable.length > 1 && (
          <button
            type="button"
            className="btn small"
            disabled={actions.fixBlocked !== null || actions.fixing !== null}
            data-tip={
              actions.fixBlocked ??
              `Apply ${fixable.length} fixes as one version`
            }
            data-tip-align="end"
            onClick={() => actions.onFix(fixable)}
          >
            {copy.fixAll}
            {fixable.length}
          </button>
        )}
      </div>
      <ul className="review-list">
        {list.map((finding) => (
          <FindingRow key={finding.id} finding={finding} actions={actions} />
        ))}
      </ul>
    </section>
  );
};

const Summary = ({ review }: { review: ReviewState }): ReactElement | null => {
  const { result } = review;

  if (!result) {
    return null;
  }

  const parts = (["high", "medium", "low"] as const)
    .filter((sev) => result.counts[sev] > 0)
    .map((sev) => `${result.counts[sev]} ${sev}`);

  return (
    <div className="review-summary">
      <span>{parts.length > 0 ? parts.join(" · ") : "No findings"}</span>
      {review.stale && <span className="badge warn">{copy.outOfDate}</span>}
      {result.notes.map((note) => (
        <span key={note} className="muted">
          {note}
        </span>
      ))}
    </div>
  );
};

const Body = ({
  review,
  live,
  actions,
  children,
}: {
  review: ReviewState;
  live: boolean;
  actions: Actions;
  children: ReactNode;
}): ReactElement => {
  const { result } = review;

  return (
    <div className="review-body">
      {!live && <div className="alert">{copy.reviewChecksTheLive}</div>}
      {review.error && <div className="alert error">{review.error}</div>}
      {review.busy && !result && (
        <div className="review-wait">
          <span className="spinner" />
          {copy.checkingTheFrame}
        </div>
      )}
      {result && result.findings.length === 0 && (
        <div className="review-wait">{copy.thisFramePassesEvery}</div>
      )}
      {result &&
        grouped(result.findings).map(([kind, list]) => (
          <Group key={kind} kind={kind} list={list} actions={actions} />
        ))}
      {children}
    </div>
  );
};

const useEscapeClose = (
  panel: RefObject<HTMLDivElement | null>,
  onClose: () => void
): void => {
  const latest = useRef(onClose);
  latest.current = onClose;
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

  const actions: Actions = {
    canAsk: props.canAsk,
    fixBlocked: fixBlocked(props.live, props.running),
    fixing: props.review.fixing,
    onAsk: props.onAsk,
    onFix: (list) => void props.review.fix(list),
    onSelect: props.onSelect,
  };

  return (
    <div
      ref={panel}
      className="review-panel"
      role="region"
      aria-label={copy.review}
    >
      <div className="review-head">
        <Icon name="check" />
        <strong>{copy.review}</strong>
        <span className="muted truncate">{props.frameLabel}</span>
        <div className="spacer" />
        <button
          type="button"
          className="icon-btn"
          aria-label={copy.runTheReview}
          data-tip={copy.runAgain}
          disabled={props.review.busy || !props.live}
          onClick={props.review.run}
        >
          {props.review.busy ? (
            <span className="spinner" />
          ) : (
            <Icon name="reload" size={14} />
          )}
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label={copy.close}
          data-tip={copy.close}
          data-tip-align="end"
          onClick={props.onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <Summary review={props.review} />
      <Body review={props.review} live={props.live} actions={actions}>
        {props.children}
      </Body>
    </div>
  );
};

export { ReviewPanel };

export type { Props };

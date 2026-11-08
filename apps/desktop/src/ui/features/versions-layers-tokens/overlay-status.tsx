import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import type { MaskState } from "./use-diff-mask.js";

const MIN_VISIBLE_PCT = 0.1;

interface OverlayStatusProps {
  readonly onRetry: () => void;
  readonly state: MaskState;
}

const toChangedText = (pct: number): string => {
  if (pct === 0) {
    return COPY.overlayNoChanges;
  }

  let shown = `${pct}`;

  if (pct < MIN_VISIBLE_PCT) {
    shown = "< 0.1";
  }

  return `${shown}${COPY.overlayPixelsChanged}`;
};

const OverlayStatus = ({ onRetry, state }: OverlayStatusProps): ReactNode => {
  if (state.status === "loading") {
    return (
      <output className="compare-status">
        <span className="spinner" aria-hidden="true" />
        {COPY.overlayFinding}
      </output>
    );
  }

  if (state.status === "error") {
    return (
      <span className="compare-status error" role="alert">
        {state.message}
        <button type="button" className="link" onClick={onRetry}>
          {COPY.overlayRetry}
        </button>
      </span>
    );
  }

  return (
    <output className="compare-status" data-testid="compare-changed">
      {toChangedText(state.mask.changedPct)}
    </output>
  );
};

export { OverlayStatus };

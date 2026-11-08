import type { ReactElement } from "react";

import { copy } from "./copy.js";

const contextWindowFor = (model: string): number =>
  /\[1m\]|-1m\b/iu.test(model) ? 1_000_000 : 200_000;

const contextShare = (tokens: number, model: string): number =>
  Math.min(1, Math.max(0, tokens / contextWindowFor(model)));

const R = 6;
const SHOW_FROM = 0.5;
const C = 2 * Math.PI * R;

const ContextMeter = ({
  tokens,
  model,
}: {
  tokens: number | null;
  model: string;
}): ReactElement | null => {
  if (tokens === null || tokens <= 0) {
    return null;
  }

  const share = contextShare(tokens, model);

  if (share < SHOW_FROM) {
    return null;
  }

  const percent = Math.round(share * 100);
  const window = contextWindowFor(model);
  const tone = share >= 0.9 ? "danger" : share >= 0.7 ? "warn" : "";

  return (
    <span
      className={`context-meter ${tone}`}
      role="meter"
      aria-label={copy.contextUsed}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      data-testid="context-meter"
      data-tokens={tokens}
      data-tip={`${tokens.toLocaleString()} of ${window.toLocaleString()} tokens in context`}
      data-tip-side="top"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r={R} className="context-track" />
        <circle
          cx="8"
          cy="8"
          r={R}
          className="context-fill"
          strokeDasharray={`${C * share} ${C}`}
          transform="rotate(-90 8 8)"
        />
      </svg>
      <span className="tabular-nums">
        {percent}
        {copy.text5}
      </span>
    </span>
  );
};

export { ContextMeter, contextShare, contextWindowFor };

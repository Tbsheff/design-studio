import type { ReactElement } from "react";

import {
  DANGER_FROM,
  PERCENT,
  WARN_FROM,
  contextShare,
  contextWindowFor,
} from "./context-share-model.js";
import { copy } from "./copy.js";

const RADIUS = 6;
const SHOW_FROM = 0.5;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const ContextMeter = ({
  tokens,
  window: reported,
  model,
}: {
  readonly tokens: number | null;
  readonly window: number | null;
  readonly model: string;
}): ReactElement | null => {
  if (tokens === null || tokens <= 0) {
    return null;
  }

  const share = contextShare(tokens, model, reported);

  if (share < SHOW_FROM) {
    return null;
  }

  const percent = Math.round(share * PERCENT);
  const window = contextWindowFor(model, reported);
  let tone: "" | "danger" | "warn" = "";

  if (share >= DANGER_FROM) {
    tone = "danger";
  }

  if (share >= WARN_FROM && share < DANGER_FROM) {
    tone = "warn";
  }

  return (
    <span
      className={`context-meter ${tone}`}
      data-testid="context-meter"
      data-tokens={tokens}
      data-tip={`${tokens.toLocaleString()} of ${window.toLocaleString()} tokens in context`}
      data-tip-side="top"
    >
      <meter
        className="sr-only"
        aria-label={copy.contextUsed}
        min={0}
        max={100}
        value={percent}
      />
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r={RADIUS} className="context-track" />
        <circle
          cx="8"
          cy="8"
          r={RADIUS}
          className="context-fill"
          strokeDasharray={`${CIRCUMFERENCE * share} ${CIRCUMFERENCE}`}
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

export { ContextMeter };

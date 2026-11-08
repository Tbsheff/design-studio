import type { RunSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { formatMs, formatUsd } from "../../domain/format.js";
import { copy } from "./copy.js";

const COST_DIGITS = 4;

const RunFootMeta = ({ summary }: { summary: RunSummary }): ReactElement => (
  <span
    className="run-foot-meta tabular-nums"
    data-tip-side="top"
    data-tip={`$${summary.costUsd.toFixed(COST_DIGITS)}`}
  >
    {formatMs(summary.durationMs)}
    {copy.text}
    {formatUsd(summary.costUsd)}
  </span>
);

export { RunFootMeta };

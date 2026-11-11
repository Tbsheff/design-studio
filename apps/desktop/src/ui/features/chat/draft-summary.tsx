import type {
  DesignSystemCheckResult,
  DesignSystemCoverage,
} from "@design-studio/contracts";
import type { ReactElement } from "react";

import { CheckStatus } from "./check-status.js";
import { copy } from "./copy.js";
import { CoverageNote } from "./coverage-note.js";
import { DraftFallbacks } from "./draft-fallbacks.js";
import { DraftGuessed } from "./draft-guessed.js";
import type { RunView } from "./run-state-model.js";

interface DraftSummaryProps {
  readonly check: DesignSystemCheckResult | null;
  readonly coverage: DesignSystemCoverage | null;
  readonly error: string | null;
  readonly run: RunView | null;
}

const DraftSummary = ({
  coverage,
  check,
  run,
  error,
}: DraftSummaryProps): ReactElement => (
  <div className="draft-main">
    {coverage && (
      <div className="draft-row">
        <CoverageNote coverage={coverage} />
      </div>
    )}
    {coverage && (
      <div className="draft-row">
        <DraftFallbacks tokens={coverage.fallbacks} />
        <DraftGuessed coverage={coverage} />
      </div>
    )}
    <CheckStatus check={check} run={run} />
    {error && (
      <p className="draft-error">
        {copy.couldNotLoadCoverage}
        {error}
      </p>
    )}
  </div>
);

export { DraftSummary };

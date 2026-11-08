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

const DraftSummary = ({
  name,
  coverage,
  check,
  run,
  error,
}: {
  name: string;
  coverage: DesignSystemCoverage | null;
  check: DesignSystemCheckResult | null;
  run: RunView | null;
  error: string | null;
}): ReactElement => (
  <div className="draft-main">
    <strong className="truncate">{name}</strong>
    {coverage && <CoverageNote coverage={coverage} />}
    {coverage && <DraftFallbacks tokens={coverage.fallbacks} />}
    {coverage && <DraftGuessed coverage={coverage} />}
    <CheckStatus check={check} run={run} />
    {error && (
      <span className="draft-fallbacks">
        {copy.couldNotLoadCoverage}
        {error}
      </span>
    )}
  </div>
);

export { DraftSummary };

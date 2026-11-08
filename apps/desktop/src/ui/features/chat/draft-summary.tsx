import type {
  DesignSystemCheckResult,
  DesignSystemCoverage,
} from "@design-studio/contracts";
import type { ReactElement } from "react";

import { IMG_ROLE } from "./aria-role-model.js";
import { CheckStatus } from "./check-status.js";
import { copy } from "./copy.js";
import { GRADE_LABELS } from "./draft-bar-model.js";
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
    {coverage && (
      <span
        className="draft-grade"
        role={IMG_ROLE}
        aria-label={`Coverage ${coverage.score} of 100, ${GRADE_LABELS[coverage.grade]}`}
      >
        {copy.coverage}
        {coverage.score}
        {copy.n100}
        {GRADE_LABELS[coverage.grade]}
      </span>
    )}
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

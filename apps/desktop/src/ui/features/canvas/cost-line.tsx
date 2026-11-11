import type { ReactElement } from "react";

import { LEVEL_PRESETS } from "../../../shared/run-levels.js";
import { copy } from "./copy.js";
import { money } from "./use-variations.js";
import type { BriefDraft } from "./use-variations.js";

const toBriefCostText = (briefCost: number): string => {
  if (briefCost > 0) {
    return ` · ${money(briefCost)}${copy.forTheBriefs}`;
  }

  return "";
};

const CostLine = ({ draft }: { readonly draft: BriefDraft }): ReactElement => (
  <p className="variation-cost" data-testid="variation-cost">
    {LEVEL_PRESETS[draft.level].label}
    {toBriefCostText(draft.result?.costUsd ?? 0)}
  </p>
);

export { CostLine };

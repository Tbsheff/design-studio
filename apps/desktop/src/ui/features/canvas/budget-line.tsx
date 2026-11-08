import type { Project } from "@design-studio/contracts";
import type { ReactElement, ReactNode } from "react";

import { LEVEL_PRESETS } from "../../../shared/run-levels.js";
import { copy } from "./copy.js";
import { budgetFor, money } from "./use-variations.js";
import type { BriefDraft } from "./use-variations.js";

interface BudgetLineProps {
  readonly project: Project;
  readonly draft: BriefDraft;
  readonly count: number;
}

const toBriefCostText = (briefCost: number): string => {
  if (briefCost > 0) {
    return ` + ${money(briefCost)} for the briefs`;
  }

  return "";
};

const BudgetLine = ({
  project,
  draft,
  count,
}: BudgetLineProps): ReactElement => {
  const budget = budgetFor(project, draft.level, count);
  const briefCost = draft.result?.costUsd ?? 0;
  const isLimited = budget.perRun !== null && budget.total !== null;
  let content: ReactNode = copy.noSpendingLimit;

  if (isLimited) {
    content = (
      <>
        {copy.upTo}
        {money(budget.perRun ?? 0)}
        {copy.perRun}{" "}
        <strong>
          {money(budget.total ?? 0)}
          {copy.total}
        </strong>
      </>
    );
  }

  return (
    <p className="variation-budget" data-testid="variation-budget">
      {LEVEL_PRESETS[draft.level].label}
      {copy.middot} {content}
      {toBriefCostText(briefCost)}
    </p>
  );
};

export { BudgetLine };

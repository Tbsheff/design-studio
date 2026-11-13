import type { DecisionWire } from "@design-studio/actions/run/decision/schema";

const DECISION_PAGE_LIMIT = 10;

const toShownOption = (decision: DecisionWire): string =>
  decision.picked ?? decision.chosen;

const isShownOption = (decision: DecisionWire, option: string): boolean =>
  toShownOption(decision) === option;

const toOtherText = (text: string): string | null => {
  const trimmed = text.trim();

  if (trimmed === "") {
    return null;
  }

  return trimmed;
};

export { DECISION_PAGE_LIMIT, isShownOption, toOtherText, toShownOption };

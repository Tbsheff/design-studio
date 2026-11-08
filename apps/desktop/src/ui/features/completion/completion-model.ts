import { copy } from "./copy.js";

const PAGE_LIMIT = 20;

const COST_DIGITS = 4;

const CAP_DIGITS = 2;

const toCostText = (costUsd: number): string =>
  `USD ${costUsd.toFixed(COST_DIGITS)}`;

const toSpentText = (spentUsd: number): string =>
  `${copy.spent} ${toCostText(spentUsd)}. ${copy.capNote}`;

const toCapText = (capUsd: number): string => capUsd.toFixed(CAP_DIGITS);

const toTimeText = (at: number): string =>
  new Date(at).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

const toCapValue = (text: string): number | null => {
  const parsed = Number(text);

  if (!Number.isFinite(parsed) || text.trim() === "") {
    return null;
  }

  return parsed;
};

interface ListInput {
  readonly cursor: null;
  readonly limit: number;
  readonly projectId: string;
}

const toListInput = (projectId: string | null): ListInput | null => {
  if (projectId === null) {
    return null;
  }

  return { cursor: null, limit: PAGE_LIMIT, projectId };
};

export {
  toCapText,
  toCapValue,
  toCostText,
  toListInput,
  toSpentText,
  toTimeText,
};

import type {
  SwapCandidate,
  SwapCandidateList,
} from "../../../shared/component-create.js";

const toHint = (candidate: SwapCandidate): string => {
  if (candidate.drop.length > 0) {
    return `drops ${candidate.drop.join(", ")}`;
  }

  if (candidate.add.length > 0) {
    return `adds ${candidate.add.join(", ")}`;
  }

  return "all props fit";
};

const toSwapLabel = (list: SwapCandidateList | null): string => {
  if (list?.from) {
    return `Swap ${list.from} for`;
  }

  return "Swap for";
};

const toDroppedText = (dropped: string[]): string => {
  if (dropped.length > 0) {
    return `, dropped ${dropped.join(", ")}`;
  }

  return "";
};

const toRowHint = (
  candidate: SwapCandidate,
  busyName: string | null
): string => {
  if (busyName === candidate.name) {
    return "Swapping…";
  }

  return toHint(candidate);
};

const toCandidateKey = (candidate: SwapCandidate): string =>
  `${candidate.file}#${candidate.name}`;

export { toCandidateKey, toDroppedText, toRowHint, toSwapLabel };

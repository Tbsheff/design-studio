import type { Candidate } from "./match-candidates-model.js";
import { PICK_SHOWN } from "./match-scan.js";

const toFilter = (text: string): string => text.trim().toLowerCase();

const toShownCandidates = (
  candidates: Candidate[],
  filter: string
): Candidate[] => {
  const found: Candidate[] = [];

  for (const candidate of candidates) {
    const isMatch =
      !filter ||
      candidate.token.toLowerCase().includes(filter) ||
      candidate.hint.toLowerCase().includes(filter);

    if (isMatch) {
      found.push(candidate);
    }
  }

  return found.slice(0, PICK_SHOWN);
};

const toPickedToken = (
  shown: Candidate[],
  filter: string,
  text: string
): string => {
  const [first] = shown;

  if (first && first.token.toLowerCase() === filter) {
    return first.token;
  }

  return text.trim();
};

export { toFilter, toPickedToken, toShownCandidates };

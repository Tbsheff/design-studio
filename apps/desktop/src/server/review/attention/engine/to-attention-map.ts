import { toAttentionCells } from "./to-attention-cells.js";
import { toFeatureGrids } from "./to-grid.js";
import { toNotes } from "./to-notes.js";
import { toPriorMap } from "./to-priors.js";
import { toSaliency } from "./to-saliency.js";
import { toClarityScore, toRankedElements } from "./to-shares.js";
import type { AttentionInput, AttentionOutcome } from "./types.js";

const MAX_COVERAGE = 0.6;

const toAttentionMap = (input: AttentionInput): AttentionOutcome => {
  const { image } = input;

  if (image.width < 1 || image.height < 1) {
    return { code: "empty_image", isOk: false };
  }

  const elements = input.elements.filter(
    (element) =>
      element.box.width > 0 &&
      element.box.height > 0 &&
      (element.box.width * element.box.height) / (image.width * image.height) <=
        MAX_COVERAGE
  );

  if (elements.length === 0) {
    return { code: "no_elements", isOk: false };
  }

  const saliency = toSaliency(toFeatureGrids(image));
  const priors = toPriorMap(saliency, elements, image);
  const grid = toAttentionCells(saliency, priors, input.scope);
  const ranked = toRankedElements(elements, grid, priors);

  const notes = toNotes({ elements, image, ranked });

  return {
    isOk: true,
    value: { clarityScore: toClarityScore(ranked), grid, notes, ranked },
  };
};

export { toAttentionMap };

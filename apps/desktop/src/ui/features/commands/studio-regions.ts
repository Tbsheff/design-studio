import { findElement } from "./deps.js";

const PROMPT_REGION = 3;
const LEFT_REGION = 2;
const STAGE_REGION = 1;

const REGIONS = [
  ".canvas .toolbar button:not(:disabled)",
  ".canvas .stage",
  ".pane-left .pane-project",
  '.prompt [data-slot="composer-input"]',
];

const regionOf = (element: Element | null): number => {
  if (!element) {
    return -1;
  }

  if (element.closest(".canvas .toolbar")) {
    return 0;
  }

  if (element.closest(".canvas .stage")) {
    return STAGE_REGION;
  }

  if (element.closest(".prompt")) {
    return PROMPT_REGION;
  }

  if (element.closest(".pane-left")) {
    return LEFT_REGION;
  }

  return -1;
};

const toStartRegion = (from: number, step: 1 | -1): number => {
  if (from >= 0) {
    return from;
  }

  if (step === 1) {
    return -1;
  }

  return 0;
};

const toRegionIndex = (start: number, step: 1 | -1, offset: number): number =>
  (((start + step * offset) % REGIONS.length) + REGIONS.length) %
  REGIONS.length;

const moveRegion = (step: 1 | -1): void => {
  const start = toStartRegion(regionOf(document.activeElement), step);

  for (let offset = 1; offset <= REGIONS.length; offset += 1) {
    const target = findElement(
      document.body,
      REGIONS[toRegionIndex(start, step, offset)] ?? ""
    );

    if (target && target.getClientRects().length > 0) {
      target.focus({ preventScroll: true });

      return;
    }
  }
};

export { moveRegion };

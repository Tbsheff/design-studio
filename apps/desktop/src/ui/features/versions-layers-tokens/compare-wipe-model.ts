const PERCENT_MAX = 100;
const STEP_SMALL = 2;
const STEP_BIG = 10;

const clampPct = (value: number): number =>
  Math.min(PERCENT_MAX, Math.max(0, value));

const toStepSize = (isBig: boolean): number => {
  if (isBig) {
    return STEP_BIG;
  }

  return STEP_SMALL;
};

const toWipeStep = (
  key: string,
  position: number,
  isBig: boolean
): number | null => {
  const size = toStepSize(isBig);

  switch (key) {
    case "ArrowDown":
    case "ArrowLeft": {
      return position - size;
    }

    case "ArrowRight":
    case "ArrowUp": {
      return position + size;
    }

    case "End": {
      return PERCENT_MAX;
    }

    case "Home": {
      return 0;
    }

    default: {
      return null;
    }
  }
};

const toBoardClass = (isDragging: boolean): string => {
  if (isDragging) {
    return "compare-board locked slider dragging";
  }

  return "compare-board locked slider ";
};

export { PERCENT_MAX, clampPct, toBoardClass, toWipeStep };

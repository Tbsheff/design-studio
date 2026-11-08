import { focalText } from "../../../shared/image.js";

const PERCENT = 100;
const STEP_FINE = 5;
const STEP_COARSE = 10;

const toKeyStep = (isShift: boolean): number => {
  if (isShift) {
    return STEP_COARSE;
  }

  return STEP_FINE;
};

const toKeyMove = (
  key: string,
  step: number
): readonly [number, number] | null => {
  switch (key) {
    case "ArrowDown": {
      return [0, step];
    }

    case "ArrowLeft": {
      return [-step, 0];
    }

    case "ArrowRight": {
      return [step, 0];
    }

    case "ArrowUp": {
      return [0, -step];
    }

    default: {
      return null;
    }
  }
};

const toFocalAt = (
  event: { readonly clientX: number; readonly clientY: number },
  rect: DOMRect
): string =>
  focalText(
    ((event.clientX - rect.left) / rect.width) * PERCENT,
    ((event.clientY - rect.top) / rect.height) * PERCENT
  );

const toPadClass = (isDisabled: boolean): string => {
  if (isDisabled) {
    return "img-focal off";
  }

  return "img-focal";
};

const toPadTabIndex = (isDisabled: boolean): number => {
  if (isDisabled) {
    return -1;
  }

  return 0;
};

export { toFocalAt, toKeyMove, toKeyStep, toPadClass, toPadTabIndex };

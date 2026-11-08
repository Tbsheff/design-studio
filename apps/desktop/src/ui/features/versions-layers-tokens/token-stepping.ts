import { formatNumber, parseNumber } from "./token-number.js";

const REM_STEP = 0.0625;
const UNIT_STEP = 1;
const SHIFT_FACTOR = 10;

const toStep = (unit: string, isShift: boolean): number => {
  let base = UNIT_STEP;

  if (unit === "rem" || unit === "em") {
    base = REM_STEP;
  }

  if (isShift) {
    return base * SHIFT_FACTOR;
  }

  return base;
};

const toStepped = (
  value: string,
  steps: number,
  isShift: boolean
): string | null => {
  const parsed = parseNumber(value);

  if (!parsed) {
    return null;
  }

  return formatNumber(
    parsed.value + steps * toStep(parsed.unit, isShift),
    parsed.unit
  );
};

export { toStepped };

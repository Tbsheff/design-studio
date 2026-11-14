interface TranslateBase {
  readonly x: string;
  readonly y: string;
  readonly z: string | null;
}

const PX_UNIT = "px";

const ZERO_PX = "0px";

const TRANSLATE_PARTS_MAX = 3;

const NO_TRANSLATE: TranslateBase = { x: ZERO_PX, y: ZERO_PX, z: null };

const toPartPx = (part: string): number | null => {
  if (part === "0") {
    return 0;
  }

  if (!part.endsWith(PX_UNIT)) {
    return null;
  }

  const amount = Number(part.slice(0, -PX_UNIT.length));

  if (!Number.isFinite(amount)) {
    return null;
  }

  return amount;
};

const CALC_OPEN = "calc(";

const toDepthStep = (char: string): number => {
  if (char === "(") {
    return 1;
  }

  if (char === ")") {
    return -1;
  }

  return 0;
};

const toTranslateParts = (text: string): readonly string[] => {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of text) {
    depth += toDepthStep(char);

    if (depth === 0 && char.trim() === "") {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  parts.push(current);

  return parts.filter((part) => part !== "");
};

const toCalcInner = (part: string): string => {
  if (part.startsWith(CALC_OPEN) && part.endsWith(")")) {
    return part.slice(CALC_OPEN.length, -1);
  }

  return part;
};

const toTranslateBase = (value: string | null): TranslateBase => {
  const text = value?.trim() ?? "";

  if (text === "" || text === "none") {
    return NO_TRANSLATE;
  }

  const parts = toTranslateParts(text);

  if (parts.length > TRANSLATE_PARTS_MAX) {
    return NO_TRANSLATE;
  }

  const [x = ZERO_PX, y = ZERO_PX, z = null] = parts;

  return { x, y, z };
};

const toRounded = (value: number): number => {
  const rounded = Math.round(value);

  if (Object.is(rounded, -0)) {
    return 0;
  }

  return rounded;
};

const toShiftedPart = (part: string, move: number): string => {
  const px = toPartPx(part);

  if (px !== null) {
    return `${String(toRounded(px + move))}${PX_UNIT}`;
  }

  if (move === 0) {
    return part;
  }

  const inner = toCalcInner(part);

  if (move < 0) {
    return `calc(${inner} - ${String(-move)}${PX_UNIT})`;
  }

  return `calc(${inner} + ${String(move)}${PX_UNIT})`;
};

const toShiftedTranslate = (
  base: TranslateBase,
  moveX: number,
  moveY: number
): string => {
  const x = toShiftedPart(base.x, moveX);
  const y = toShiftedPart(base.y, moveY);

  if (base.z === null) {
    return `${x} ${y}`;
  }

  return `${x} ${y} ${base.z}`;
};

export { toShiftedTranslate, toTranslateBase };

export type { TranslateBase };

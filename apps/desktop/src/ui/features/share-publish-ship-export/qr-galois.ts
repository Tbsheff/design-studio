import { toXor } from "./qr-bits.js";

const FIELD_SIZE = 256;
const FIELD_ORDER = 255;
const FIELD_POLYNOMIAL = 285;

interface GaloisTables {
  readonly exp: readonly number[];
  readonly log: readonly number[];
}

const toTables = (): GaloisTables => {
  const exp: number[] = Array.from({ length: FIELD_ORDER * 2 }, () => 0);
  const log: number[] = Array.from({ length: FIELD_SIZE }, () => 0);
  let value = 1;

  for (let index = 0; index < FIELD_ORDER; index += 1) {
    exp[index] = value;
    log[value] = index;
    value *= 2;

    if (value >= FIELD_SIZE) {
      value = toXor(value, FIELD_POLYNOMIAL);
    }
  }

  for (let index = FIELD_ORDER; index < FIELD_ORDER * 2; index += 1) {
    exp[index] = exp[index - FIELD_ORDER] ?? 0;
  }

  return { exp, log };
};

const TABLES = toTables();

const toProduct = (left: number, right: number): number => {
  if (left === 0 || right === 0) {
    return 0;
  }

  return TABLES.exp[(TABLES.log[left] ?? 0) + (TABLES.log[right] ?? 0)] ?? 0;
};

const toGenerator = (degree: number): readonly number[] => {
  let poly: readonly number[] = [1];

  for (let power = 0; power < degree; power += 1) {
    const root = TABLES.exp[power] ?? 0;
    const next: number[] = Array.from({ length: poly.length + 1 }, () => 0);

    for (const [index, coefficient] of poly.entries()) {
      next[index] = toXor(next[index] ?? 0, coefficient);
      next[index + 1] = toXor(
        next[index + 1] ?? 0,
        toProduct(coefficient, root)
      );
    }

    poly = next;
  }

  return poly;
};

const toRemainder = (
  data: readonly number[],
  degree: number
): readonly number[] => {
  const generator = toGenerator(degree);
  const remainder: number[] = Array.from({ length: degree }, () => 0);

  for (const byte of data) {
    const factor = toXor(byte, remainder.shift() ?? 0);
    remainder.push(0);

    for (let index = 0; index < degree; index += 1) {
      remainder[index] = toXor(
        remainder[index] ?? 0,
        toProduct(generator[index + 1] ?? 0, factor)
      );
    }
  }

  return remainder;
};

export { toRemainder };

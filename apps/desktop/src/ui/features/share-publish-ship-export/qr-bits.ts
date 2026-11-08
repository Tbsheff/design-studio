const BASE = 2;
const BYTE_BITS = 8;

const toBit = (value: number, index: number): number =>
  Math.floor(value / BASE ** index) % BASE;

const toXor = (left: number, right: number): number => {
  let result = 0;
  let place = 1;
  let rest = [left, right];

  while (rest.some((part) => part > 0)) {
    const [low = 0, high = 0] = rest.map((part) => part % BASE);

    if (low !== high) {
      result += place;
    }

    rest = rest.map((part) => Math.floor(part / BASE));
    place *= BASE;
  }

  return result;
};

const toBits = (value: number, length: number): readonly number[] =>
  Array.from({ length }, (_unused, index) => toBit(value, length - 1 - index));

const toByte = (bits: readonly number[]): number =>
  bits.reduce((sum, bit) => sum * BASE + bit, 0);

const toDivided = (
  value: number,
  generator: number,
  degree: number
): number => {
  let remainder = value;

  for (let step = 0; step < degree; step += 1) {
    remainder = toXor(
      remainder * BASE,
      Math.floor(remainder / BASE ** (degree - 1)) * generator
    );
  }

  return remainder;
};

export { BASE, BYTE_BITS, toBit, toBits, toByte, toDivided, toXor };
